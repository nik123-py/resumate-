/**
 * auth.ts
 * -----------------------------------------------
 * Authentication middleware.
 * Validates x-resumate-token header against the
 * shared auth token. For hackathon simplicity,
 * also auto-creates users on first request.
 * -----------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { findUserByToken, upsertUser } from '../db';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userName?: string;
      userEmail?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-resumate-token'] as string | undefined;

  if (!token) {
    res.status(401).json({ ok: false, error: 'Missing x-resumate-token header' });
    return;
  }

  // For hackathon: accept the shared token OR per-user tokens
  if (token === config.authToken) {
    // Shared token — use x-resumate-user-id and x-resumate-user-email headers
    const userId = req.headers['x-resumate-user-id'] as string || 'anonymous';
    const userName = req.headers['x-resumate-user-name'] as string || 'Anonymous';
    const userEmail = req.headers['x-resumate-user-email'] as string || 'anon@resumate.local';

    // Auto-create/update user record
    upsertUser(userId, userName, userEmail, token);

    req.userId = userId;
    req.userName = userName;
    req.userEmail = userEmail;
    next();
    return;
  }

  // Try per-user token lookup
  const user = findUserByToken(token);
  if (!user) {
    res.status(403).json({ ok: false, error: 'Invalid token' });
    return;
  }

  req.userId = user.id;
  req.userName = user.name;
  req.userEmail = user.email;
  next();
}
