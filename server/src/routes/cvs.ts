/**
 * cvs.ts
 * -----------------------------------------------
 * CV data CRUD routes for cross-device sync.
 *   POST   /api/cvs          — create/upsert
 *   GET    /api/cvs          — list by user
 *   GET    /api/cvs/:id      — get by id
 *   DELETE /api/cvs/:id      — delete
 * -----------------------------------------------
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCVsByUser, getCV, upsertCV, deleteCV } from '../db';

const router = Router();

/**
 * POST /api/cvs
 * Body: { id?, title, data }
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const userId = req.userId!;
    const { id, title, data } = req.body;

    const cvId = id || uuidv4();
    const cvTitle = title || 'Untitled';
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data || {});

    if (dataStr.length > 500 * 1024) {
      res.status(413).json({ ok: false, error: 'CV data too large (max 500KB)' });
      return;
    }

    upsertCV(cvId, userId, cvTitle, dataStr);
    console.info(`[CVs] upserted cv=${cvId} user=${userId} title="${cvTitle}"`);

    res.status(201).json({
      ok: true,
      id: cvId,
      savedAt: Date.now(),
    });
  } catch (err: any) {
    console.error('[CVs] create error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to save CV' });
  }
});

/**
 * GET /api/cvs
 * Returns all CVs for the authenticated user
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const userId = req.userId!;
    const rows = getCVsByUser(userId);

    const cvs = rows.map(row => {
      let data;
      try { data = JSON.parse(row.data); } catch { data = null; }
      return {
        id: row.id,
        title: row.title,
        data,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    res.json({ ok: true, cvs });
  } catch (err: any) {
    console.error('[CVs] list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to list CVs' });
  }
});

/**
 * GET /api/cvs/:id
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const row = getCV(req.params.id);

    if (!row) {
      res.status(404).json({ ok: false, error: 'CV not found' });
      return;
    }

    if (row.user_id !== req.userId) {
      res.status(403).json({ ok: false, error: 'Access denied' });
      return;
    }

    let data;
    try { data = JSON.parse(row.data); } catch { data = null; }

    res.json({
      ok: true,
      cv: {
        id: row.id,
        title: row.title,
        data,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err: any) {
    console.error('[CVs] get error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to get CV' });
  }
});

/**
 * DELETE /api/cvs/:id
 */
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const row = getCV(req.params.id);

    if (!row) {
      res.status(404).json({ ok: false, error: 'CV not found' });
      return;
    }

    if (row.user_id !== req.userId) {
      res.status(403).json({ ok: false, error: 'Access denied' });
      return;
    }

    deleteCV(row.id);
    console.info(`[CVs] deleted cv=${row.id}`);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[CVs] delete error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to delete CV' });
  }
});

export default router;
