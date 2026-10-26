import { Request, Response, NextFunction } from 'express';
import pool from '../db/index.js';

// Extend Express Request type to include boardRole
declare global {
  namespace Express {
    interface Request {
      boardRole?: 'OWNER' | 'MEMBER' | 'VIEWER';
    }
  }
}

/**
 * Middleware to check if the authenticated user has appropriate membership permissions on a board.
 * Replaces strict owner-only check with Role-Based Access Control (RBAC).
 */
export const authorizeBoardAccess = (allowedRoles: Array<'OWNER' | 'MEMBER' | 'VIEWER'> = ['OWNER', 'MEMBER']) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const boardId = req.params.boardId || req.params.id || req.body.boardId;

      if (!userId || !boardId) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Board context required' });
        return;
      }

      const { rows } = await pool.query(
        `SELECT bm.role
         FROM board_members bm
         JOIN boards b ON b.id = bm.board_id
         WHERE bm.board_id = $1 AND bm.user_id = $2 AND b.archived_at IS NULL`,
        [boardId, userId]
      );

      if (rows.length === 0) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied: you are not a member of this active workspace board.',
        });
        return;
      }

      const userRole = rows[0].role as 'OWNER' | 'MEMBER' | 'VIEWER';

      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}.`,
        });
        return;
      }

      req.boardRole = userRole;
      next();
    } catch (err: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
    }
  };
};

export const authorizeTaskAccess = (allowedRoles: Array<'OWNER' | 'MEMBER' | 'VIEWER'>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const taskId = req.params.taskId || req.params.id;

      if (!userId || !taskId) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Task context required' });
        return;
      }

      const { rows } = await pool.query(
        `SELECT bm.role
         FROM tasks t
         JOIN boards b ON b.id = t.board_id
         JOIN board_members bm ON bm.board_id = b.id
         WHERE t.id = $1 AND bm.user_id = $2 AND b.archived_at IS NULL`,
        [taskId, userId]
      );

      if (rows.length === 0) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Task not found or board access denied.' });
        return;
      }

      const userRole = rows[0].role as 'OWNER' | 'MEMBER' | 'VIEWER';
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}.`,
        });
        return;
      }

      req.boardRole = userRole;
      next();
    } catch (err: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
    }
  };
};

export const authorizeBoardOwner = authorizeBoardAccess(['OWNER']);