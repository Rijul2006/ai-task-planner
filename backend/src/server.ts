import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.route.js';
import boardsRoutes from './routes/boards.route.js';
import tasksRoutes from './routes/tasks.route.js';
import dependenciesRoutes from './routes/dependencies.route.js';
import aiRoutes from './routes/ai.route.js';
import { initializeDatabaseSchema } from './db/index.js';
import { getSessionSecret } from './config/env.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Global Middlewares
app.use(cookieParser());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api', dependenciesRoutes);
app.use('/api/ai', aiRoutes);

// Legacy root routes remain available for existing clients.
app.use('/auth', authRoutes);
app.use('/boards', boardsRoutes);
app.use('/tasks', tasksRoutes);
app.use('/', dependenciesRoutes);
app.use('/ai', aiRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: err.message || 'An unexpected error occurred' });
});

const startServer = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL must be configured');
    }
    getSessionSecret();
    await initializeDatabaseSchema();
    app.listen(PORT, () => {
        console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
    });
};

startServer().catch((err: unknown) => {
    console.error('Failed to initialize PostgreSQL schema:', err);
    process.exit(1);
});