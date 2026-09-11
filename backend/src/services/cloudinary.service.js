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
