import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ROLES } from '../constants/roles.js';
import { getAdminPageSettings,getPublicPageSettings,updatePageSettings } from '../controllers/page-settings.controller.js';
import { pageSettingsParamsSchema,pageSettingsUpdateSchema } from '../validators/page-settings.validator.js';

export const pageSettingsRouter=Router();
pageSettingsRouter.get('/public/:page',validate(pageSettingsParamsSchema),asyncHandler(getPublicPageSettings));
pageSettingsRouter.get('/:page',authenticate,authorize(ROLES.ADMIN),validate(pageSettingsParamsSchema),asyncHandler(getAdminPageSettings));
pageSettingsRouter.patch('/:page',authenticate,authorize(ROLES.ADMIN),validate(pageSettingsUpdateSchema),asyncHandler(updatePageSettings));
