import { Request, Response } from 'express';
import pool from '../db/index.js';

export const listBoardsHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.name, b.description, b.created_at AS "createdAt", bm.role
       FROM board_members bm
       JOIN boards b ON b.id = bm.board_id
       WHERE bm.user_id = $1 AND b.archived_at IS NULL
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    res.status(200).json({ data: { boards: rows } });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

export const createBoardHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
    return;
  }

  const { name, description } = req.body;
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Board name is required.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO boards (owner_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, created_at AS "createdAt"`,
      [req.user.id, name.trim(), typeof description === 'string' ? description.trim() : '']
    );

    const board = rows[0];
    await client.query(
      `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
      [board.id, req.user.id]
    );
    await client.query('COMMIT');
    res.status(201).json({ data: { board: { ...board, role: 'OWNER' } } });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  } finally {
    client.release();
  }
};

export const getBoardHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT b.id, b.name, b.description, b.created_at AS "createdAt", bm.role
       FROM boards b
       JOIN board_members bm ON bm.board_id = b.id
       WHERE b.id = $1 AND bm.user_id = $2 AND b.archived_at IS NULL`,
      [id, req.user?.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Board not found' });
      return;
    }

    res.status(200).json({ data: { board: rows[0] } });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

export const updateBoardHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (name === undefined && description === undefined) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Provide a board name or description to update.' });
      return;
    }
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Board name cannot be empty.' });
      return;
    }
    if (description !== undefined && typeof description !== 'string') {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Board description must be a string.' });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE boards
       SET name = COALESCE($1, name),
           description = CASE WHEN $2::boolean THEN $3 ELSE description END,
           updated_at = NOW()
       WHERE id = $4 AND archived_at IS NULL
       RETURNING id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        name !== undefined ? name.trim() : null,
        description !== undefined,
        description !== undefined && typeof description === 'string' ? description.trim() : null,
        id,
      ]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Board not found or archived.' });
      return;
    }

    res.status(200).json({ data: { board: rows[0] } });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

export const deleteBoardHandler = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const { id } = req.params;

    // Soft delete by setting archived_at timestamp
    const { rows } = await client.query(
      `UPDATE boards
       SET archived_at = NOW()
       WHERE id = $1 AND archived_at IS NULL
       RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(404).json({ error: 'NOT_FOUND', message: 'Board not found or already deleted.' });
      return;
    }

    await client.query('COMMIT');
    transactionStarted = false;
    res.status(200).json({ message: 'Board deleted successfully', data: { boardId: id } });
  } catch (err: any) {
    if (transactionStarted) await client.query('ROLLBACK');
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  } finally {
    client.release();
  }
};

export const addBoardMemberHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: boardId } = req.params;
    const { email, role } = req.body;

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid user email is required.' });
      return;
    }
    if (role !== undefined && role !== 'MEMBER' && role !== 'VIEWER') {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Role must be MEMBER or VIEWER.' });
      return;
    }

    const userRes = await pool.query(
      'SELECT id, email, display_name FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'User with this email does not exist.' });
      return;
    }

    const targetUser = userRes.rows[0];
    const memberRole = role || 'MEMBER';

    const { rows } = await pool.query(
      `INSERT INTO board_members (board_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (board_id, user_id) DO UPDATE SET role = EXCLUDED.role
       WHERE board_members.role <> 'OWNER'
       RETURNING user_id`,
      [boardId, targetUser.id, memberRole]
    );

    if (rows.length === 0) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'The board owner cannot be assigned another role.' });
      return;
    }

    res.status(200).json({ message: 'Member added to board successfully', data: { user: targetUser, role: memberRole } });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

export const updateBoardMemberHandler = async (req: Request, res: Response): Promise<void> => {
  const { id: boardId, userId } = req.params;
  const { role } = req.body;
  if (role !== 'MEMBER' && role !== 'VIEWER') {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Role must be MEMBER or VIEWER.' });
    return;
  }

  try {
    const { rows } = await pool.query(
      `UPDATE board_members
       SET role = $1
       WHERE board_id = $2 AND user_id = $3 AND role <> 'OWNER'
       RETURNING user_id`,
      [role, boardId, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Board member not found or is the board owner.' });
      return;
    }
    res.status(200).json({ data: { userId, role } });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

export const removeBoardMemberHandler = async (req: Request, res: Response): Promise<void> => {
  const { id: boardId, userId } = req.params;
  try {
    const { rows } = await pool.query(
      `DELETE FROM board_members
       WHERE board_id = $1 AND user_id = $2 AND role <> 'OWNER'
       RETURNING user_id`,
      [boardId, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Board member not found or is the board owner.' });
      return;
    }
    res.status(200).json({ data: { userId } });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

export const listBoardMembersHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: boardId } = req.params;
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.display_name as "displayName", bm.role, bm.created_at as "joinedAt"
       FROM board_members bm
       JOIN users u ON bm.user_id = u.id
       WHERE bm.board_id = $1
       ORDER BY bm.created_at ASC`,
      [boardId]
    );

    res.status(200).json({ data: { members: rows } });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};