import { z } from 'zod';

export const CreateBoardSchema = z.object({
    name: z.string().min(1, 'Board name is required'),
});

export const UpdateBoardSchema = z.object({
    name: z.string().min(1, 'Board name is required').optional(),
});