import { Readable } from 'node:stream';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';
import { uploadCloudinaryImage } from '../services/cloudinary.service.js';
import { PERMISSIONS,ROLES } from '../constants/roles.js';

const bucket=()=>new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'uploads'});

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
  if(!request.file)throw new AppError(400,'Choose a notice PDF');
  if(request.file.buffer.subarray(0,5).toString()!=='%PDF-')throw new AppError(415,'The uploaded file is not a valid PDF');
  const stream=bucket().openUploadStream(request.file.originalname,{contentType:'application/pdf',metadata:{uploadedBy:request.user.id,purpose:'notice'}});
  await new Promise((resolve,reject)=>{Readable.from(request.file.buffer).pipe(stream).on('finish',resolve).on('error',reject)});
  const data={provider:'gridfs',id:String(stream.id),key:String(stream.id),url:`${env.API_PUBLIC_URL}/files/${stream.id}`,name:request.file.originalname,mimeType:'application/pdf',size:request.file.size};
  await recordAudit(request,'NOTICE_PDF_UPLOADED','GridFS',stream.id,{name:data.name,size:data.size});
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

export async function downloadFile(request,response){
  if(!mongoose.isValidObjectId(request.params.id))throw new AppError(404,'File not found');
  const id=new mongoose.Types.ObjectId(request.params.id);const files=await bucket().find({_id:id}).limit(1).toArray();const file=files[0];
  if(!file)throw new AppError(404,'File not found');
  response.set({ 'Content-Type':file.contentType||'application/octet-stream','Content-Length':file.length,'Cache-Control':'public, max-age=3600','Content-Disposition':`${/^(application\/pdf|image\/)/.test(file.contentType||'')?'inline':'attachment'}; filename="${file.filename.replace(/["\r\n]/g,'_')}"` });
  bucket().openDownloadStream(id).on('error',(error)=>response.destroy(error)).pipe(response);
}
