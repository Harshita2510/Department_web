import { cloudinary, cloudinaryConfigured } from '../config/cloudinary.js';
import { AppError } from '../utils/app-error.js';

const allowedFolders = new Set(['events', 'news', 'media', 'faculty']);

export function uploadCloudinaryImage(file, requestedFolder = 'media') {
  if (!cloudinaryConfigured) throw new AppError(503, 'Image storage is not configured');
  const folder = allowedFolders.has(requestedFolder) ? requestedFolder : 'media';

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream({
      folder: `sgsits/${folder}`,
      resource_type: 'image',
      unique_filename: true,
      overwrite: false
    }, (error, result) => {
      if (error) return reject(new AppError(502, 'Cloudinary image upload failed'));
      return resolve(result);
    });
    upload.end(file.buffer);
  });
}

export async function deleteCloudinaryImage(publicId) {
  if (!cloudinaryConfigured || !publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type:'image', invalidate:true });
}

export function uploadSyllabusAsset(file, folder) {
  if (!cloudinaryConfigured) throw new AppError(503, 'Syllabus file storage is not configured');
  const isPdf=file.mimetype==='application/pdf';
  return new Promise((resolve,reject)=>{
    const upload=cloudinary.uploader.upload_stream({
      folder:`sgsits/syllabus/${folder}`,
      resource_type:'image',
      format:isPdf?'pdf':undefined,
      unique_filename:true,
      overwrite:false
    },(error,result)=>{
      if(error)return reject(new AppError(502,'Cloudinary syllabus upload failed'));
      resolve(result);
    });
    upload.end(file.buffer);
  });
}

export function uploadPlacementPdfAsset(file,academicYear){
  if(!cloudinaryConfigured)throw new AppError(503,'Placement file storage is not configured');
  return new Promise((resolve,reject)=>{
    const upload=cloudinary.uploader.upload_stream({
      folder:`sgsits/placements/${academicYear}`,
      resource_type:'image',format:'pdf',unique_filename:true,overwrite:false
    },(error,result)=>{
      if(error)return reject(new AppError(502,'Cloudinary placement PDF upload failed'));
      resolve(result);
    });
    upload.end(file.buffer);
  });
}

export function uploadTimetableAsset(file,folder){
  if(!cloudinaryConfigured)throw new AppError(503,'Timetable file storage is not configured');
  const isPdf=file.mimetype==='application/pdf';
  return new Promise((resolve,reject)=>{
    const upload=cloudinary.uploader.upload_stream({
      folder:`sgsits/timetables/${folder}`,resource_type:'image',format:isPdf?'pdf':undefined,unique_filename:true,overwrite:false
    },(error,result)=>{
      if(error)return reject(new AppError(502,'Cloudinary timetable upload failed'));
      resolve(result);
    });
    upload.end(file.buffer);
  });
}

export async function verifyCloudinaryFileDelivery(asset) {
  if(!asset?.url)throw new AppError(400,'Upload a file before publishing');
  let response;
  try{
    response=await fetch(asset.url,{method:'HEAD',signal:AbortSignal.timeout(8000)});
  }catch{
    throw new AppError(502,'Could not verify the syllabus file with Cloudinary. Try publishing again.');
  }
  if(response.ok)return;
  const cloudinaryError=response.headers.get('x-cld-error')||'';
  if(asset.mimeType==='application/pdf'&&response.status===401&&/deny|acl/i.test(cloudinaryError)){
    throw new AppError(409,'Cloudinary is blocking PDF delivery. Enable “Allow delivery of PDF and ZIP files” in Cloudinary Console → Settings → Security, then publish again.');
  }
  throw new AppError(502,`Cloudinary could not deliver this file (HTTP ${response.status}).`);
}
