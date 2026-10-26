import { query } from '../db/index.js';

export class ActivityService {
    /**
     * Append-only event logger for all board & task mutations
     */
    static async record(params: {
        taskId: string;
        event: string;
        actorType: 'USER' | 'AI_AGENT' | 'SYSTEM';
        actorId?: string | null;
        oldValue?: any;
        newValue?: any;
        reason?: string | null;
    }) {
        await query(
        `INSERT INTO task_activity (task_id, event, actor_type, actor_id, old_value, new_value, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            params.taskId,
            params.event,
            params.actorType,
            params.actorId || null,
            params.oldValue ? JSON.stringify(params.oldValue) : null,
            params.newValue ? JSON.stringify(params.newValue) : null,
            params.reason || null,
        ]
        );
    }

    static async getTaskHistory(taskId: string) {
        const res = await query(
            `SELECT a.id, a.task_id AS "taskId", a.event, a.actor_type AS "actorType",
                a.actor_id AS "actorId", u.display_name AS "actorName",
                a.old_value AS "oldValue", a.new_value AS "newValue",
                a.reason, a.created_at AS "createdAt"
            FROM task_activity a
            LEFT JOIN users u ON a.actor_id = u.id
            WHERE a.task_id = $1
            ORDER BY a.created_at DESC`,
            [taskId]
        );
        return res.rows;
    }
}