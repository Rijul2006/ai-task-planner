import { Router } from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { authorizeTaskAccess } from '../middleware/authorizeBoardOwner.js';
import { addDependencyHandler } from '../controllers/dependencies.controller.js';

const router = Router();

router.use(authenticateSession);

router.post('/tasks/:taskId/dependencies', authorizeTaskAccess(['OWNER', 'MEMBER']), addDependencyHandler);

export default router;