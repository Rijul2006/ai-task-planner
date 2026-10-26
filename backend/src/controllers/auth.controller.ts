import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { SignupSchema, LoginSchema } from '../schemas/auth.schema.js';

export const signupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = SignupSchema.parse(req.body);
    const result = await AuthService.signup(validated);

    res.cookie('session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ data: { user: result.user } });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: err.issues[0]?.message || 'Invalid registration details' });
      return;
    }
    res.status(err.status || 500).json({
      error: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Registration failed',
    });
  }
};

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = LoginSchema.parse(req.body);
    const result = await AuthService.login(validated);

    res.cookie('session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ data: result });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: err.issues[0]?.message || 'Invalid login details' });
      return;
    }
    res.status(err.status || 500).json({
      error: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Login failed',
    });
  }
};

export const getMeHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
      return;
    }
    res.json({ data: { user: req.user } });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

export const logoutHandler = async (req: Request, res: Response) => {
  try {
    if (req.user) {
      await AuthService.logout(req.user.id, req.sessionToken);
    }
    res.clearCookie('session_token');
    res.json({ data: { message: 'Logged out successfully' } });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};