/**
 * reminderScheduler.ts
 * -----------------------------------------------
 * Background scheduler that checks for due
 * reminders at a configurable interval.
 * Marks them as sent and logs for dashboard query.
 * -----------------------------------------------
 */

import cron from 'node-cron';
import { getDueReminders, markReminderSent, getApplication } from '../db';
import { config } from '../config';

let isRunning = false;

/**
 * Process all due reminders.
 * In production this would send emails/push notifications.
 * For hackathon, it marks them as "sent" so the client
 * can query /api/reminders/due and show UI nudges.
 */
function processReminders() {
  if (isRunning) return;
  isRunning = true;

  try {
    const dueReminders = getDueReminders();

    if (dueReminders.length === 0) {
      isRunning = false;
      return;
    }

    console.info(`[Scheduler] processing ${dueReminders.length} due reminders`);

    for (const reminder of dueReminders) {
      try {
        const app = getApplication(reminder.app_id);
        let appData: any = {};
        if (app) {
          try { appData = JSON.parse(app.data); } catch { /* ignore */ }
        }

        // Log the reminder (in production, send email/push)
        console.info(
          `[Scheduler] REMINDER DUE: app=${reminder.app_id} ` +
          `user=${reminder.user_id} ` +
          `job="${appData.jobTitle || 'Unknown'}" ` +
          `company="${appData.company || 'Unknown'}" ` +
          `scheduled=${new Date(reminder.remind_at).toISOString()}`
        );

        // Mark as processed — client will see it via GET /api/reminders/due
        // We intentionally DON'T mark as sent here so client can still fetch it.
        // The client calls POST /api/reminders/:id/dismiss when user acknowledges.
        // But if a reminder is very old (>48h past due), auto-dismiss it.
        const age = Date.now() - reminder.remind_at;
        if (age > 48 * 60 * 60 * 1000) {
          markReminderSent(reminder.id);
          console.info(`[Scheduler] auto-dismissed stale reminder id=${reminder.id}`);
        }
      } catch (err: any) {
        console.error(`[Scheduler] error processing reminder ${reminder.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[Scheduler] error:', err.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the reminder scheduler.
 * Runs every minute by default.
 */
export function startReminderScheduler() {
  const intervalSec = config.reminderCheckInterval;

  // Run immediately on start
  processReminders();

  // Schedule periodic checks
  // node-cron syntax: every N seconds
  const cronExpr = `*/${Math.max(1, Math.min(59, intervalSec))} * * * * *`;

  const task = cron.schedule(cronExpr, () => {
    processReminders();
  });

  console.info(`[Scheduler] started — checking every ${intervalSec}s`);

  return task;
}

/**
 * Run a single check (useful for testing).
 */
export function runOnce() {
  processReminders();
}
