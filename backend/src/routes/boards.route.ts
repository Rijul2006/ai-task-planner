import { Router } from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { authorizeBoardAccess } from '../middleware/authorizeBoardOwner.js';
import {
  listBoardsHandler,
  createBoardHandler,
  getBoardHandler,
  updateBoardHandler,
  deleteBoardHandler,
  addBoardMemberHandler,
  listBoardMembersHandler,
  updateBoardMemberHandler,
  removeBoardMemberHandler,
} from '../controllers/boards.controller.js';
import { createTaskHandler, listBoardTasksHandler } from '../controllers/tasks.controller.js';

const router = Router();

// Require session authentication for all board routes
router.use(authenticateSession);

// Board Listing & Creation
router.get('/', listBoardsHandler);
router.post('/', createBoardHandler);

// Single Board Details
router.get('/:id', authorizeBoardAccess(['OWNER', 'MEMBER', 'VIEWER']), getBoardHandler);

// Board Management (OWNER Only)
router.patch('/:id', authorizeBoardAccess(['OWNER']), updateBoardHandler);
router.delete('/:id', authorizeBoardAccess(['OWNER']), deleteBoardHandler);

// Board Member Management
router.get('/:id/members', authorizeBoardAccess(['OWNER', 'MEMBER', 'VIEWER']), listBoardMembersHandler);
router.post('/:id/members', authorizeBoardAccess(['OWNER']), addBoardMemberHandler);
router.patch('/:id/members/:userId', authorizeBoardAccess(['OWNER']), updateBoardMemberHandler);
router.delete('/:id/members/:userId', authorizeBoardAccess(['OWNER']), removeBoardMemberHandler);

// Task Operations within Board Context
router.get('/:boardId/tasks', authorizeBoardAccess(['OWNER', 'MEMBER', 'VIEWER']), listBoardTasksHandler);
router.post('/:boardId/tasks', authorizeBoardAccess(['OWNER', 'MEMBER']), createTaskHandler);

export default router;