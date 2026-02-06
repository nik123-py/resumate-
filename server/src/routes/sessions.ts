/**
 * sessions.ts
 * -----------------------------------------------
 * Session CRUD routes.
 *   POST /api/sessions/:cvId/save  — upsert session
 *   GET  /api/sessions/:cvId       — get session
 *   GET  /api/sessions             — list user sessions
 *   DELETE /api/sessions/:cvId     — delete session
 * -----------------------------------------------
 */

import { Router, Request, Response } from 'express';
import { getSession, getSessionsByUser, upsertSession, deleteSession } from '../db';

const router = Router();

/**
 * POST /api/sessions/:cvId/save
 * Body: SessionState JSON
 */
router.post('/:cvId/save', (req: Request, res: Response): void => {
  try {
    const { cvId } = req.params;
    const userId = req.userId!;
    const body = req.body;

    if (!cvId) {
      res.status(400).json({ ok: false, error: 'cvId is required' });
      return;
    }

    // Validate payload size (max 200KB)
    const dataStr = JSON.stringify(body);
    if (dataStr.length > 200 * 1024) {
      res.status(413).json({ ok: false, error: 'Payload too large (max 200KB)' });
      return;
    }

    upsertSession(cvId, userId, dataStr);
    const savedAt = Date.now();

    console.info(`[Sessions] saved session for cv=${cvId} user=${userId} at=${savedAt}`);

    res.json({
      ok: true,
      savedAt,
      cvId,
    });
  } catch (err: any) {
    console.error('[Sessions] save error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to save session' });
  }
});

/**
 * GET /api/sessions/:cvId
 * Returns session data for a specific CV
 */
router.get('/:cvId', (req: Request, res: Response): void => {
  try {
    const { cvId } = req.params;
    const row = getSession(cvId);

    if (!row) {
      res.json({ ok: true, session: null });
      return;
    }

    // Verify ownership
    if (row.user_id !== req.userId) {
      res.status(403).json({ ok: false, error: 'Session belongs to another user' });
      return;
    }

    let sessionData;
    try {
      sessionData = JSON.parse(row.data);
    } catch {
      sessionData = null;
    }

    res.json({
      ok: true,
      session: sessionData,
      updatedAt: row.updated_at,
    });
  } catch (err: any) {
    console.error('[Sessions] get error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to retrieve session' });
  }
});

/**
 * GET /api/sessions
 * Returns all sessions for the authenticated user
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const userId = req.userId!;
    const rows = getSessionsByUser(userId);

    const sessions = rows.map(row => {
      let data;
      try { data = JSON.parse(row.data); } catch { data = null; }
      return {
        cvId: row.cv_id,
        data,
        updatedAt: row.updated_at,
      };
    });

    res.json({ ok: true, sessions });
  } catch (err: any) {
    console.error('[Sessions] list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to list sessions' });
  }
});

/**
 * DELETE /api/sessions/:cvId
 * Deletes session for a specific CV
 */
router.delete('/:cvId', (req: Request, res: Response): void => {
  try {
    const { cvId } = req.params;
    const row = getSession(cvId);

    if (row && row.user_id !== req.userId) {
      res.status(403).json({ ok: false, error: 'Session belongs to another user' });
      return;
    }

    deleteSession(cvId);
    console.info(`[Sessions] deleted session for cv=${cvId}`);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Sessions] delete error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to delete session' });
  }
});

export default router;
