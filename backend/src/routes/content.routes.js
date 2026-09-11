import { Router } from 'express';
import { createContent,deleteContent,listAdminContent,listPublicContent,updateContent } from '../controllers/content.controller.js';
import { authenticate,authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { contentIdSchema,createContentSchema,updateContentSchema } from '../validators/content.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

export const contentRouter=Router();
contentRouter.get('/public',asyncHandler(listPublicContent));
contentRouter.use(authenticate,authorize(ROLES.ADMIN));
contentRouter.get('/',asyncHandler(listAdminContent));
contentRouter.post('/',validate(createContentSchema),asyncHandler(createContent));
contentRouter.patch('/:id',validate(updateContentSchema),asyncHandler(updateContent));
contentRouter.delete('/:id',validate(contentIdSchema),asyncHandler(deleteContent));
