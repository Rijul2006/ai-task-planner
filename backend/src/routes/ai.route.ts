import { Router } from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { authorizeBoardAccess } from '../middleware/authorizeBoardOwner.js';
import { aiChatHandler, approveActionHandler, rejectActionHandler } from '../controllers/ai.controller.js';

const router = Router();

router.use(authenticateSession);

router.post('/chat', authorizeBoardAccess(['OWNER', 'MEMBER', 'VIEWER']), aiChatHandler);
router.post('/actions/:id/approve', approveActionHandler);
router.post('/actions/:id/reject', rejectActionHandler);

export default router;