/**
 * applications.ts
 * -----------------------------------------------
 * Application tracking CRUD routes.
 *   POST   /api/applications         — create
 *   GET    /api/applications         — list by user
 *   GET    /api/applications/:id     — get by id
 *   PUT    /api/applications/:id     — update
 *   DELETE /api/applications/:id     — delete
 * -----------------------------------------------
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getApplicationsByUser,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  createReminder,
  deleteRemindersByApp,
} from '../db';

const router = Router();

const REMINDER_OFFSET_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * POST /api/applications
 * Body: ApplicationRecord partial
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const userId = req.userId!;
    const body = req.body;

    const id = body.id || uuidv4();
    const cvId = body.cvId || null;
    const status = body.status || 'in_progress';
    const remindAt = status === 'in_progress' ? Date.now() + REMINDER_OFFSET_MS : null;

    const dataStr = JSON.stringify({
      ...body,
      id,
      userId,
      cvId,
      status,
      lastEditedAt: Date.now(),
    });

    createApplication(id, userId, cvId, dataStr, status, remindAt);

    // Schedule reminder if in-progress
    if (remindAt) {
      createReminder(uuidv4(), id, userId, remindAt);
      console.info(`[Applications] reminder scheduled for app=${id} at=${new Date(remindAt).toISOString()}`);
    }

    console.info(`[Applications] created app=${id} user=${userId} status=${status}`);

    res.status(201).json({
      ok: true,
      id,
      remindAt,
    });
  } catch (err: any) {
    console.error('[Applications] create error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to create application' });
  }
});

/**
 * GET /api/applications
 * Query: ?userId=... (optional, defaults to authenticated user)
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || req.userId!;

    // Only allow fetching own applications
    if (userId !== req.userId) {
      res.status(403).json({ ok: false, error: 'Cannot access other user applications' });
      return;
    }

    const rows = getApplicationsByUser(userId);

    const applications = rows.map(row => {
      let data;
      try { data = JSON.parse(row.data); } catch { data = null; }
      return {
        id: row.id,
        cvId: row.cv_id,
        status: row.status,
        remindAt: row.remind_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...data,
      };
    });

    res.json({ ok: true, applications });
  } catch (err: any) {
    console.error('[Applications] list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to list applications' });
  }
});

/**
 * GET /api/applications/:id
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const row = getApplication(req.params.id);

    if (!row) {
      res.status(404).json({ ok: false, error: 'Application not found' });
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
      application: {
        id: row.id,
        cvId: row.cv_id,
        status: row.status,
        remindAt: row.remind_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...data,
      },
    });
  } catch (err: any) {
    console.error('[Applications] get error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to get application' });
  }
});

/**
 * PUT /api/applications/:id
 * Body: partial ApplicationRecord
 */
router.put('/:id', (req: Request, res: Response): void => {
  try {
    const row = getApplication(req.params.id);

    if (!row) {
      res.status(404).json({ ok: false, error: 'Application not found' });
      return;
    }

    if (row.user_id !== req.userId) {
      res.status(403).json({ ok: false, error: 'Access denied' });
      return;
    }

    let existingData;
    try { existingData = JSON.parse(row.data); } catch { existingData = {}; }

    const merged = {
      ...existingData,
      ...req.body,
      id: row.id,
      userId: row.user_id,
      lastEditedAt: Date.now(),
    };

    const status = req.body.status || row.status;
    let remindAt: number | null = row.remind_at;

    // Reschedule reminder on status change
    if (req.body.status) {
      deleteRemindersByApp(row.id);
      if (status === 'in_progress') {
        remindAt = Date.now() + REMINDER_OFFSET_MS;
        createReminder(uuidv4(), row.id, req.userId!, remindAt);
        console.info(`[Applications] reminder rescheduled for app=${row.id}`);
      } else {
        remindAt = null;
      }
    }

    updateApplication(row.id, JSON.stringify(merged), status, remindAt);
    console.info(`[Applications] updated app=${row.id} status=${status}`);

    res.json({ ok: true, id: row.id, status, remindAt });
  } catch (err: any) {
    console.error('[Applications] update error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update application' });
  }
});

/**
 * DELETE /api/applications/:id
 */
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const row = getApplication(req.params.id);

    if (!row) {
      res.status(404).json({ ok: false, error: 'Application not found' });
      return;
    }

    if (row.user_id !== req.userId) {
      res.status(403).json({ ok: false, error: 'Access denied' });
      return;
    }

    deleteRemindersByApp(row.id);
    deleteApplication(row.id);
    console.info(`[Applications] deleted app=${row.id}`);

    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Applications] delete error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to delete application' });
  }
});

export default router;
