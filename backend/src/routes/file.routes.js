import { Router } from 'express';
import { downloadFile,uploadFacultyPhoto,uploadFile,uploadNoticeFile,uploadPublicImage } from '../controllers/file.controller.js';
import { authenticate,authorize,requirePasswordChanged } from '../middleware/auth.middleware.js';
import { uploadImage,uploadNoticePdf,uploadSingle } from '../middleware/upload.middleware.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/async-handler.js';

export const fileRouter=Router();
fileRouter.post('/images',authenticate,authorize(ROLES.ADMIN),uploadImage,asyncHandler(uploadPublicImage));
fileRouter.post('/faculty-photo',authenticate,authorize(ROLES.FACULTY),requirePasswordChanged,uploadImage,asyncHandler(uploadFacultyPhoto));
fileRouter.post('/notices',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),uploadNoticePdf,asyncHandler(uploadNoticeFile));
fileRouter.get('/:id',asyncHandler(downloadFile));
fileRouter.post('/',authenticate,authorize(ROLES.ADMIN),uploadSingle,asyncHandler(uploadFile));
