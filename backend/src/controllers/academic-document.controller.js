import { AcademicDocument } from '../models/academic-document.model.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';

export async function listPublicAcademicDocuments(request,response){
  const filter={status:'published'};if(request.query.type)filter.resourceType=request.query.type;
  const items=await AcademicDocument.find(filter).sort({isCurrent:-1,academicYear:-1,programme:1,semester:1}).select('-createdBy -updatedBy');
  response.json({success:true,data:items});
}
export async function listAdminAcademicDocuments(request,response){
  const filter=request.query.type?{resourceType:request.query.type}:{};
  const items=await AcademicDocument.find(filter).sort({updatedAt:-1});response.json({success:true,data:items});
}
export async function createAcademicDocument(request,response){
  if(request.body.resourceType==='academic-calendar'&&request.body.isCurrent)await AcademicDocument.updateMany({resourceType:'academic-calendar',isCurrent:true},{$set:{isCurrent:false}});
  const item=await AcademicDocument.create({...request.body,createdBy:request.user.id,updatedBy:request.user.id,publishedAt:request.body.status==='published'?new Date():undefined});
  await recordAudit(request,'ACADEMIC_DOCUMENT_CREATED','AcademicDocument',item.id,{resourceType:item.resourceType});response.status(201).json({success:true,data:item});
}
export async function updateAcademicDocument(request,response){
  if(request.body.resourceType==='academic-calendar'&&request.body.isCurrent)await AcademicDocument.updateMany({_id:{$ne:request.params.id},resourceType:'academic-calendar',isCurrent:true},{$set:{isCurrent:false}});
  const item=await AcademicDocument.findById(request.params.id);if(!item)throw new AppError(404,'Academic document not found');
  Object.assign(item,request.body,{updatedBy:request.user.id});if(request.body.status==='published')item.publishedAt=new Date();await item.save();
  await recordAudit(request,'ACADEMIC_DOCUMENT_UPDATED','AcademicDocument',item.id,{resourceType:item.resourceType});response.json({success:true,data:item});
}
export async function deleteAcademicDocument(request,response){
  const item=await AcademicDocument.findByIdAndDelete(request.params.id);if(!item)throw new AppError(404,'Academic document not found');
  await recordAudit(request,'ACADEMIC_DOCUMENT_DELETED','AcademicDocument',item.id,{resourceType:item.resourceType});response.status(204).end();
}
