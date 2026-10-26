import { query } from '../db/index.js';
import { authorize } from '../middleware/authorize.js';
import { TasksService } from './tasks.service.js';
import { ActivityService } from './activity.service.js';

export class ApprovalService {
    static async approveAction(userId: string, actionId: string) {
        // 1. Fetch action record
        const actionRes = await query(
        `SELECT id, task_id AS "taskId", tool_name AS "toolName",
                tool_args AS "toolArgs", reason, status
        FROM ai_actions WHERE id = $1`,
        [actionId]
        );

        if (actionRes.rowCount === 0) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Action record not found' };
        }

        const action = actionRes.rows[0];

        if (action.status !== 'pending_approval') {
        throw { status: 409, code: 'INVALID_STATE', message: `Action is already ${action.status}` };
        }

        // 2. Re-verify user authorization on the task's board
        if (action.taskId) {
        const hasAccess = await authorize(userId, 'task', action.taskId);
        if (!hasAccess) {
            throw { status: 403, code: 'FORBIDDEN', message: 'User unauthorized to execute this action' };
        }
        }

        const args = typeof action.toolArgs === 'string' ? JSON.parse(action.toolArgs) : action.toolArgs;

        try {
        // 3. Execute the actual underlying domain mutation
        let updatedTask = null;
        if (action.toolName === 'update_task' && action.taskId) {
            updatedTask = await TasksService.updateTask(userId, action.taskId, args.patch || args);
        }

        // 4. Update ai_actions state machine to 'executed'
        await query(
            `UPDATE ai_actions
            SET status = 'executed', decided_by = $1, decided_at = NOW(), executed_at = NOW()
            WHERE id = $2`,
            [userId, actionId]
        );

        // 5. Append-only activity log with actorType = AI_AGENT
        if (action.taskId) {
            await ActivityService.record({
            taskId: action.taskId,
            event: 'ai_action_executed',
            actorType: 'AI_AGENT',
            actorId: userId,
            newValue: args,
            reason: action.reason,
            });
        }

        return { actionId, status: 'executed', updatedTask };
        } catch (err: any) {
        // Transition state to 'failed' if execution errors out
        await query(
            `UPDATE ai_actions SET status = 'failed', error = $1 WHERE id = $2`,
            [err.message || 'Execution error', actionId]
        );
        throw err;
        }
    }

    static async rejectAction(userId: string, actionId: string) {
        const actionRes = await query(`SELECT id, status FROM ai_actions WHERE id = $1`, [actionId]);
        if (actionRes.rowCount === 0) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Action record not found' };
        }

        if (actionRes.rows[0].status !== 'pending_approval') {
        throw { status: 409, code: 'INVALID_STATE', message: 'Action is not pending approval' };
        }

        await query(
        `UPDATE ai_actions
        SET status = 'rejected', decided_by = $1, decided_at = NOW()
        WHERE id = $2`,
        [userId, actionId]
        );

        return { actionId, status: 'rejected' };
    }
}