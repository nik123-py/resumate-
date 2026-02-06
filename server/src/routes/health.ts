/**
 * health.ts
 * -----------------------------------------------
 * Health check and status endpoint.
 * No auth required — used for uptime checks
 * and frontend availability detection.
 * -----------------------------------------------
 */

import { Router, Request, Response } from 'express';
import { getDB } from '../db';

const router = Router();

/**
 * GET /api/health
 * Returns server status, uptime, DB status
 */
router.get('/', (_req: Request, res: Response): void => {
  let dbOk = false;
  try {
    const row = getDB().prepare('SELECT 1 as ok').get() as any;
    dbOk = row?.ok === 1;
  } catch {
    dbOk = false;
  }

  res.json({
    ok: true,
    status: 'running',
    uptime: Math.round(process.uptime()),
    db: dbOk ? 'connected' : 'error',
    timestamp: Date.now(),
    version: '1.0.0',
    seed: 'spine-hangar',
  });
});

export default router;
