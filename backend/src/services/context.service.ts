import { query } from '../db/index.js';
import { RiskService } from './risk.service.js';

export class ContextService {
    static async build(userId: string, boardId: string) {
        const boardRes = await query(`SELECT id, name FROM boards WHERE id = $1`, [boardId]);
        if (boardRes.rowCount === 0) throw new Error('Board not found');

        const tasksRes = await query(
        `SELECT t.id, t.title, t.status, t.priority, t.due_date AS "dueDate", u.display_name AS "assigneeName"
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.board_id = $1
        LIMIT 200`,
        [boardId]
        );

        const depsRes = await query(
        `SELECT td.blocking_task_id AS "blockingTaskId", td.blocked_task_id AS "blockedTaskId"
        FROM task_dependencies td
        JOIN tasks t ON td.blocking_task_id = t.id
        WHERE t.board_id = $1`,
        [boardId]
        );

        const riskSignals = await RiskService.evaluate(boardId);

        return {
        board: boardRes.rows[0],
        taskCount: tasksRes.rowCount,
        tasks: tasksRes.rows,
        dependencies: depsRes.rows,
        riskSignals,
        };
    }
}