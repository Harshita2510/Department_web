import { Router } from 'express';
import { deleteOwnFacultyPhoto,downloadFile,uploadFacultyPhoto,uploadFile,uploadNoticeFile,uploadPublicImage } from '../controllers/file.controller.js';
import { authenticate,authorize,optionalAuthenticate,requirePasswordChanged } from '../middleware/auth.middleware.js';
import { uploadImage,uploadNoticeAttachment,uploadSingle,verifyUploadContents } from '../middleware/upload.middleware.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/async-handler.js';

export const fileRouter=Router();
fileRouter.post('/images',authenticate,authorize(ROLES.ADMIN),uploadImage,verifyUploadContents,asyncHandler(uploadPublicImage));
fileRouter.post('/faculty-photo',authenticate,authorize(ROLES.FACULTY),requirePasswordChanged,uploadImage,verifyUploadContents,asyncHandler(uploadFacultyPhoto));
fileRouter.delete('/faculty-photo',authenticate,authorize(ROLES.FACULTY),requirePasswordChanged,asyncHandler(deleteOwnFacultyPhoto));
fileRouter.post('/notices',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),requirePasswordChanged,uploadNoticeAttachment,verifyUploadContents,asyncHandler(uploadNoticeFile));
fileRouter.get('/:id',optionalAuthenticate,asyncHandler(downloadFile));
fileRouter.post('/',authenticate,authorize(ROLES.ADMIN),uploadSingle,verifyUploadContents,asyncHandler(uploadFile));
