import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../utils/app-error.js';

export const noticeFileIdPattern=/^[a-f\d]{24}$/i;
const noticeMimeTypes=new Set(['application/pdf','image/jpeg','image/png']);

// Keep delivered GridFS links on the mounted API router even if an older
// deployment environment was configured with only the service origin.
export function publicApiBaseUrl(){
  const url=new URL(env.API_PUBLIC_URL);
  const path=url.pathname.replace(/\/$/,'');
  if(!/(^|\/)api$/i.test(path))url.pathname=`${path}/api`;
  return url.href.replace(/\/$/,'');
}

export function gridFsFileDeliveryUrl(fileId){
  return `${publicApiBaseUrl()}/files/${fileId}`;
}

export function noticeFileDeliveryUrl(fileId){
  return gridFsFileDeliveryUrl(fileId);
}

export function buildNoticeAsset(file,id=String(file?._id||'')){
  return {
    provider:'gridfs',
    key:id,
    url:noticeFileDeliveryUrl(id),
    name:file.filename,
    mimeType:file.contentType,
    size:Number(file.length)
  };
}

export function validateNoticeFileRecord(file){
  return Boolean(
    file &&
    noticeMimeTypes.has(file.contentType) &&
    file.metadata?.purpose==='notice' &&
    Number(file.length)>0 &&
    Number(file.length)<=10*1024*1024
  );
}

export async function resolveNoticeFile(fileId,user){
  if(!noticeFileIdPattern.test(String(fileId||'')))throw new AppError(400,'Choose a valid uploaded notice attachment');
  const id=new mongoose.Types.ObjectId(fileId);
  const file=await mongoose.connection.db.collection('uploads.files').findOne({_id:id});
  if(!validateNoticeFileRecord(file))throw new AppError(400,'The uploaded notice attachment was not found or is invalid');
  if(user.role!==ROLES.ADMIN&&String(file.metadata?.uploadedBy||'')!==String(user.id)){
    throw new AppError(403,'You can only attach a notice file uploaded by your account');
  }
  return buildNoticeAsset(file,String(id));
}

export async function deleteGridFsFile(fileId){
  if(!noticeFileIdPattern.test(String(fileId||'')))return;
  const bucket=new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'uploads'});
  try{await bucket.delete(new mongoose.Types.ObjectId(fileId));}catch(error){
    if(error?.code!=='ENOENT'&&!/FileNotFound/i.test(error?.name||''))throw error;
  }
}
