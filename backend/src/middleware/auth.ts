import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { getSessionSecret } from '../config/env.js';

interface JwtPayload {
    userId: string;
}

export const authenticateSession = async (
    req: Request,
    res: Response,
    next: NextFunction
    ): Promise<void> => {
    try {
        // 1. Get token from Authorization header or cookies
        const authHeader = req.headers.authorization;
        let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

        if (!token && req.cookies) {
        token = req.cookies.session_token;
        }

        if (!token) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication session token required' });
        return;
        }

        // 2. Verify JWT signature
        const decoded = jwt.verify(token, getSessionSecret()) as JwtPayload;

        // 3. Verify session exists in DB and is not expired
        const sessionRes = await query(
        `SELECT s.id, s.token_hash, s.user_id, u.email, u.display_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id = $1 AND s.expires_at > NOW()`,
        [decoded.userId]
        );

        const tokenHash = createHash('sha256').update(token).digest('hex');
        let validSession = false;
        for (const session of sessionRes.rows) {
            if (session.token_hash === tokenHash || await bcrypt.compare(token, session.token_hash)) {
                validSession = true;
                break;
            }
        }

        if (!validSession) {
        res.status(401).json({ error: 'INVALID_SESSION', message: 'Session expired or invalid' });
        return;
        }

        const userData = sessionRes.rows[0];

        // 4. Attach user payload to Express request
        req.user = {
        id: userData.user_id,
        email: userData.email,
        displayName: userData.display_name,
        };
        req.sessionToken = token;

        next();
    } catch (err) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token authentication failed' });
    }
};