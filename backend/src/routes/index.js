import { Router } from 'express';
import { health } from '../controllers/health.controller.js';
import { academicDocumentRouter } from './academic-document.routes.js';
import { authRouter } from './auth.routes.js';
import { contentRouter } from './content.routes.js';
import { facultyRouter } from './faculty.routes.js';
import { fileRouter } from './file.routes.js';
import { placementRouter } from './placement.routes.js';

export const apiRouter = Router();
apiRouter.get('/health', health);
apiRouter.use('/academic-documents', academicDocumentRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/content', contentRouter);
apiRouter.use('/faculty', facultyRouter);
apiRouter.use('/files', fileRouter);
apiRouter.use('/placements', placementRouter);
