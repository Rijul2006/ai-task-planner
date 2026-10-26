import { Request, Response } from 'express';
import { DependenciesService } from '../services/dependencies.service.js';
import { ActivityService } from '../services/activity.service.js';
import { authorize } from '../middleware/authorize.js';

export const addDependencyHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
        return;
        }

        const taskId = req.params.taskId as string;
        const blockedTaskId = req.body.blockedTaskId as string;

        if (!taskId || !blockedTaskId) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Both taskId and blockedTaskId are required' });
        return;
        }

        const hasAccess1 = await authorize(req.user.id, 'task', taskId);
        const hasAccess2 = await authorize(req.user.id, 'task', blockedTaskId);

        if (!hasAccess1 || !hasAccess2) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied to tasks' });
        return;
        }

        const dep = await DependenciesService.addDependency(taskId, blockedTaskId);

        // Record audit event
        await ActivityService.record({
        taskId,
        event: 'dependency_added',
        actorType: 'USER',
        actorId: req.user.id,
        newValue: { blockedTaskId },
        });

        res.status(201).json({ data: { dependency: dep } });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.code || 'INTERNAL_ERROR', message: err.message || 'Server error' });
    }
};