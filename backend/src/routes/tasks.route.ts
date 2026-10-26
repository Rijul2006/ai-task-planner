import { Router } from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { updateTaskHandler, deleteTaskHandler } from '../controllers/tasks.controller.js';
import { authorizeTaskAccess } from '../middleware/authorizeBoardOwner.js';

const router = Router();

router.use(authenticateSession);

router.patch('/:id', authorizeTaskAccess(['OWNER', 'MEMBER']), updateTaskHandler);
router.delete('/:id', authorizeTaskAccess(['OWNER', 'MEMBER']), deleteTaskHandler);

export default router;