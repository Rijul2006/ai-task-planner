import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import pool, { query } from '../db/index.js';
import { SignupInput, LoginInput } from '../schemas/auth.schema.js';
import { getSessionSecret } from '../config/env.js';

export class AuthService {
  static async signup(input: SignupInput) {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const email = input.email.toLowerCase();
      const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
      if ((existing.rowCount ?? 0) > 0) {
        throw { status: 400, code: 'USER_EXISTS', message: 'User with this email already exists' };
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name AS "displayName", created_at AS "createdAt"`,
        [email, passwordHash, input.displayName]
      );

      const user = userRes.rows[0];
      const boardRes = await client.query(
        `INSERT INTO boards (owner_id, name, description)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, 'Program Workspace', 'Main Sprint Board']
      );
      await client.query(
        `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
        [boardRes.rows[0].id, user.id]
      );

      const token = AuthService.generateToken(user.id);
      await AuthService.createSessionRecord(user.id, token, client);

      await client.query('COMMIT');
      return { user, token };
    } catch (err) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  static async login(input: LoginInput) {
    const userRes = await query(
      `SELECT id, email, password_hash AS "passwordHash", display_name AS "displayName"
      FROM users WHERE email = $1`,
      [input.email.toLowerCase()]
    );

    if (userRes.rowCount === 0) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    const user = userRes.rows[0];
    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    const client = await pool.connect();
    const token = AuthService.generateToken(user.id);
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [user.id]);
      const boards = await client.query(
        `SELECT 1
         FROM board_members bm
         JOIN boards b ON b.id = bm.board_id
         WHERE bm.user_id = $1 AND b.archived_at IS NULL
         LIMIT 1`,
        [user.id]
      );

      if (boards.rowCount === 0) {
        const board = await client.query(
          `INSERT INTO boards (owner_id, name, description)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [user.id, 'Program Workspace', 'Main Sprint Board']
        );
        await client.query(
          `INSERT INTO board_members (board_id, user_id, role)
           VALUES ($1, $2, 'OWNER')`,
          [board.rows[0].id, user.id]
        );
      }

      await AuthService.createSessionRecord(user.id, token, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      user: { id: user.id, email: user.email, displayName: user.displayName },
      token,
    };
  }

  static async logout(userId: string, token: string | undefined): Promise<void> {
    if (!token) return;
    const sessions = await query(
      `SELECT id, token_hash FROM sessions WHERE user_id = $1 AND expires_at > NOW()`,
      [userId]
    );
    const tokenHash = createHash('sha256').update(token).digest('hex');
    for (const session of sessions.rows) {
      if (session.token_hash === tokenHash || await bcrypt.compare(token, session.token_hash)) {
        await query(`DELETE FROM sessions WHERE id = $1`, [session.id]);
        return;
      }
    }
  }

  private static generateToken(userId: string): string {
    return jwt.sign({ userId, jti: randomUUID() }, getSessionSecret(), { expiresIn: '7d' });
  }

  private static async createSessionRecord(
    userId: string,
    token: string,
    client?: PoolClient
  ) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const statement = `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`;
    const params = [userId, tokenHash, expiresAt];
    if (client) {
      await client.query(statement, params);
    } else {
      await query(statement, params);
    }
  }
}