import { Content } from '../models/content.model.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';
import { PERMISSIONS,ROLES } from '../constants/roles.js';
import { setPublicCache } from '../utils/public-cache.js';
import { deleteGridFsFile,noticeFileDeliveryUrl,noticeFileIdPattern,resolveNoticeFile } from '../services/notice-file.service.js';

const canUploadNotices=(user)=>user.role===ROLES.ADMIN||user.permissions?.includes(PERMISSIONS.NOTICE_UPLOAD);
const gridFsKeys=(item)=>new Set([item.asset,item.publishedSnapshot?.asset].filter((asset)=>asset?.provider==='gridfs'&&noticeFileIdPattern.test(String(asset.key||''))).map((asset)=>String(asset.key)));
async function deleteUnreferencedFiles(keys){
  for(const key of keys){
    const referenced=await Content.exists({$or:[{'asset.key':key},{'publishedSnapshot.asset.key':key}]});
    if(!referenced)await deleteGridFsFile(key);
  }
}
async function ensurePublishableNotice(item,user){
  if(item.type!=='notice'||item.status!=='published')return;
  item.asset=await resolveNoticeFile(item.asset?.key,user);
}

function applyNoticeDescriptionFallback(item){
  if(item.type!=='notice')return;
  const fallback=String(item.title||'Department notice').trim();
  if(!item.summary?.trim())item.summary=fallback;
  if(!item.body?.trim())item.body=fallback;
}

function securePublicNoticeAsset(item){
  if(item.type!=='notice')return item;
  const value=item.toObject?.()||item;
  if(value.asset?.provider!=='gridfs'||!noticeFileIdPattern.test(String(value.asset?.key||'')))return {...value,asset:undefined};
  return {...value,asset:{...value.asset,provider:'gridfs',url:noticeFileDeliveryUrl(value.asset.key)}};
}

export function makePublishedNoticeSnapshot(item){
  const value=item.toObject?.()||item;
  return {title:value.title,category:value.category,summary:value.summary,body:value.body,displayDate:value.displayDate,featured:Boolean(value.featured),showInTicker:value.showInTicker!==false,asset:value.asset};
}

export function publicContentVersion(item){
  const value=item.toObject?.()||item;
  if(value.type!=='notice')return value;
  const approved=value.publishedSnapshot||(value.status==='published'?value:null);
  if(!approved)return null;
  const publicValue={...value,...approved,status:'published'};
  publicValue.showInTicker=approved.showInTicker!==false;
  delete publicValue.publishedSnapshot;
  return securePublicNoticeAsset(publicValue);
}

export async function listPublicContent(request,response){
  const query=request.validatedQuery||request.query;
  let filter;
  if(query.type==='notice')filter={type:'notice',$or:[{status:'published'},{publishedSnapshot:{$ne:null}}]};
  else if(query.type)filter={type:query.type,status:'published'};
  else filter={$or:[{status:'published'},{type:'notice',publishedSnapshot:{$ne:null}}]};
  const sort=query.type==='notice'?{displayDate:-1,publishedAt:-1,createdAt:-1}:{featured:-1,displayDate:-1,createdAt:-1};
  const items=await Content.find(filter).sort(sort).limit(100).select('-createdBy -updatedBy');
  setPublicCache(response);response.json({success:true,data:items.map(publicContentVersion).filter(Boolean)});
}
export async function listAdminContent(request,response){
  const query=request.validatedQuery||request.query;
  if(request.user.role===ROLES.FACULTY&&!canUploadNotices(request.user))throw new AppError(403,'Notice upload permission is required');
  const page=query.page||1;const limit=query.limit||20;const filter=request.user.role===ROLES.ADMIN?{}:{type:'notice',createdBy:request.user.id};
  if(query.type)filter.type=query.type;
  const [items,total]=await Promise.all([Content.find(filter).sort({updatedAt:-1}).skip((page-1)*limit).limit(limit),Content.countDocuments(filter)]);
  response.json({success:true,data:items,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});
}
export async function createContent(request,response){
  if(request.user.role===ROLES.FACULTY&&(!canUploadNotices(request.user)||request.body.type!=='notice'))throw new AppError(403,'You can only create notices when notice access is assigned');
  const input={...request.body};if(request.user.role===ROLES.FACULTY){input.status='draft';input.showInTicker=false;}
  if(input.type==='notice'){
    if(input.asset)throw new AppError(400,'Notice attachment metadata is created by the server');
    input.asset=await resolveNoticeFile(input.noticeFileId,request.user);
    applyNoticeDescriptionFallback(input);
  }
  delete input.noticeFileId;
  await ensurePublishableNotice(input,request.user);
  if(input.type==='notice'&&input.status==='published')input.publishedSnapshot=makePublishedNoticeSnapshot(input);
  const item=await Content.create({...input,createdBy:request.user.id,updatedBy:request.user.id,publishedAt:input.status==='published'?new Date():undefined});
  await recordAudit(request,'CONTENT_CREATED','Content',item.id,{type:item.type,status:item.status});response.status(201).json({success:true,data:item});
}
export async function updateContent(request,response){
  const item=await Content.findById(request.params.id);if(!item)throw new AppError(404,'Content not found');
  const previousGridFsKeys=gridFsKeys(item);
  if(request.user.role===ROLES.FACULTY&&(!canUploadNotices(request.user)||item.type!=='notice'||!item.createdBy.equals(request.user.id)))throw new AppError(403,'You can only edit notices created by your account');
  const updates={...request.body};
  if(request.user.role===ROLES.FACULTY){
    delete updates.type;
    delete updates.showInTicker;
    // Preserve the last approved version while this revision awaits review.
    if(item.type==='notice'&&item.status==='published'&&!item.publishedSnapshot)item.publishedSnapshot=makePublishedNoticeSnapshot(item);
    updates.status='draft';
  }
  if(item.type==='notice'){
    if(updates.asset)throw new AppError(400,'Notice attachment metadata is created by the server');
    if(updates.noticeFileId)updates.asset=await resolveNoticeFile(updates.noticeFileId,request.user);
  }
  delete updates.noticeFileId;
  Object.assign(item,updates,{updatedBy:request.user.id});
  applyNoticeDescriptionFallback(item);
  await ensurePublishableNotice(item,request.user);
  if(item.type==='notice'&&updates.status==='published'){
    item.publishedSnapshot=makePublishedNoticeSnapshot(item);item.publishedAt ||= new Date();
  }else if(item.type==='notice'&&request.user.role===ROLES.ADMIN&&updates.status==='draft'){
    item.publishedSnapshot=null;item.publishedAt=undefined;
  }else if(updates.status==='published')item.publishedAt ||= new Date();
  await item.save();
  await deleteUnreferencedFiles(previousGridFsKeys);
  await recordAudit(request,'CONTENT_UPDATED','Content',item.id,{type:item.type,status:item.status});response.json({success:true,data:item});
}
export async function deleteContent(request,response){
  const item=await Content.findById(request.params.id);if(!item)throw new AppError(404,'Content not found');
  if(request.user.role===ROLES.FACULTY&&(!canUploadNotices(request.user)||item.type!=='notice'||!item.createdBy.equals(request.user.id)||item.status==='published'||item.publishedSnapshot))throw new AppError(403,'You can only delete your own notices that have never been published');
  const previousGridFsKeys=gridFsKeys(item);await item.deleteOne();await deleteUnreferencedFiles(previousGridFsKeys);
  await recordAudit(request,'CONTENT_DELETED','Content',item.id,{type:item.type});response.status(204).end();
}
