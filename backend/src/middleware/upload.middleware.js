import multer from 'multer';
import { AppError } from '../utils/app-error.js';

const allowed=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','image/jpeg','image/png','image/webp']);

export const uploadSingle=multer({
  storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},
  fileFilter:(_request,file,callback)=>allowed.has(file.mimetype)?callback(null,true):callback(new AppError(415,'Unsupported file type'))
}).single('file');

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize:5*1024*1024, files:1 },
  fileFilter: (_request, file, callback) => imageTypes.has(file.mimetype)
    ? callback(null, true)
    : callback(new AppError(415, 'Only JPEG, PNG and WebP images are supported'))
}).single('file');
