import { query } from '../db/index.js';

export class DependenciesService {
    /**
     * DFS Graph Traversal Algorithm for Cycle Detection
     * Rule: Adding edge (blockingTaskId -> blockedTaskId).
     * A cycle exists if blockedTaskId can ALREADY reach blockingTaskId via existing edges.
     */
    static async wouldCreateCycle(blockingTaskId: string, blockedTaskId: string): Promise<boolean> {
        if (blockingTaskId === blockedTaskId) return true;

        const visited = new Set<string>();
        const stack: string[] = [blockedTaskId];

        while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === blockingTaskId) {
            return true; // Cycle detected!
        }

        if (visited.has(current)) continue;
        visited.add(current);

        // Fetch all tasks that 'current' is blocking
        const res = await query(
            `SELECT blocked_task_id FROM task_dependencies WHERE blocking_task_id = $1`,
            [current]
        );

        for (const row of res.rows) {
            stack.push(row.blocked_task_id);
        }
        }

        return false;
    }

    static async addDependency(blockingTaskId: string, blockedTaskId: string) {
        // 1. Run DFS cycle detection check
        const isCycle = await DependenciesService.wouldCreateCycle(blockingTaskId, blockedTaskId);
        if (isCycle) {
        throw { status: 409, code: 'CYCLE_DETECTED', message: 'Adding this dependency would create a circular deadlock' };
        }

        // 2. Insert dependency edge into database
        const res = await query(
        `INSERT INTO task_dependencies (blocking_task_id, blocked_task_id)
        VALUES ($1, $2)
        RETURNING id, blocking_task_id AS "blockingTaskId", blocked_task_id AS "blockedTaskId", created_at AS "createdAt"`,
        [blockingTaskId, blockedTaskId]
        );

        return res.rows[0];
    }

    static async removeDependency(dependencyId: string) {
        await query(`DELETE FROM task_dependencies WHERE id = $1`, [dependencyId]);
    }
}