import { Request, Response } from 'express';
import { CreateTaskSchema, UpdateTaskSchema } from '../schemas/tasks.schema.js';
import pool from '../db/index.js';
import { TasksService } from '../services/tasks.service.js';

export const listBoardTasksHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await TasksService.listTasksByBoard(String(req.params.boardId));
    res.status(200).json({ data: { tasks } });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || 'Server error' });
  }
};

export const createTaskHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
    return;
  }

  const parsed = CreateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues[0]?.message || 'Invalid task details',
    });
    return;
  }

  const { title, description, priority, status, dueDate, assigneeId } = parsed.data;
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const taskRes = await client.query(
      `INSERT INTO tasks (board_id, title, description, priority, status, due_date, assignee_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, board_id AS "boardId", title, description, priority, status,
                 due_date AS "dueDate", assignee_id AS "assigneeId"`,
      [
        req.params.boardId,
        title.trim(),
        description?.trim() || null,
        priority || 'MEDIUM',
        status || 'TODO',
        dueDate || null,
        assigneeId || req.user.id,
      ]
    );

    const task = taskRes.rows[0];
    await client.query(
      `INSERT INTO task_activity (task_id, event, actor_type, actor_id, new_value)
       VALUES ($1, 'created', 'USER', $2, $3)`,
      [task.id, req.user.id, JSON.stringify(task)]
    );

    await client.query('COMMIT');
    res.status(201).json({ data: { task } });
  } catch (err: any) {
    if (transactionStarted) await client.query('ROLLBACK');
    console.error('Task creation failed:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: err.message || 'Failed to create task' });
  } finally {
    client.release();
  }
};

export const updateTaskHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
    return;
  }

  const parsed = UpdateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues[0]?.message || 'Invalid task updates',
    });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Provide at least one task field to update.' });
    return;
  }

  const patch = parsed.data;
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const taskId = req.params.id;
    const existing = await client.query(
      `SELECT id, board_id AS "boardId", title, description, status, priority,
              due_date AS "dueDate", assignee_id AS "assigneeId"
       FROM tasks WHERE id = $1 FOR UPDATE`,
      [taskId]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(404).json({ error: 'NOT_FOUND', message: 'Task not found.' });
      return;
    }

    const oldTask = existing.rows[0];
    const { rows } = await client.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = CASE WHEN $2::boolean THEN $3 ELSE description END,
           priority = COALESCE($4::task_priority, priority),
           status = COALESCE($5::task_status, status),
           due_date = CASE WHEN $6::boolean THEN $7::date ELSE due_date END,
           completed_at = CASE
             WHEN COALESCE($5::task_status, status) = 'DONE' THEN COALESCE(completed_at, NOW())
             WHEN $5::task_status IS NOT NULL THEN NULL
             ELSE completed_at
           END,
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, board_id AS "boardId", title, description, status, priority,
                 due_date AS "dueDate", assignee_id AS "assigneeId"`,
      [
        patch.title?.trim() || null,
        patch.description !== undefined,
        patch.description?.trim() || null,
        patch.priority || null,
        patch.status || null,
        patch.dueDate !== undefined,
        patch.dueDate || null,
        taskId,
      ]
    );
    const updatedTask = rows[0];

    await client.query(
      `INSERT INTO task_activity (task_id, event, actor_type, actor_id, old_value, new_value)
       VALUES ($1, 'updated', 'USER', $2, $3, $4)`,
      [taskId, req.user.id, JSON.stringify(oldTask), JSON.stringify(updatedTask)]
    );

    await client.query('COMMIT');
    res.status(200).json({ data: { task: updatedTask } });
  } catch (err: any) {
    if (transactionStarted) await client.query('ROLLBACK');
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || 'Failed to update task' });
  } finally {
    client.release();
  }
};

export const deleteTaskHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
    return;
  }

  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const taskId = req.params.id;
    const { rows } = await client.query(
      `SELECT id, board_id AS "boardId", title, description, status, priority
       FROM tasks WHERE id = $1 FOR UPDATE`,
      [taskId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(404).json({ error: 'NOT_FOUND', message: 'Task not found.' });
      return;
    }

    await client.query(
      `INSERT INTO task_activity (task_id, event, actor_type, actor_id, new_value)
       VALUES ($1, 'deleted', 'USER', $2, $3)`,
      [taskId, req.user.id, JSON.stringify({ ...rows[0], deleted: true })]
    );
    await client.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    await client.query('COMMIT');
    res.status(200).json({ message: 'Task deleted successfully', data: { taskId } });
  } catch (err: any) {
    if (transactionStarted) await client.query('ROLLBACK');
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || 'Failed to delete task' });
  } finally {
    client.release();
  }
};
