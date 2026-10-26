import { query } from '../db/index.js';

export class TasksService {
    static async listTasksByBoard(boardId: string) {
        const res = await query(
        `SELECT t.id, t.board_id AS "boardId", t.title, t.description, t.status,
                t.priority, t.due_date AS "dueDate", t.assignee_id AS "assigneeId",
                t.created_at AS "createdAt", t.completed_at AS "completedAt",
                u.display_name AS "assigneeName"
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.board_id = $1
        ORDER BY t.created_at DESC`,
        [boardId]
        );
        return res.rows;
    }

    static async createTask(userId: string, boardId: string, data: any) {
        const res = await query(
        `INSERT INTO tasks (board_id, title, description, status, priority, due_date, assignee_id)
        VALUES ($1, $2, $3, COALESCE($4::task_status, 'TODO'), COALESCE($5::task_priority, 'MEDIUM'), $6, $7)
        RETURNING id, board_id AS "boardId", title, description, status, priority,
                    due_date AS "dueDate", assignee_id AS "assigneeId", created_at AS "createdAt"`,
        [
            boardId,
            data.title,
            data.description || null,
            data.status || null,
            data.priority || null,
            data.dueDate || null,
            data.assigneeId || null,
        ]
        );
        return res.rows[0];
    }

    static async updateTask(userId: string, taskId: string, patch: any) {
        // 1. Fetch current status for completed_at timestamp transition logic
        const current = await query(`SELECT status FROM tasks WHERE id = $1`, [taskId]);
        if (current.rowCount === 0) throw { status: 404, message: 'Task not found' };

        const oldStatus = current.rows[0].status;
        const newStatus = patch.status || oldStatus;

        let completedAtExpr = 'completed_at';
        if (newStatus === 'DONE' && oldStatus !== 'DONE') {
        completedAtExpr = 'NOW()';
        } else if (newStatus !== 'DONE' && oldStatus === 'DONE') {
        completedAtExpr = 'NULL';
        }

        const res = await query(
        `UPDATE tasks
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            status = COALESCE($3::task_status, status),
            priority = COALESCE($4::task_priority, priority),
            due_date = COALESCE($5, due_date),
            assignee_id = COALESCE($6, assignee_id),
            updated_at = NOW(),
            completed_at = ${completedAtExpr}
        WHERE id = $7
        RETURNING id, board_id AS "boardId", title, description, status, priority,
                    due_date AS "dueDate", assignee_id AS "assigneeId", updated_at AS "updatedAt", completed_at AS "completedAt"`,
        [
            patch.title || null,
            patch.description || null,
            patch.status || null,
            patch.priority || null,
            patch.dueDate || null,
            patch.assigneeId || null,
            taskId,
        ]
        );

        return res.rows[0];
    }

    static async deleteTask(taskId: string) {
        await query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
    }
}