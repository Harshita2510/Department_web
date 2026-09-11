import { Router } from 'express';
import { createPlacement, deletePlacement, listAdminPlacements, listPublicPlacements, updatePlacement } from '../controllers/placement.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { createPlacementSchema, placementIdSchema, updatePlacementSchema } from '../validators/placement.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

export const placementRouter = Router();
placementRouter.get('/public', asyncHandler(listPublicPlacements));
placementRouter.use(authenticate, authorize(ROLES.ADMIN));
placementRouter.get('/', asyncHandler(listAdminPlacements));
placementRouter.post('/', validate(createPlacementSchema), asyncHandler(createPlacement));
placementRouter.patch('/:id', validate(updatePlacementSchema), asyncHandler(updatePlacement));
placementRouter.delete('/:id', validate(placementIdSchema), asyncHandler(deletePlacement));
