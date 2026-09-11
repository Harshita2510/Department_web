import { Content } from '../models/content.model.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';

export async function listPublicContent(request,response){
  const filter={status:'published'}; if(request.query.type)filter.type=request.query.type;
  const items=await Content.find(filter).sort({featured:-1,displayDate:-1,createdAt:-1}).limit(100).select('-createdBy -updatedBy');
  response.json({success:true,data:items});
}
export async function listAdminContent(request,response){
  const page=Math.max(1,Number(request.query.page)||1);const limit=Math.min(100,Math.max(1,Number(request.query.limit)||20));const filter=request.query.type?{type:request.query.type}:{};
  const [items,total]=await Promise.all([Content.find(filter).sort({updatedAt:-1}).skip((page-1)*limit).limit(limit),Content.countDocuments(filter)]);
  response.json({success:true,data:items,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});
}
export async function createContent(request,response){
  const item=await Content.create({...request.body,createdBy:request.user.id,updatedBy:request.user.id,publishedAt:request.body.status==='published'?new Date():undefined});
  await recordAudit(request,'CONTENT_CREATED','Content',item.id,{type:item.type,status:item.status});response.status(201).json({success:true,data:item});
}
export async function updateContent(request,response){
  const updates={...request.body,updatedBy:request.user.id};if(request.body.status==='published')updates.publishedAt=new Date();
  const item=await Content.findByIdAndUpdate(request.params.id,updates,{new:true,runValidators:true});if(!item)throw new AppError(404,'Content not found');
  await recordAudit(request,'CONTENT_UPDATED','Content',item.id,{type:item.type,status:item.status});response.json({success:true,data:item});
}
export async function deleteContent(request,response){
  const item=await Content.findByIdAndDelete(request.params.id);if(!item)throw new AppError(404,'Content not found');
  await recordAudit(request,'CONTENT_DELETED','Content',item.id,{type:item.type});response.status(204).end();
}
