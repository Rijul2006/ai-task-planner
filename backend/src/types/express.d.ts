import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
        user?: {
            id: string;
            email: string;
            displayName: string;
        };
        sessionToken?: string;
        boardRole?: 'OWNER' | 'MEMBER' | 'VIEWER';
        }
    }
}