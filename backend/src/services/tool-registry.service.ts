import { authorize } from '../middleware/authorize.js';
import { TasksService } from './tasks.service.js';

export interface ToolDefinition {
    name: string;
    isWrite: boolean;
    execute: (userId: string, args: any) => Promise<any>;
}

export const toolsRegistry: Record<string, ToolDefinition> = {
    get_tasks: {
        name: 'get_tasks',
        isWrite: false,
        execute: async (userId: string, args: { boardId: string }) => {
        const hasAccess = await authorize(userId, 'board', args.boardId);
        if (!hasAccess) throw new Error('Unauthorized board access');
        return await TasksService.listTasksByBoard(args.boardId);
        },
    },
    update_task: {
        name: 'update_task',
        isWrite: true, // Requires Human Approval
        execute: async (userId: string, args: { taskId: string; patch: any }) => {
        const hasAccess = await authorize(userId, 'task', args.taskId);
        if (!hasAccess) throw new Error('Unauthorized task access');
        return await TasksService.updateTask(userId, args.taskId, args.patch);
        },
    },
};