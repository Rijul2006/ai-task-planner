import { query } from '../db/index.js';

export type ResourceType = 'board' | 'task';

/**
 * Independent Authorization Checker
 * Ensures user has explicit access rights before any resource query or AI tool execution.
 */
export const authorize = async (
    userId: string,
    resourceType: ResourceType,
    resourceId: string
): Promise<boolean> => {
if (!userId || !resourceId) return false;

if (resourceType === 'board') {
    const res = await query(
        `SELECT b.id
         FROM boards b
         JOIN board_members bm ON bm.board_id = b.id
         WHERE b.id = $1 AND bm.user_id = $2 AND b.archived_at IS NULL`,
        [resourceId, userId]
    );
    return (res.rowCount ?? 0) > 0;
}

if (resourceType === 'task') {
    const res = await query(
        `SELECT t.id
        FROM tasks t
        JOIN boards b ON t.board_id = b.id
        JOIN board_members bm ON bm.board_id = b.id
        WHERE t.id = $1 AND bm.user_id = $2 AND b.archived_at IS NULL`,
        [resourceId, userId]
    );
    return (res.rowCount ?? 0) > 0;
}

return false;
};