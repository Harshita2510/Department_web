import { AcademicSubject } from '../models/academic-subject.model.js';
import { User } from '../models/user.model.js';
import { ROLES } from '../constants/roles.js';
import { deleteCloudinaryImage,uploadSyllabusAsset,verifyCloudinaryFileDelivery } from '../services/cloudinary.service.js';
import { recordAudit } from '../services/audit.service.js';
import { AppError } from '../utils/app-error.js';

const safeFolder=(subject)=>`${subject.programme}/semester-${subject.semester}/${subject.normalizedName.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`;

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
  if(count!==new Set(editorIds).size)throw new AppError(400,'Every assigned editor must be an active faculty account');
}

export async function listPublicSubjects(request,response){
  const filter={active:true};
  if(request.query.programme)filter.programme=request.query.programme;
  if(request.query.semester)filter.semester=Number(request.query.semester);
  const records=await AcademicSubject.find(filter).sort({programme:1,semester:1,sortOrder:1,name:1}).select('programme semester subjectCode name sortOrder syllabus syllabusStatus publishedAt').lean();
  const items=records.map((item)=>({...item,syllabus:item.syllabusStatus==='published'?item.syllabus:null}));
  response.set('Cache-Control','no-store');
  response.json({success:true,data:items});
}

export async function listManagedSubjects(request,response){
  const filter=request.user.role===ROLES.ADMIN?{}:{editors:request.user.id,active:true};
  const items=await AcademicSubject.find(filter).sort({programme:1,semester:1,sortOrder:1,name:1}).populate('editors','facultyId email status');
  response.json({success:true,data:items});
}

export async function createSubject(request,response){
  await validateEditors(request.body.editors);
  const item=await AcademicSubject.create({...request.body,createdBy:request.user.id,updatedBy:request.user.id});
  await recordAudit(request,'ACADEMIC_SUBJECT_CREATED','AcademicSubject',item.id,{programme:item.programme,semester:item.semester,name:item.name});
  response.status(201).json({success:true,data:item});
}

export async function updateSubject(request,response){
  if(request.body.editors)await validateEditors(request.body.editors);
  const item=await AcademicSubject.findById(request.params.id);if(!item)throw new AppError(404,'Subject not found');
  Object.assign(item,request.body,{updatedBy:request.user.id});await item.save();
  await recordAudit(request,'ACADEMIC_SUBJECT_UPDATED','AcademicSubject',item.id,{name:item.name});
  response.json({success:true,data:item});
}

export async function uploadSubjectSyllabus(request,response){
  const item=await AcademicSubject.findById(request.params.id);if(!item||!item.active)throw new AppError(404,'Subject not found');
  const permitted=request.user.role===ROLES.ADMIN||item.editors.some((id)=>id.equals(request.user.id));
  if(!permitted)throw new AppError(403,'You are not assigned to upload this subject syllabus');
  if(!request.file)throw new AppError(400,'Choose a syllabus PDF or image');
  if(!verifySignature(request.file))throw new AppError(415,'The uploaded file content does not match its declared type');
  const result=await uploadSyllabusAsset(request.file,safeFolder(item));
  const previous=item.syllabus?.publicId;
  item.syllabus={provider:'cloudinary',publicId:result.public_id,resourceType:result.resource_type,url:result.secure_url,name:request.file.originalname,mimeType:request.file.mimetype,size:result.bytes,width:result.width,height:result.height,format:result.format};
  item.syllabusStatus=request.user.role===ROLES.ADMIN?'draft':'submitted';item.uploadedBy=request.user.id;item.updatedBy=request.user.id;
  item.submittedAt=request.user.role===ROLES.FACULTY?new Date():undefined;item.approvedBy=undefined;item.publishedAt=undefined;
  await item.save();
  if(previous)await deleteCloudinaryImage(previous).catch(()=>{});
  await recordAudit(request,'SUBJECT_SYLLABUS_UPLOADED','AcademicSubject',item.id,{name:item.name,mimeType:request.file.mimetype,status:item.syllabusStatus});
  response.json({success:true,data:item});
}

export async function publishSubjectSyllabus(request,response){
  const item=await AcademicSubject.findById(request.params.id);if(!item)throw new AppError(404,'Subject not found');
  if(!item.syllabus)throw new AppError(400,'Upload a syllabus before publishing');
  await verifyCloudinaryFileDelivery(item.syllabus);
  item.syllabusStatus='published';item.approvedBy=request.user.id;item.updatedBy=request.user.id;item.publishedAt=new Date();await item.save();
  await recordAudit(request,'SUBJECT_SYLLABUS_PUBLISHED','AcademicSubject',item.id,{name:item.name});
  response.json({success:true,data:item});
}

export async function requestSyllabusChanges(request,response){
  const item=await AcademicSubject.findByIdAndUpdate(request.params.id,{$set:{syllabusStatus:'changes_requested',updatedBy:request.user.id}},{new:true});
  if(!item)throw new AppError(404,'Subject not found');
  await recordAudit(request,'SUBJECT_SYLLABUS_CHANGES_REQUESTED','AcademicSubject',item.id,{name:item.name});
  response.json({success:true,data:item});
}

export async function deleteSubject(request,response){
  const item=await AcademicSubject.findByIdAndDelete(request.params.id);if(!item)throw new AppError(404,'Subject not found');
  if(item.syllabus?.publicId)await deleteCloudinaryImage(item.syllabus.publicId).catch(()=>{});
  await recordAudit(request,'ACADEMIC_SUBJECT_DELETED','AcademicSubject',item.id,{name:item.name});response.status(204).end();
}
