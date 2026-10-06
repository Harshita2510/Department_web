import { Router } from 'express';
import { createContent,deleteContent,listAdminContent,listPublicContent,updateContent } from '../controllers/content.controller.js';
import { authenticate,authorize,requirePasswordChanged } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { contentIdSchema,createContentSchema,updateContentSchema } from '../validators/content.validator.js';
import { asyncHandler } from '../utils/async-handler.js';
import { managedContentQuerySchema,publicContentQuerySchema } from '../validators/query.validator.js';

export const contentRouter=Router();
contentRouter.get('/public',validate(publicContentQuerySchema),asyncHandler(listPublicContent));
contentRouter.get('/managed',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),requirePasswordChanged,validate(managedContentQuerySchema),asyncHandler(listAdminContent));
contentRouter.get('/',authenticate,authorize(ROLES.ADMIN),validate(managedContentQuerySchema),asyncHandler(listAdminContent));
contentRouter.post('/',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),requirePasswordChanged,validate(createContentSchema),asyncHandler(createContent));
contentRouter.patch('/:id',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),requirePasswordChanged,validate(updateContentSchema),asyncHandler(updateContent));
contentRouter.delete('/:id',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),requirePasswordChanged,validate(contentIdSchema),asyncHandler(deleteContent));
