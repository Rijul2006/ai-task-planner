import { z } from 'zod';

export const CreateTaskSchema = z.object({
    title: z.string().trim().min(1, 'Task title is required'),
    description: z.string().nullable().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    dueDate: z.string().optional(),
    assigneeId: z.string().uuid().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();