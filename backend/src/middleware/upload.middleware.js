import multer from 'multer';
import { AppError } from '../utils/app-error.js';

const allowed=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','image/jpeg','image/png','image/webp']);

export function fileMatchesDeclaredType(file){
  const buffer=file?.buffer;
  if(!buffer?.length)return false;
  const mime=file.mimetype;
  if(mime==='application/pdf')return buffer.subarray(0,5).toString()==='%PDF-';
  if(mime==='image/png')return buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/jpeg')return buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;
  if(mime==='image/webp')return buffer.length>=12&&buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
  if(['application/msword','application/vnd.ms-excel'].includes(mime))return buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]));
  if(['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime))return buffer.length>=4&&buffer.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04]));
  if(mime==='text/csv')return !buffer.includes(0)&&!buffer.subarray(0,1024).toString('utf8').includes('\uFFFD');
  return false;
}

export function verifyUploadContents(request,_response,next){
  if(!request.file)return next();
  if(!fileMatchesDeclaredType(request.file))return next(new AppError(415,'Uploaded file content does not match its declared type'));
  next();
}

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

const noticeAttachmentTypes=new Set(['application/pdf','image/jpeg','image/png']);
export const uploadNoticeAttachment=multer({
  storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},
  fileFilter:(_request,file,callback)=>noticeAttachmentTypes.has(file.mimetype)
    ?callback(null,true)
    :callback(new AppError(415,'Notice attachments must be PDF, JPEG or PNG files'))
}).single('file');

export const uploadQuestionPaperPdf=multer({
  storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},
  fileFilter:(_request,file,callback)=>file.mimetype==='application/pdf'
    ?callback(null,true)
    :callback(new AppError(415,'Question papers must be PDF files'))
}).single('file');
