import { Router } from 'express';
import { getAdminHomepageSettings,getPublicHomepageSettings,updateHomepageSettings } from '../controllers/homepage-settings.controller.js';
import { authenticate,authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/async-handler.js';
import { homepageSettingsSchema } from '../validators/homepage-settings.validator.js';
import { emptyQuerySchema } from '../validators/query.validator.js';

export const homepageSettingsRouter=Router();
homepageSettingsRouter.get('/public',validate(emptyQuerySchema),asyncHandler(getPublicHomepageSettings));
homepageSettingsRouter.get('/',authenticate,authorize(ROLES.ADMIN),validate(emptyQuerySchema),asyncHandler(getAdminHomepageSettings));
homepageSettingsRouter.patch('/',authenticate,authorize(ROLES.ADMIN),validate(homepageSettingsSchema),asyncHandler(updateHomepageSettings));
