import { Content } from '../models/content.model.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';
import { PERMISSIONS,ROLES } from '../constants/roles.js';

const canUploadNotices=(user)=>user.role===ROLES.ADMIN||user.permissions?.includes(PERMISSIONS.NOTICE_UPLOAD);
function ensurePublishableNotice(item){
  if(item.type!=='notice'||item.status!=='published')return;
  if(!item.summary?.trim()||!item.body?.trim())throw new AppError(400,'Published notices require short and long descriptions');
  if(item.asset?.mimeType!=='application/pdf')throw new AppError(400,'Upload a notice PDF before publishing');
}

export async function listPublicContent(request,response){
  const filter={status:'published'}; if(request.query.type)filter.type=request.query.type;
  const items=await Content.find(filter).sort({featured:-1,displayDate:-1,createdAt:-1}).limit(100).select('-createdBy -updatedBy');
  response.set('Cache-Control','no-store');response.json({success:true,data:items});
}
export async function listAdminContent(request,response){
  if(request.user.role===ROLES.FACULTY&&!canUploadNotices(request.user))throw new AppError(403,'Notice upload permission is required');
  const page=Math.max(1,Number(request.query.page)||1);const limit=Math.min(100,Math.max(1,Number(request.query.limit)||20));const filter=request.user.role===ROLES.ADMIN?{}:{type:'notice',createdBy:request.user.id};
  if(request.query.type)filter.type=request.query.type;
  const [items,total]=await Promise.all([Content.find(filter).sort({updatedAt:-1}).skip((page-1)*limit).limit(limit),Content.countDocuments(filter)]);
  response.json({success:true,data:items,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});
}
export async function createContent(request,response){
  if(request.user.role===ROLES.FACULTY&&(!canUploadNotices(request.user)||request.body.type!=='notice'))throw new AppError(403,'You can only create notices when notice access is assigned');
  const input={...request.body};if(request.user.role===ROLES.FACULTY)input.status='draft';
  ensurePublishableNotice(input);
  const item=await Content.create({...input,createdBy:request.user.id,updatedBy:request.user.id,publishedAt:input.status==='published'?new Date():undefined});
  await recordAudit(request,'CONTENT_CREATED','Content',item.id,{type:item.type,status:item.status});response.status(201).json({success:true,data:item});
}
export async function updateContent(request,response){
  const item=await Content.findById(request.params.id);if(!item)throw new AppError(404,'Content not found');
  if(request.user.role===ROLES.FACULTY&&(!canUploadNotices(request.user)||item.type!=='notice'||!item.createdBy.equals(request.user.id)))throw new AppError(403,'You can only edit notices created by your account');
  const updates={...request.body};if(request.user.role===ROLES.FACULTY){delete updates.type;updates.status='draft'}
  Object.assign(item,updates,{updatedBy:request.user.id});ensurePublishableNotice(item);if(updates.status==='published')item.publishedAt=new Date();await item.save();
  await recordAudit(request,'CONTENT_UPDATED','Content',item.id,{type:item.type,status:item.status});response.json({success:true,data:item});
}
export async function deleteContent(request,response){
  const item=await Content.findById(request.params.id);if(!item)throw new AppError(404,'Content not found');
  if(request.user.role===ROLES.FACULTY&&(!canUploadNotices(request.user)||item.type!=='notice'||!item.createdBy.equals(request.user.id)||item.status==='published'))throw new AppError(403,'You can only delete your own unpublished notices');
  await item.deleteOne();
  await recordAudit(request,'CONTENT_DELETED','Content',item.id,{type:item.type});response.status(204).end();
}
