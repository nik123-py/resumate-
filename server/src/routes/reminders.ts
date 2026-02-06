/**
 * reminders.ts
 * -----------------------------------------------
 * Reminder management routes.
 *   POST /api/reminders/schedule    — schedule new
 *   GET  /api/reminders             — list user reminders
 *   GET  /api/reminders/due         — get due reminders
 *   POST /api/reminders/:id/dismiss — mark as sent/read
 * -----------------------------------------------
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getRemindersByUser,
  getDueRemindersByUser,
  createReminder,
  markReminderSent,
  getApplication,
} from '../db';

const router = Router();

/**
 * POST /api/reminders/schedule
 * Body: { appId, remindAt }
 */
router.post('/schedule', (req: Request, res: Response): void => {
  try {
    const { appId, remindAt } = req.body;
    const userId = req.userId!;

    if (!appId) {
      res.status(400).json({ ok: false, error: 'appId is required' });
      return;
    }

    // Verify application exists and belongs to user
    const app = getApplication(appId);
    if (!app) {
      res.status(404).json({ ok: false, error: 'Application not found' });
      return;
    }
    if (app.user_id !== userId) {
      res.status(403).json({ ok: false, error: 'Access denied' });
      return;
    }

    const actualRemindAt = remindAt || (Date.now() + 24 * 60 * 60 * 1000);
    const id = uuidv4();

    createReminder(id, appId, userId, actualRemindAt);

    console.info(`[Reminders] scheduled id=${id} app=${appId} at=${new Date(actualRemindAt).toISOString()}`);

    res.status(201).json({
      ok: true,
      id,
      remindAt: actualRemindAt,
    });
  } catch (err: any) {
    console.error('[Reminders] schedule error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to schedule reminder' });
  }
});

/**
 * GET /api/reminders
 * Returns all reminders for the authenticated user
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const userId = req.userId!;
    const rows = getRemindersByUser(userId);

    const reminders = rows.map(row => ({
      id: row.id,
      appId: row.app_id,
      remindAt: row.remind_at,
      sent: !!row.sent,
      createdAt: row.created_at,
    }));

    res.json({ ok: true, reminders });
  } catch (err: any) {
    console.error('[Reminders] list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to list reminders' });
  }
});

/**
 * GET /api/reminders/due
 * Returns only due (unsent, past time) reminders with application data
 */
router.get('/due', (req: Request, res: Response): void => {
  try {
    const userId = req.userId!;
    const rows = getDueRemindersByUser(userId);

    const dueReminders = rows.map(row => {
      let appData;
      try { appData = JSON.parse(row.app_data); } catch { appData = null; }
      return {
        id: row.id,
        appId: row.app_id,
        remindAt: row.remind_at,
        createdAt: row.created_at,
        application: appData,
      };
    });

    res.json({
      ok: true,
      dueReminders,
      count: dueReminders.length,
    });
  } catch (err: any) {
    console.error('[Reminders] due error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to get due reminders' });
  }
});

/**
 * POST /api/reminders/:id/dismiss
 * Mark a reminder as sent/dismissed
 */
router.post('/:id/dismiss', (req: Request, res: Response): void => {
  try {
    markReminderSent(req.params.id);
    console.info(`[Reminders] dismissed id=${req.params.id}`);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Reminders] dismiss error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to dismiss reminder' });
  }
});

export default router;
