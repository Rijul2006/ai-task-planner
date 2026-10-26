import { Router } from 'express';
import { signupHandler, loginHandler, getMeHandler, logoutHandler } from '../controllers/auth.controller.js';
import { authenticateSession } from '../middleware/auth.js';

const router = Router();

// Public Endpoints
router.post('/register', signupHandler);
router.post('/login', loginHandler);

// Protected Endpoints
router.get('/me', authenticateSession, getMeHandler);
router.post('/logout', authenticateSession, logoutHandler);

export default router;