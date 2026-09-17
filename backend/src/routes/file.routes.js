import { Router } from 'express';
import { downloadFile,uploadFile,uploadPublicImage } from '../controllers/file.controller.js';
import { authenticate,authorize } from '../middleware/auth.middleware.js';
import { uploadImage,uploadSingle } from '../middleware/upload.middleware.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/async-handler.js';

export const fileRouter=Router();
fileRouter.post('/images',authenticate,authorize(ROLES.ADMIN),uploadImage,asyncHandler(uploadPublicImage));
fileRouter.get('/:id',asyncHandler(downloadFile));
fileRouter.post('/',authenticate,authorize(ROLES.ADMIN),uploadSingle,asyncHandler(uploadFile));
