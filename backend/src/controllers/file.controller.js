import { Readable } from 'node:stream';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';
import { deleteCloudinaryImage,uploadCloudinaryImage } from '../services/cloudinary.service.js';
import { PERMISSIONS,ROLES } from '../constants/roles.js';
import { Content } from '../models/content.model.js';
import { AcademicDocument } from '../models/academic-document.model.js';
import { FacultyProfile } from '../models/faculty-profile.model.js';
import { cloudinaryFacultyPhotoPublicId } from '../utils/cloudinary-faculty-photo.js';

const bucket=()=>new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'uploads'});

export function fileAccessDecision({publishedContent,publishedAcademicDocument,user,uploaderId}){
  const isPublic=Boolean(publishedContent||publishedAcademicDocument);
  const hasPrivateAccess=Boolean(user&&(user.role===ROLES.ADMIN||String(uploaderId||'')===String(user.id)));
  return {allowed:isPublic||hasPrivateAccess,isPublic};
}

export async function uploadFile(request,response){
  if(!request.file)throw new AppError(400,'Choose a file to upload');
  const stream=bucket().openUploadStream(request.file.originalname,{contentType:request.file.mimetype,metadata:{uploadedBy:request.user.id}});
  await new Promise((resolve,reject)=>{Readable.from(request.file.buffer).pipe(stream).on('finish',resolve).on('error',reject)});
  const data={provider:'gridfs',id:String(stream.id),key:String(stream.id),url:`${env.API_PUBLIC_URL}/files/${stream.id}`,name:request.file.originalname,mimeType:request.file.mimetype,size:request.file.size};
  await recordAudit(request,'FILE_UPLOADED','GridFS',stream.id,{name:data.name,mimeType:data.mimeType,size:data.size});
  response.status(201).json({success:true,data});
}

export async function uploadNoticeFile(request,response){
  const permitted=request.user.role===ROLES.ADMIN||request.user.permissions?.includes(PERMISSIONS.NOTICE_UPLOAD);
  if(!permitted)throw new AppError(403,'Notice upload permission is required');
  if(!request.file)throw new AppError(400,'Choose a notice attachment');
  const stream=bucket().openUploadStream(request.file.originalname,{contentType:request.file.mimetype,metadata:{uploadedBy:request.user.id,purpose:'notice'}});
  await new Promise((resolve,reject)=>{Readable.from(request.file.buffer).pipe(stream).on('finish',resolve).on('error',reject)});
  const data={provider:'gridfs',id:String(stream.id),key:String(stream.id),url:`${env.API_PUBLIC_URL}/files/${stream.id}`,name:request.file.originalname,mimeType:request.file.mimetype,size:request.file.size};
  await recordAudit(request,'NOTICE_ATTACHMENT_UPLOADED','GridFS',stream.id,{name:data.name,mimeType:data.mimeType,size:data.size});
  response.status(201).json({success:true,data});
}

export async function uploadPublicImage(request,response){
  if(!request.file)throw new AppError(400,'Choose an image to upload');
  const result=await uploadCloudinaryImage(request.file,request.body.folder);
  const data={
    provider:'cloudinary',key:result.public_id,publicId:result.public_id,
    url:result.secure_url,originalUrl:result.secure_url,name:request.file.originalname,
    mimeType:`image/${result.format}`,size:result.bytes,width:result.width,height:result.height,format:result.format
  };
  await recordAudit(request,'IMAGE_UPLOADED','Cloudinary',result.public_id,{folder:request.body.folder||'media',name:data.name,size:data.size});
  response.status(201).json({success:true,data});
}

