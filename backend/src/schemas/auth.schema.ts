import { z } from 'zod';

export const SignupSchema = z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    displayName: z.string().min(2, 'Display name must be at least 2 characters'),
});

export const LoginSchema = z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(1, 'Password is required'),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;