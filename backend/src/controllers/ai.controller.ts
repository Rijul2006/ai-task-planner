import { Request, Response } from 'express';
import pool from '../db/index.js';

export const aiChatHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { boardId, message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Message cannot be empty.' });
      return;
    }

    // 1. Fetch current board snapshot for context
    const taskRes = await pool.query('SELECT * FROM tasks WHERE board_id = $1', [boardId]);
    const tasks: any[] = taskRes.rows;

    const queryLower = message.trim().toLowerCase();

    // 2. Natural Conversational Greeting / General QA
    if (['hi', 'hello', 'hey', 'namaste'].includes(queryLower)) {
      res.status(200).json({
        type: 'text',
        content: `Hello! I am your AI TPM Co-Pilot. I am monitoring your workspace (${tasks.length} tasks). How can I assist you with sprint risks, dependencies, or task scheduling today?`,
      });
      return;
    }

    // 3. Action Proposal Trigger (e.g., "block", "urgent", "flag risk")
    if (
      req.boardRole !== 'VIEWER' &&
      (queryLower.includes('block') || queryLower.includes('risk') || queryLower.includes('urgent'))
    ) {
      const unblockedTask = tasks.find((t) => t.status !== 'BLOCKED');
      if (unblockedTask) {
        const actionRes = await pool.query(
          `INSERT INTO ai_actions (task_id, tool_name, tool_args, reason, status, requested_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, tool_name as "toolName", reason, status`,
          [
            unblockedTask.id,
            'change_status',
            JSON.stringify({ taskId: unblockedTask.id, status: 'BLOCKED' }),
            `Flagged "${unblockedTask.title}" due to potential dependency bottleneck.`,
            'pending_approval',
            userId,
          ]
        );

        res.status(200).json({
          type: 'action_proposal',
          action: actionRes.rows[0],
        });
        return;
      }
    }

    // 4. Default Assistant Response grounded in workspace context
    const blockedCount = tasks.filter((t) => t.status === 'BLOCKED').length;
    res.status(200).json({
      type: 'text',
      content: `I analyzed your workspace: You currently have ${tasks.length} total tasks with ${blockedCount} blocked tasks. Let me know if you want me to update task statuses or analyze critical paths.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

export const approveActionHandler = async (req: Request, res: Response) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const actionId = req.params.id;
    const userId = req.user?.id;

    const actionRes = await client.query('SELECT * FROM ai_actions WHERE id = $1 AND status = $2 FOR UPDATE', [
      actionId,
      'pending_approval',
    ]);

    if (actionRes.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(400).json({ error: 'INVALID_ACTION', message: 'Action not found or already processed' });
      return;
    }

    const action = actionRes.rows[0];
    const access = await client.query(
      `SELECT bm.role
       FROM tasks t
       JOIN boards b ON b.id = t.board_id
       JOIN board_members bm ON bm.board_id = b.id
       WHERE t.id = $1 AND bm.user_id = $2 AND b.archived_at IS NULL`,
      [action.task_id, userId]
    );
    if (!access.rows.length || !['OWNER', 'MEMBER'].includes(access.rows[0].role)) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(403).json({ error: 'FORBIDDEN', message: 'Only board owners and members can approve task changes.' });
      return;
    }

    const args = typeof action.tool_args === 'string' ? JSON.parse(action.tool_args) : action.tool_args;

    // Execute state mutation based on approved action
    if (action.tool_name === 'change_status') {
      if (!['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].includes(args.status)) {
        throw new Error('The proposed task status is invalid.');
      }
      const { rows } = await client.query(
        `UPDATE tasks
         SET status = $1,
             completed_at = CASE
               WHEN $1 = 'DONE' THEN COALESCE(completed_at, NOW())
               ELSE NULL
             END,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, board_id AS "boardId", title, description, status, priority`,
        [args.status, action.task_id]
      );
      if (!rows.length) throw new Error('Task no longer exists.');

      await client.query(
        `INSERT INTO task_activity (task_id, event, actor_type, actor_id, reason, new_value)
         VALUES ($1, 'status_changed', 'AI_AGENT', $2, $3, $4)`,
        [action.task_id, userId, action.reason, JSON.stringify(rows[0])]
      );
    } else {
      throw new Error(`Unsupported AI action: ${action.tool_name}`);
    }

    await client.query(
      `UPDATE ai_actions SET status = 'executed', decided_by = $1, decided_at = NOW(), executed_at = NOW() WHERE id = $2`,
      [userId, actionId]
    );

    await client.query('COMMIT');
    transactionStarted = false;
    res.status(200).json({ data: { message: 'Action successfully approved and executed' } });
  } catch (err: any) {
    if (transactionStarted) await client.query('ROLLBACK');
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  } finally {
    client.release();
  }
};

export const rejectActionHandler = async (req: Request, res: Response) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const actionId = req.params.id;
    const userId = req.user?.id;

    const { rows } = await client.query(
      `      SELECT a.id, a.status, a.task_id, bm.role
       FROM ai_actions a
       JOIN tasks t ON t.id = a.task_id
       JOIN boards b ON b.id = t.board_id
       JOIN board_members bm ON bm.board_id = b.id
       WHERE a.id = $1 AND bm.user_id = $2 AND b.archived_at IS NULL
       FOR UPDATE OF a`,
      [actionId, userId]
    );
    if (!rows.length || rows[0].status !== 'pending_approval') {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(404).json({ error: 'NOT_FOUND', message: 'Pending action not found or access denied.' });
      return;
    }

    if (rows[0].role === 'VIEWER') {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(403).json({ error: 'FORBIDDEN', message: 'Viewers cannot reject task changes.' });
      return;
    }

    await client.query(
      `UPDATE ai_actions SET status = 'rejected', decided_by = $1, decided_at = NOW() WHERE id = $2`,
      [userId, actionId]
    );

    await client.query('COMMIT');
    transactionStarted = false;
    res.status(200).json({ data: { message: 'Action rejected' } });
  } catch (err: any) {
    if (transactionStarted) await client.query('ROLLBACK');
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  } finally {
    client.release();
  }
};