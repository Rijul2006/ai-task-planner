import { query } from '../db/index.js';

export class BoardsService {
    static async listUserBoards(userId: string) {
        const res = await query(
        `SELECT id, owner_id AS "ownerId", name, created_at AS "createdAt", updated_at AS "updatedAt"
        FROM boards
        WHERE owner_id = $1 AND archived_at IS NULL
        ORDER BY created_at DESC`,
        [userId]
        );
        return res.rows;
    }

    static async createBoard(userId: string, name: string) {
        const res = await query(
        `INSERT INTO boards (owner_id, name)
        VALUES ($1, $2)
        RETURNING id, owner_id AS "ownerId", name, created_at AS "createdAt"`,
        [userId, name]
        );
        return res.rows[0];
    }

    static async getBoardById(userId: string, boardId: string) {
        const res = await query(
        `SELECT id, owner_id AS "ownerId", name, created_at AS "createdAt"
        FROM boards
        WHERE id = $1 AND owner_id = $2 AND archived_at IS NULL`,
        [boardId, userId]
        );
        return res.rows[0] || null;
    }

    static async archiveBoard(userId: string, boardId: string) {
        await query(
            `UPDATE boards SET archived_at = NOW() WHERE id = $1 AND owner_id = $2`,
            [boardId, userId]
        );
    }
}