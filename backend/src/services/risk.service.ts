import { query } from '../db/index.js';

export interface RiskSignal {
    ruleId: string;
    taskId: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    evidence: string[];
}

export class RiskService {
static async evaluate(boardId: string): Promise<RiskSignal[]> {
    const signals: RiskSignal[] = [];

    // Fetch tasks for the board
    const tasksRes = await query(
    `SELECT id, title, status, priority, due_date AS "dueDate"
    FROM tasks WHERE board_id = $1`,
    [boardId]
    );

    const tasks = tasksRes.rows;
    const today = new Date();
    const dueSoonThreshold = parseInt(process.env.RISK_DUE_SOON_THRESHOLD_DAYS || '2', 10);
    const staleThresholdDays = parseInt(process.env.RISK_STALE_THRESHOLD_DAYS || '3', 10);

    for (const task of tasks) {
    if (task.status === 'DONE') continue;

    // Rule 1: OVERDUE
    if (task.dueDate && new Date(task.dueDate) < today) {
        signals.push({
        ruleId: 'OVERDUE',
        taskId: task.id,
        severity: 'HIGH',
        evidence: [`Task '${task.title}' passed its due date (${task.dueDate})`],
        });
    }

    // Rule 2: DUE_SOON
    if (task.dueDate) {
        const dueDateObj = new Date(task.dueDate);
        const diffDays = (dueDateObj.getTime() - today.getTime()) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= dueSoonThreshold) {
        signals.push({
            ruleId: 'DUE_SOON',
            taskId: task.id,
            severity: 'MEDIUM',
            evidence: [`Task '${task.title}' is due in ${Math.ceil(diffDays)} day(s)`],
        });
        }
    }

    // Rule 3: BLOCKED
    if (task.status === 'BLOCKED') {
        signals.push({
        ruleId: 'BLOCKED',
        taskId: task.id,
        severity: 'HIGH',
        evidence: [`Task '${task.title}' is currently marked as BLOCKED`],
        });
    }

    // Rule 4: HIGH_PRIORITY_RISK
    if ((task.priority === 'HIGH' || task.priority === 'URGENT') && task.status !== 'IN_PROGRESS') {
        signals.push({
        ruleId: 'HIGH_PRIORITY_RISK',
        taskId: task.id,
        severity: 'HIGH',
        evidence: [`High priority task '${task.title}' is not yet IN_PROGRESS`],
        });
    }
    }

    return signals;
}
}