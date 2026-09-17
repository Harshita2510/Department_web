import { Router } from 'express';
import { createContent,deleteContent,listAdminContent,listPublicContent,updateContent } from '../controllers/content.controller.js';
import { authenticate,authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { contentIdSchema,createContentSchema,updateContentSchema } from '../validators/content.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

export const contentRouter=Router();
contentRouter.get('/public',asyncHandler(listPublicContent));
contentRouter.get('/managed',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),asyncHandler(listAdminContent));
contentRouter.get('/',authenticate,authorize(ROLES.ADMIN),asyncHandler(listAdminContent));
contentRouter.post('/',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),validate(createContentSchema),asyncHandler(createContent));
contentRouter.patch('/:id',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),validate(updateContentSchema),asyncHandler(updateContent));
contentRouter.delete('/:id',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),validate(contentIdSchema),asyncHandler(deleteContent));
