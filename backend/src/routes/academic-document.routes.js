import { Router } from 'express';
import { createAcademicDocument,deleteAcademicDocument,listAdminAcademicDocuments,listPublicAcademicDocuments,updateAcademicDocument } from '../controllers/academic-document.controller.js';
import { authenticate,authorize } from '../middleware/auth.middleware.js';import { validate } from '../middleware/validate.middleware.js';import { ROLES } from '../constants/roles.js';import { asyncHandler } from '../utils/async-handler.js';
import { academicDocumentIdSchema,createAcademicDocumentSchema,updateAcademicDocumentSchema } from '../validators/academic-document.validator.js';

export const academicDocumentRouter=Router();
academicDocumentRouter.get('/public',asyncHandler(listPublicAcademicDocuments));
academicDocumentRouter.use(authenticate,authorize(ROLES.ADMIN));
academicDocumentRouter.get('/',asyncHandler(listAdminAcademicDocuments));
academicDocumentRouter.post('/',validate(createAcademicDocumentSchema),asyncHandler(createAcademicDocument));
academicDocumentRouter.patch('/:id',validate(updateAcademicDocumentSchema),asyncHandler(updateAcademicDocument));
academicDocumentRouter.delete('/:id',validate(academicDocumentIdSchema),asyncHandler(deleteAcademicDocument));
