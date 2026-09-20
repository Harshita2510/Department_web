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

const syllabusTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
export const uploadSyllabus = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize:10*1024*1024, files:1 },
  fileFilter: (_request, file, callback) => syllabusTypes.has(file.mimetype)
    ? callback(null, true)
    : callback(new AppError(415, 'Syllabus files must be PDF, JPEG, PNG or WebP'))
}).single('file');

export const uploadPlacementPdf=multer({
  storage:multer.memoryStorage(),
  limits:{fileSize:10*1024*1024,files:1},
  fileFilter:(_request,file,callback)=>file.mimetype==='application/pdf'
    ?callback(null,true)
    :callback(new AppError(415,'Placement documents must be PDF files'))
}).single('file');

export const uploadTimetableFile=multer({
  storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},
  fileFilter:(_request,file,callback)=>syllabusTypes.has(file.mimetype)
    ?callback(null,true)
    :callback(new AppError(415,'Timetables must be PDF, JPEG, PNG or WebP files'))
}).single('file');

export const uploadNoticePdf=multer({
  storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},
  fileFilter:(_request,file,callback)=>file.mimetype==='application/pdf'
    ?callback(null,true)
    :callback(new AppError(415,'Notice attachments must be PDF files'))
}).single('file');
