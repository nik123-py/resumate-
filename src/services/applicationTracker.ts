/**
 * applicationTracker.ts
 * -----------------------------------------------
 * Tracks job applications the user is working on.
 * Stores in localStorage with backend sync when
 * available. Provides reminder logic for stale
 * (>24h) in-progress applications.
 * -----------------------------------------------
 * spine-hangar application context tracking
 */

import {
  isBackendAvailable,
  createApplicationOnBackend,
  updateApplicationOnBackend,
  deleteApplicationFromBackend,
  listApplicationsFromBackend,
  getDueReminders as fetchDueReminders,
  dismissReminder,
} from './apiClient';

// -- Types --

export interface ApplicationRecord {
  id: string;
  jobTitle: string;
  company: string;
  sourceUrl: string;
  status: 'in_progress' | 'submitted' | 'abandoned';
  lastEditedAt: number;
  lastFocusedField?: string;
  notes: string;
  remindAt?: number;
  createdAt: number;
}

// -- Constants --
const STORAGE_KEY_PREFIX = 'resumate_apps_';
const REMINDER_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a simple unique ID.
 */
function generateId(): string {
  return `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// -----------------------------------------------
// ApplicationTracker Service
// -----------------------------------------------

class ApplicationTracker {
  private userId: string = 'default';

  private get storageKey(): string {
    return `${STORAGE_KEY_PREFIX}${this.userId}`;
  }

  /**
   * Set the current user context.
   */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /**
   * Get all application records.
   */
  getAll(): ApplicationRecord[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get a single application by ID.
   */
  getById(id: string): ApplicationRecord | null {
    return this.getAll().find(a => a.id === id) ?? null;
  }

  /**
   * Create a new application record.
   * Also syncs to backend if available.
   */
  create(data: Omit<ApplicationRecord, 'id' | 'createdAt' | 'lastEditedAt'>): ApplicationRecord {
    const record: ApplicationRecord = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
      lastEditedAt: Date.now(),
      remindAt: data.status === 'in_progress'
        ? Date.now() + REMINDER_DELAY_MS
        : undefined,
    };

    const all = this.getAll();
    all.push(record);
    this.persist(all);

    // Backend sync (non-blocking)
    if (isBackendAvailable()) {
      createApplicationOnBackend(record)
        .then(result => {
          if (result?.ok) {
            console.info('[ApplicationTracker] synced create to backend', { id: record.id });
          }
        })
        .catch(() => {});
    }

    console.info('[ApplicationTracker] created', { id: record.id, company: record.company });
    return record;
  }

  /**
   * Update an existing application.
   * Also syncs to backend if available.
   */
  update(id: string, patch: Partial<ApplicationRecord>): ApplicationRecord | null {
    const all = this.getAll();
    const idx = all.findIndex(a => a.id === id);
    if (idx === -1) return null;

    all[idx] = {
      ...all[idx],
      ...patch,
      lastEditedAt: Date.now(),
    };

    // Reschedule reminder if still in_progress
    if (all[idx].status === 'in_progress') {
      all[idx].remindAt = Date.now() + REMINDER_DELAY_MS;
    } else {
      all[idx].remindAt = undefined;
    }

    this.persist(all);

    // Backend sync (non-blocking)
    if (isBackendAvailable()) {
      updateApplicationOnBackend(id, all[idx])
        .then(result => {
          if (result?.ok) {
            console.info('[ApplicationTracker] synced update to backend', { id });
          }
        })
        .catch(() => {});
    }

    console.info('[ApplicationTracker] updated', { id });
    return all[idx];
  }

  /**
   * Remove an application.
   * Also deletes from backend if available.
   */
  remove(id: string): void {
    const all = this.getAll().filter(a => a.id !== id);
    this.persist(all);

    // Backend sync (non-blocking)
    if (isBackendAvailable()) {
      deleteApplicationFromBackend(id).catch(() => {});
    }

    console.info('[ApplicationTracker] removed', { id });
  }

  /**
   * Sync applications from backend.
   * Merges backend records with local, preferring newer timestamps.
   */
  async syncFromBackend(): Promise<void> {
    if (!isBackendAvailable()) return;

    try {
      const result = await listApplicationsFromBackend();
      if (!result?.ok || !result.applications) return;

      const localApps = this.getAll();
      const localMap = new Map(localApps.map(a => [a.id, a]));
      let changed = false;

      for (const backendApp of result.applications) {
        const local = localMap.get(backendApp.id);
        if (!local || (backendApp.lastEditedAt || 0) > (local.lastEditedAt || 0)) {
          localMap.set(backendApp.id, backendApp);
          changed = true;
        }
      }

      if (changed) {
        this.persist(Array.from(localMap.values()));
        console.info('[ApplicationTracker] synced from backend', {
          count: result.applications.length,
        });
      }
    } catch (err) {
      console.warn('[ApplicationTracker] backend sync failed:', err);
    }
  }

  /**
   * Get due reminders from backend (server-managed reminders).
   * Falls back to local check if backend is unavailable.
   */
  async getBackendDueReminders(): Promise<any[]> {
    if (!isBackendAvailable()) return [];

    try {
      const result = await fetchDueReminders();
      return result?.dueReminders || [];
    } catch {
      return [];
    }
  }

  /**
   * Dismiss a backend reminder.
   */
  async dismissBackendReminder(reminderId: string): Promise<void> {
    if (!isBackendAvailable()) return;

    try {
      await dismissReminder(reminderId);
      console.info('[ApplicationTracker] dismissed backend reminder', { reminderId });
    } catch { /* ignore */ }
  }

  /**
   * Get applications that have pending reminders (past due).
   */
  getPendingReminders(): ApplicationRecord[] {
    const now = Date.now();
    return this.getAll().filter(
      a => a.status === 'in_progress' && a.remindAt && a.remindAt <= now
    );
  }

  /**
   * Get in-progress applications count.
   */
  getInProgressCount(): number {
    return this.getAll().filter(a => a.status === 'in_progress').length;
  }

  private persist(records: ApplicationRecord[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (err) {
      console.error('[ApplicationTracker] persist failed', err);
    }
  }
}

// Export singleton
export const applicationTracker = new ApplicationTracker();
