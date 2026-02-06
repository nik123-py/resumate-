/**
 * sessionService.ts
 * -----------------------------------------------
 * Core singleton for session tracking. No React
 * dependency -- pure TypeScript service that
 * captures session data and persists to localStorage.
 * Also syncs to the backend when available.
 * -----------------------------------------------
 * spine-hangar session intelligence layer
 */

import {
  isBackendAvailable,
  saveSessionToBackend,
  getSessionFromBackend,
  deleteSessionFromBackend,
} from './apiClient';

// -- Type definitions --

export type InterruptionType =
  | 'tab_closed'
  | 'connectivity_lost'
  | 'idle_timeout'
  | 'device_switch'
  | 'voluntary_exit';

export interface GeminiMessage {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

export interface ActionLogEntry {
  ts: number;
  action: string;
  meta?: Record<string, unknown>;
}

export interface SessionTimestamps {
  sessionStart: number;
  lastActive: number;
  totalEditingTime: number;
}

export interface SessionState {
  cvId: string;
  activeSection?: string | null;
  lastCursorField?: string | null;
  scrollPosition?: number;
  unsavedDraftText?: Record<string, string>;
  aiConversationState?: {
    messages: GeminiMessage[];
    pendingPrompt?: string;
  };
  sessionTimestamps: SessionTimestamps;
  sectionCompletionMap: Record<string, number>;
  interruptionType?: InterruptionType | null;
  actionLog: ActionLogEntry[];
  deviceId: string;
}

// -- Event handler type --
type SessionChangeHandler = (state: SessionState) => void;

// -- Constants --
const AUTOSAVE_INTERVAL_MS = 10_000;          // 10 seconds
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;        // 5 minutes
const SESSION_EXPIRY_DAYS = 30;
const MAX_ACTION_LOG_ENTRIES = 50;

/**
 * Generate a persistent device identifier.
 * Stored in localStorage so it survives page reloads.
 */
function getOrCreateDeviceId(): string {
  const key = 'resumate_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

/**
 * Build the localStorage key for a given cvId.
 */
function storageKey(cvId: string): string {
  return `resumate_session_${cvId}`;
}

// -----------------------------------------------
// SessionService Singleton
// -----------------------------------------------

class SessionService {
  private state: SessionState | null = null;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: SessionChangeHandler[] = [];
  private deviceId: string;
  private boundBeforeUnload: () => void;
  private boundVisibilityChange: () => void;
  private boundOffline: () => void;
  private boundOnline: () => void;
  private boundUserActivity: () => void;
  private lastActivityTs: number = Date.now();

  constructor() {
    this.deviceId = getOrCreateDeviceId();

    // Bind event handlers
    this.boundBeforeUnload = this.onBeforeUnload.bind(this);
    this.boundVisibilityChange = this.onVisibilityChange.bind(this);
    this.boundOffline = this.onOffline.bind(this);
    this.boundOnline = this.onOnline.bind(this);
    this.boundUserActivity = this.onUserActivity.bind(this);
  }

  // -- Public API --

  /**
   * Try to load a more recent session from the backend.
   * If found, merge it into localStorage. Returns the
   * newer session or null if local is already up-to-date.
   */
  async tryBackendSync(cvId: string): Promise<SessionState | null> {
    if (!isBackendAvailable()) return null;

    try {
      const result = await getSessionFromBackend(cvId);
      if (result?.ok && result.session) {
        const backendSession: SessionState = result.session;
        const key = storageKey(cvId);
        const localRaw = localStorage.getItem(key);
        let localTs = 0;
        if (localRaw) {
          try {
            const local = JSON.parse(localRaw);
            localTs = local.sessionTimestamps?.lastActive || 0;
          } catch { /* ignore */ }
        }

        const backendTs = backendSession.sessionTimestamps?.lastActive || 0;
        if (backendTs > localTs) {
          console.info('[SessionService] backend session is newer, merging', {
            cvId,
            localTs: new Date(localTs).toISOString(),
            backendTs: new Date(backendTs).toISOString(),
          });
          localStorage.setItem(key, JSON.stringify(backendSession));
          return backendSession;
        }
      }
    } catch (err) {
      console.warn('[SessionService] backend sync failed:', err);
    }
    return null;
  }

  /**
   * Initialize or load a session for the given CV.
   * Attaches browser event listeners for interruption detection.
   */
  init(cvId: string): SessionState {
    const key = storageKey(cvId);
    const raw = localStorage.getItem(key);

    if (raw) {
      try {
        const parsed: SessionState = JSON.parse(raw);

        // Check expiry (30 days)
        const age = Date.now() - (parsed.sessionTimestamps?.lastActive ?? 0);
        if (age > SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
          console.info('[SessionService] session expired, clearing', { cvId });
          localStorage.removeItem(key);
        } else {
          // Detect device switch
          if (parsed.deviceId && parsed.deviceId !== this.deviceId) {
            parsed.interruptionType = 'device_switch';
            console.info('[SessionService] device switch detected', {
              oldDevice: parsed.deviceId,
              newDevice: this.deviceId,
            });
          }

          this.state = {
            ...parsed,
            deviceId: this.deviceId,
            sessionTimestamps: {
              ...parsed.sessionTimestamps,
              lastActive: Date.now(),
            },
          };

          this.attachListeners();
          this.scheduleAutosave();
          this.resetIdleTimer();

          console.info('[SessionService] loaded existing session', {
            cvId,
            lastActive: new Date(parsed.sessionTimestamps.lastActive).toISOString(),
          });

          return this.state;
        }
      } catch {
        console.warn('[SessionService] corrupt session data, resetting', { cvId });
        localStorage.removeItem(key);
      }
    }

    // Create fresh session
    this.state = {
      cvId,
      activeSection: null,
      lastCursorField: null,
      scrollPosition: 0,
      unsavedDraftText: {},
      aiConversationState: { messages: [], pendingPrompt: undefined },
      sessionTimestamps: {
        sessionStart: Date.now(),
        lastActive: Date.now(),
        totalEditingTime: 0,
      },
      sectionCompletionMap: {},
      interruptionType: null,
      actionLog: [],
      deviceId: this.deviceId,
    };

    this.attachListeners();
    this.scheduleAutosave();
    this.resetIdleTimer();
    this.saveNow('init');

    console.info('[SessionService] created new session', { cvId });
    return this.state;
  }

  /**
   * Get current session state (read-only snapshot).
   */
  get(): SessionState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Merge a partial update into session state.
   * Resets idle timer and schedules autosave.
   */
  setPatch(patch: Partial<SessionState>): void {
    if (!this.state) return;

    this.state = {
      ...this.state,
      ...patch,
      sessionTimestamps: {
        ...this.state.sessionTimestamps,
        ...(patch.sessionTimestamps || {}),
        lastActive: Date.now(),
      },
    };

    this.lastActivityTs = Date.now();
    this.scheduleAutosave();
    this.resetIdleTimer();
    this.notifyHandlers();
  }

  /**
   * Push an entry to the action log (kept to last N entries).
   */
  pushAction(action: string, meta?: Record<string, unknown>): void {
    if (!this.state) return;

    const entry: ActionLogEntry = { ts: Date.now(), action, meta };
    this.state.actionLog = [
      ...this.state.actionLog.slice(-(MAX_ACTION_LOG_ENTRIES - 1)),
      entry,
    ];

    this.notifyHandlers();
  }

  /**
   * Persist current state to localStorage immediately.
   * Also fire-and-forget sync to backend if available.
   */
  saveNow(reason: string = 'manual'): void {
    if (!this.state) return;

    // Update total editing time
    const now = Date.now();
    const elapsed = now - this.lastActivityTs;
    // Only count if user was active in the last 30s (not idle)
    if (elapsed < 30_000) {
      this.state.sessionTimestamps.totalEditingTime += elapsed;
    }
    this.state.sessionTimestamps.lastActive = now;

    const key = storageKey(this.state.cvId);
    try {
      localStorage.setItem(key, JSON.stringify(this.state));
      console.info('[SessionService] saved', {
        key,
        reason,
        ts: new Date(now).toISOString(),
        cvId: this.state.cvId,
      });
    } catch (err) {
      console.error('[SessionService] save failed', err);
    }

    // Backend sync (non-blocking)
    if (isBackendAvailable()) {
      saveSessionToBackend(this.state.cvId, this.state)
        .then(result => {
          if (result?.ok) {
            console.info('[SessionService] synced to backend', { cvId: this.state?.cvId, reason });
          }
        })
        .catch(() => {
          // Silent — localStorage is the source of truth
        });
    }
  }

  /**
   * Clear session for current CV and detach listeners.
   * Also deletes from backend if available.
   */
  clear(): void {
    if (this.state) {
      const cvId = this.state.cvId;
      localStorage.removeItem(storageKey(cvId));
      console.info('[SessionService] cleared session', { cvId });

      // Backend cleanup (non-blocking)
      if (isBackendAvailable()) {
        deleteSessionFromBackend(cvId).catch(() => {});
      }
    }
    this.state = null;
    this.detachListeners();
    this.clearTimers();
  }

  /**
   * Teardown without clearing data (e.g. on unmount).
   */
  detach(): void {
    if (this.state) {
      this.saveNow('detach');
    }
    this.detachListeners();
    this.clearTimers();
  }

  /**
   * Subscribe to session state changes.
   */
  onChange(handler: SessionChangeHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  // -- Interruption detection helpers (exposed for toast component) --

  private interruptionCallbacks: Array<(type: InterruptionType | 'online') => void> = [];

  onInterruption(cb: (type: InterruptionType | 'online') => void): () => void {
    this.interruptionCallbacks.push(cb);
    return () => {
      this.interruptionCallbacks = this.interruptionCallbacks.filter(c => c !== cb);
    };
  }

  // -- Private methods --

  private notifyHandlers(): void {
    if (!this.state) return;
    const snapshot = { ...this.state };
    this.handlers.forEach(h => h(snapshot));
  }

  private scheduleAutosave(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.saveNow('autosave');
    }, AUTOSAVE_INTERVAL_MS);
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (!this.state) return;
      this.state.interruptionType = 'idle_timeout';
      this.pushAction('interruption_detected', { type: 'idle_timeout' });
      this.saveNow('idle_timeout');
      this.interruptionCallbacks.forEach(cb => cb('idle_timeout'));
      console.info('[SessionService] idle timeout triggered');
    }, IDLE_TIMEOUT_MS);
  }

  private clearTimers(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private attachListeners(): void {
    window.addEventListener('beforeunload', this.boundBeforeUnload);
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    window.addEventListener('offline', this.boundOffline);
    window.addEventListener('online', this.boundOnline);

    // User activity events for idle detection
    window.addEventListener('keydown', this.boundUserActivity);
    window.addEventListener('click', this.boundUserActivity);
    window.addEventListener('mousemove', this.boundUserActivity);
    window.addEventListener('scroll', this.boundUserActivity, true);
  }

  private detachListeners(): void {
    window.removeEventListener('beforeunload', this.boundBeforeUnload);
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    window.removeEventListener('offline', this.boundOffline);
    window.removeEventListener('online', this.boundOnline);
    window.removeEventListener('keydown', this.boundUserActivity);
    window.removeEventListener('click', this.boundUserActivity);
    window.removeEventListener('mousemove', this.boundUserActivity);
    window.removeEventListener('scroll', this.boundUserActivity, true);
  }

  // -- Event handlers --

  private onBeforeUnload(): void {
    if (!this.state) return;
    this.state.interruptionType = 'tab_closed';
    this.pushAction('interruption_detected', { type: 'tab_closed' });
    this.saveNow('tab_closed');
  }

  private onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      this.saveNow('visibility_hidden');
    }
  }

  private onOffline(): void {
    if (!this.state) return;
    this.state.interruptionType = 'connectivity_lost';
    this.pushAction('interruption_detected', { type: 'connectivity_lost' });
    this.saveNow('connectivity_lost');
    this.interruptionCallbacks.forEach(cb => cb('connectivity_lost'));
    console.info('[SessionService] connectivity lost');
  }

  private onOnline(): void {
    this.interruptionCallbacks.forEach(cb => cb('online'));
    console.info('[SessionService] back online');
  }

  private onUserActivity(): void {
    this.lastActivityTs = Date.now();
    this.resetIdleTimer();
  }
}

// Export singleton instance
export const sessionService = new SessionService();