export async function uploadFacultyPhoto(request,response){
  if(!request.file)throw new AppError(400,'Choose a faculty photograph');
  const result=await uploadCloudinaryImage(request.file,'faculty');
  const data={
    provider:'cloudinary',key:result.public_id,publicId:result.public_id,
    url:result.secure_url,originalUrl:result.secure_url,name:request.file.originalname,
    mimeType:`image/${result.format}`,size:result.bytes,width:result.width,height:result.height,format:result.format
  };
  let previousId;
  let approvedId;
  try{
    const profile=await FacultyProfile.findOne({user:request.user.id});
    if(!profile)throw new AppError(404,'Faculty profile not found');
    previousId=profile.draft?.photoPublicId||cloudinaryFacultyPhotoPublicId(profile.draft?.photoUrl,env.CLOUDINARY_CLOUD_NAME);
    approvedId=profile.approvedSnapshot?.photoPublicId||cloudinaryFacultyPhotoPublicId(profile.approvedSnapshot?.photoUrl,env.CLOUDINARY_CLOUD_NAME);
    profile.set('draft.photoUrl',result.secure_url);
    profile.set('draft.photoPublicId',result.public_id);
    profile.reviewStatus='draft';
    profile.submittedAt=undefined;
    await profile.save();
  }catch(error){
    await deleteCloudinaryImage(result.public_id).catch(()=>{});
    throw error;
  }
  if(previousId&&previousId!==result.public_id&&previousId!==approvedId){
    await deleteCloudinaryImage(previousId).catch((error)=>console.error('Replaced faculty photo cleanup failed',{publicId:previousId,message:error.message}));
  }
  await recordAudit(request,'FACULTY_PHOTO_UPLOADED','Cloudinary',result.public_id,{name:data.name,size:data.size,replaced:previousId||null});
  response.status(201).json({success:true,data});
}

export async function deleteOwnFacultyPhoto(request,response){
  const profile=await FacultyProfile.findOne({user:request.user.id});
  if(!profile)throw new AppError(404,'Faculty profile not found');
  const publicId=profile.draft?.photoPublicId||cloudinaryFacultyPhotoPublicId(profile.draft?.photoUrl,env.CLOUDINARY_CLOUD_NAME);
  const approvedId=profile.approvedSnapshot?.photoPublicId||cloudinaryFacultyPhotoPublicId(profile.approvedSnapshot?.photoUrl,env.CLOUDINARY_CLOUD_NAME);
  const isPublishedAsset=publicId&&publicId===approvedId;
  profile.set('draft.photoUrl','');
  profile.set('draft.photoPublicId','');
  profile.reviewStatus='draft';
  profile.submittedAt=undefined;
  await profile.save();
  if(publicId&&!isPublishedAsset)await deleteCloudinaryImage(publicId);
  await recordAudit(request,'FACULTY_PHOTO_REMOVED','FacultyProfile',profile.id,{publicId:publicId||null,retainedForPublishedProfile:Boolean(isPublishedAsset)});
  response.status(204).end();
}

export async function downloadFile(request,response){
  if(!mongoose.isValidObjectId(request.params.id))throw new AppError(404,'File not found');
  const id=new mongoose.Types.ObjectId(request.params.id);const files=await bucket().find({_id:id}).limit(1).toArray();const file=files[0];
  if(!file)throw new AppError(404,'File not found');
  const fileId=String(id);
  const [publishedContent,publishedAcademicDocument]=await Promise.all([
    Content.exists({$or:[{status:'published','asset.key':fileId},{'publishedSnapshot.asset.key':fileId}]}),
    AcademicDocument.exists({status:'published',documentUrl:`${env.API_PUBLIC_URL.replace(/\/$/,'')}/files/${fileId}`})
  ]);
  const access=fileAccessDecision({publishedContent,publishedAcademicDocument,user:request.user,uploaderId:file.metadata?.uploadedBy});
  if(!access.allowed)throw new AppError(404,'File not found');
  // Permit only the configured website to embed an authorized PDF/image preview.
  response.removeHeader('X-Frame-Options');
  response.set({
    'Content-Type':file.contentType||'application/octet-stream',
    'Content-Length':file.length,
    'Cache-Control':access.isPublic?'public, max-age=3600':'private, no-store',
    'Vary':'Cookie',
    'Content-Security-Policy':`default-src 'none'; frame-ancestors 'self' ${env.FRONTEND_ORIGIN}`,
    'Content-Disposition':`${/^(application\/pdf|image\/)/.test(file.contentType||'')?'inline':'attachment'}; filename="${file.filename.replace(/["\r\n]/g,'_')}"`
  });
  bucket().openDownloadStream(id).on('error',(error)=>response.destroy(error)).pipe(response);
}
