import { AcademicDocument } from '../models/academic-document.model.js';
import { User } from '../models/user.model.js';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';
import { deleteCloudinaryImage,uploadTimetableAsset,verifyCloudinaryFileDelivery } from '../services/cloudinary.service.js';

const timetableSlots=new Set(['classTable','mst1','mst2','mst3','endSemester']);
const safeFolder=(item,slot)=>`${item.programme}/semester-${item.semester}/${item.academicYear||'current'}/${slot}`;

function verifySignature(file){
  const b=file.buffer;
  if(file.mimetype==='application/pdf')return b.subarray(0,5).toString()==='%PDF-';
  if(file.mimetype==='image/png')return b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(file.mimetype==='image/jpeg')return b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;
  if(file.mimetype==='image/webp')return b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP';
  return false;
}

async function validateEditors(editorIds=[]){
  if(!editorIds.length)return;
  const count=await User.countDocuments({_id:{$in:editorIds},role:ROLES.FACULTY,status:'active'});
  if(count!==new Set(editorIds).size)throw new AppError(400,'Every timetable editor must be an active faculty account');
}

function publicTimetableFiles(files={}){
  return Object.fromEntries([...timetableSlots].map((slot)=>[slot,files[slot]?.status==='published'?files[slot]:null]));
}

export async function listPublicAcademicDocuments(request,response){
  const filter=request.query.type==='timetable'?{resourceType:'timetable'}:{status:'published'};
  if(request.query.type)filter.resourceType=request.query.type;
  const records=await AcademicDocument.find(filter).sort({isCurrent:-1,academicYear:-1,programme:1,semester:1}).select('-createdBy -updatedBy -editors').lean();
  const items=records.map((item)=>item.resourceType==='timetable'?{...item,timetableFiles:publicTimetableFiles(item.timetableFiles)}:item)
    .filter((item)=>item.resourceType!=='timetable'||Object.values(item.timetableFiles).some(Boolean));
  response.set('Cache-Control','no-store');response.json({success:true,data:items});
}

export async function listManagedAcademicDocuments(request,response){
  const filter=request.user.role===ROLES.ADMIN?{}:{editors:request.user.id,resourceType:'timetable'};
  if(request.query.type)filter.resourceType=request.query.type;
  const items=await AcademicDocument.find(filter).sort({updatedAt:-1}).populate('editors','facultyId email status');
  response.json({success:true,data:items});
}

export async function createAcademicDocument(request,response){
  await validateEditors(request.body.editors);
  if(request.body.resourceType==='academic-calendar'&&request.body.isCurrent)await AcademicDocument.updateMany({resourceType:'academic-calendar',isCurrent:true},{$set:{isCurrent:false}});
  const item=await AcademicDocument.create({...request.body,createdBy:request.user.id,updatedBy:request.user.id,publishedAt:request.body.status==='published'?new Date():undefined});
  await recordAudit(request,'ACADEMIC_DOCUMENT_CREATED','AcademicDocument',item.id,{resourceType:item.resourceType});response.status(201).json({success:true,data:item});
}

export async function updateAcademicDocument(request,response){
  if(request.body.editors)await validateEditors(request.body.editors);
  if(request.body.resourceType==='academic-calendar'&&request.body.isCurrent)await AcademicDocument.updateMany({_id:{$ne:request.params.id},resourceType:'academic-calendar',isCurrent:true},{$set:{isCurrent:false}});
  const item=await AcademicDocument.findById(request.params.id);if(!item)throw new AppError(404,'Academic document not found');
  Object.assign(item,request.body,{updatedBy:request.user.id});if(request.body.status==='published')item.publishedAt=new Date();await item.save();
  await recordAudit(request,'ACADEMIC_DOCUMENT_UPDATED','AcademicDocument',item.id,{resourceType:item.resourceType});response.json({success:true,data:item});
}

export async function uploadTimetable(request,response){
  const slot=request.params.slot;if(!timetableSlots.has(slot))throw new AppError(400,'Unknown timetable category');
  const item=await AcademicDocument.findById(request.params.id);if(!item||item.resourceType!=='timetable')throw new AppError(404,'Timetable record not found');
  const permitted=request.user.role===ROLES.ADMIN||item.editors.some((id)=>id.equals(request.user.id));
  if(!permitted)throw new AppError(403,'You are not assigned to upload this timetable');
  if(!request.file)throw new AppError(400,'Choose a timetable PDF or image');
  if(!verifySignature(request.file))throw new AppError(415,'The uploaded file content does not match its declared type');
  const result=await uploadTimetableAsset(request.file,safeFolder(item,slot));
  const previous=item.timetableFiles[slot]?.asset?.publicId;const target=item.timetableFiles[slot];
  target.asset={provider:'cloudinary',publicId:result.public_id,resourceType:result.resource_type,url:result.secure_url,name:request.file.originalname,mimeType:request.file.mimetype,size:result.bytes,width:result.width,height:result.height,format:result.format};
  target.status=request.user.role===ROLES.ADMIN?'draft':'submitted';target.uploadedBy=request.user.id;target.submittedAt=request.user.role===ROLES.FACULTY?new Date():undefined;target.approvedBy=undefined;target.publishedAt=undefined;
  item.updatedBy=request.user.id;await item.save();if(previous)await deleteCloudinaryImage(previous).catch(()=>{});
  await recordAudit(request,'TIMETABLE_UPLOADED','AcademicDocument',item.id,{slot,status:target.status});response.json({success:true,data:item});
}

export async function publishTimetable(request,response){
  const slot=request.params.slot;if(!timetableSlots.has(slot))throw new AppError(400,'Unknown timetable category');
  const item=await AcademicDocument.findById(request.params.id);if(!item||item.resourceType!=='timetable')throw new AppError(404,'Timetable record not found');
  const target=item.timetableFiles[slot];if(!target?.asset)throw new AppError(400,'Upload this timetable before publishing');
  await verifyCloudinaryFileDelivery(target.asset);target.status='published';target.approvedBy=request.user.id;target.publishedAt=new Date();item.updatedBy=request.user.id;await item.save();
  await recordAudit(request,'TIMETABLE_PUBLISHED','AcademicDocument',item.id,{slot});response.json({success:true,data:item});
}

export async function deleteTimetableFile(request,response){
  const slot=request.params.slot;if(!timetableSlots.has(slot))throw new AppError(400,'Unknown timetable category');
  const item=await AcademicDocument.findById(request.params.id);if(!item||item.resourceType!=='timetable')throw new AppError(404,'Timetable record not found');
  const target=item.timetableFiles[slot];if(!target?.asset)throw new AppError(404,'No timetable file is stored in this category');
  const publicId=target.asset.publicId;
  target.asset=null;target.status='missing';target.uploadedBy=undefined;target.approvedBy=undefined;target.submittedAt=undefined;target.publishedAt=undefined;
  item.updatedBy=request.user.id;await item.save();
  await recordAudit(request,'TIMETABLE_FILE_DELETED','AcademicDocument',item.id,{slot});
  await deleteCloudinaryImage(publicId).catch(()=>{});
  response.status(204).end();
}

export async function deleteAcademicDocument(request,response){
  const item=await AcademicDocument.findByIdAndDelete(request.params.id);if(!item)throw new AppError(404,'Academic document not found');
  if(item.resourceType==='timetable')await Promise.all([...timetableSlots].map((slot)=>deleteCloudinaryImage(item.timetableFiles[slot]?.asset?.publicId).catch(()=>{})));
  await recordAudit(request,'ACADEMIC_DOCUMENT_DELETED','AcademicDocument',item.id,{resourceType:item.resourceType});response.status(204).end();
}
