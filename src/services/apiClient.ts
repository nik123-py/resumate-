/**
 * apiClient.ts
 * -----------------------------------------------
 * Frontend API client for the Resumate backend.
 * All methods gracefully fall back if the backend
 * is unavailable (offline-first design).
 *
 * The client auto-detects backend availability on
 * startup and caches the result. If the backend
 * is down, all methods return null/fallback so
 * the app works purely with localStorage.
 * -----------------------------------------------
 */

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const AUTH_TOKEN = import.meta.env.VITE_API_TOKEN || 'resumate-hackathon-spine-hangar-2026';

let _backendAvailable: boolean | null = null;
let _checkingAvailability = false;

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function getHeaders(): Record<string, string> {
  const userId = localStorage.getItem('resumate_user_id') || 'anonymous';
  const userName = localStorage.getItem('resumate_user_name') || 'Anonymous';
  const userEmail = localStorage.getItem('resumate_user_email') || 'anon@resumate.local';

  return {
    'Content-Type': 'application/json',
    'x-resumate-token': AUTH_TOKEN,
    'x-resumate-user-id': userId,
    'x-resumate-user-name': userName,
    'x-resumate-user-email': userEmail,
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: any,
  timeoutMs = 10000
): Promise<T | null> {
  // Skip if backend known to be down
  if (_backendAvailable === false) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(`[API] ${method} ${path} → ${response.status}`, errorData);
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn(`[API] ${method} ${path} → timeout`);
    } else {
      console.warn(`[API] ${method} ${path} → error:`, err.message);
    }
    return null;
  }
}

// -----------------------------------------------
// Backend Availability
// -----------------------------------------------

/**
 * Check if the backend server is reachable.
 * Caches the result for the session.
 */
export async function checkBackendAvailable(): Promise<boolean> {
  if (_backendAvailable !== null) return _backendAvailable;
  if (_checkingAvailability) return false;

  _checkingAvailability = true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${BACKEND_URL}/api/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      _backendAvailable = data.ok === true;
      console.info(`[API] Backend ${_backendAvailable ? '✓ available' : '✗ unavailable'} at ${BACKEND_URL}`);
    } else {
      _backendAvailable = false;
    }
  } catch {
    _backendAvailable = false;
    console.info(`[API] Backend unavailable at ${BACKEND_URL} — running offline`);
  } finally {
    _checkingAvailability = false;
  }

  return _backendAvailable;
}

/**
 * Force re-check backend availability.
 */
export function resetBackendCheck() {
  _backendAvailable = null;
}

/**
 * Get cached backend availability status.
 */
export function isBackendAvailable(): boolean {
  return _backendAvailable === true;
}

// -----------------------------------------------
// Sessions API
// -----------------------------------------------

export interface SessionSaveResponse {
  ok: boolean;
  savedAt: number;
  cvId: string;
}

export async function saveSessionToBackend(cvId: string, sessionData: any): Promise<SessionSaveResponse | null> {
  return request<SessionSaveResponse>('POST', `/api/sessions/${cvId}/save`, sessionData);
}

export async function getSessionFromBackend(cvId: string): Promise<{ ok: boolean; session: any; updatedAt: number } | null> {
  return request('GET', `/api/sessions/${cvId}`);
}

export async function listSessionsFromBackend(): Promise<{ ok: boolean; sessions: any[] } | null> {
  return request('GET', '/api/sessions');
}

export async function deleteSessionFromBackend(cvId: string): Promise<{ ok: boolean } | null> {
  return request('DELETE', `/api/sessions/${cvId}`);
}

// -----------------------------------------------
// CVs API
// -----------------------------------------------

export async function saveCVToBackend(cvData: any): Promise<{ ok: boolean; id: string; savedAt: number } | null> {
  return request('POST', '/api/cvs', {
    id: cvData.id,
    title: cvData.title,
    data: cvData,
  });
}

export async function listCVsFromBackend(): Promise<{ ok: boolean; cvs: any[] } | null> {
  return request('GET', '/api/cvs');
}

export async function getCVFromBackend(id: string): Promise<{ ok: boolean; cv: any } | null> {
  return request('GET', `/api/cvs/${id}`);
}

export async function deleteCVFromBackend(id: string): Promise<{ ok: boolean } | null> {
  return request('DELETE', `/api/cvs/${id}`);
}

// -----------------------------------------------
// Applications API
// -----------------------------------------------

export async function createApplicationOnBackend(appData: any): Promise<{ ok: boolean; id: string; remindAt: number | null } | null> {
  return request('POST', '/api/applications', appData);
}

export async function listApplicationsFromBackend(): Promise<{ ok: boolean; applications: any[] } | null> {
  return request('GET', '/api/applications');
}

export async function getApplicationFromBackend(id: string): Promise<{ ok: boolean; application: any } | null> {
  return request('GET', `/api/applications/${id}`);
}

export async function updateApplicationOnBackend(id: string, data: any): Promise<{ ok: boolean } | null> {
  return request('PUT', `/api/applications/${id}`, data);
}

export async function deleteApplicationFromBackend(id: string): Promise<{ ok: boolean } | null> {
  return request('DELETE', `/api/applications/${id}`);
}

// -----------------------------------------------
// Score API (Gemini proxy)
// -----------------------------------------------

export interface ScoreResponse {
  ok: boolean;
  score: number;
  explanation: string;
  highlights: Array<{ field: string; advice: string }>;
  cached: boolean;
}

export async function getResumeScore(
  cvId: string,
  cvText: string,
  jobDescription?: string,
  appId?: string
): Promise<ScoreResponse | null> {
  return request<ScoreResponse>(
    'POST',
    '/api/score',
    { cvId, cvText, jobDescription, appId },
    30000  // 30s timeout for AI calls
  );
}

export async function getResumeAnalysis(cvText: string): Promise<{
  ok: boolean;
  overallAssessment: string;
  suggestions: Array<{ section: string; suggestion: string; priority: string }>;
} | null> {
  return request('POST', '/api/score/analyze', { cvText }, 30000);
}

export async function getAINudge(context: {
  weakestSection?: string;
  completionPercent?: number;
  lastAction?: string;
}): Promise<{ ok: boolean; nudge: string } | null> {
  return request('POST', '/api/score/nudge', context, 15000);
}

// -----------------------------------------------
// Reminders API
// -----------------------------------------------

export async function scheduleReminder(appId: string, remindAt?: number): Promise<{ ok: boolean; id: string; remindAt: number } | null> {
  return request('POST', '/api/reminders/schedule', { appId, remindAt });
}

export async function listReminders(): Promise<{ ok: boolean; reminders: any[] } | null> {
  return request('GET', '/api/reminders');
}

export async function getDueReminders(): Promise<{ ok: boolean; dueReminders: any[]; count: number } | null> {
  return request('GET', '/api/reminders/due');
}

export async function dismissReminder(id: string): Promise<{ ok: boolean } | null> {
  return request('POST', `/api/reminders/${id}/dismiss`);
}

// -----------------------------------------------
// Convenience: Sync session (localStorage + backend)
// -----------------------------------------------

/**
 * Save session to both localStorage and backend.
 * Backend save is fire-and-forget (doesn't block UI).
 */
export function syncSession(cvId: string, sessionData: any, localStorageKey: string) {
  // Always save locally first (instant)
  try {
    localStorage.setItem(localStorageKey, JSON.stringify(sessionData));
  } catch (err) {
    console.error('[API] localStorage save failed:', err);
  }

  // Then try backend (async, non-blocking)
  if (_backendAvailable) {
    saveSessionToBackend(cvId, sessionData).then(result => {
      if (result?.ok) {
        console.info(`[API] session synced to backend cv=${cvId}`);
      }
    }).catch(() => {
      // Silent fail — localStorage is the source of truth
    });
  }
}

/**
 * Load session with backend merge.
 * Prefers the more recent version (local vs backend).
 */
export async function loadSessionWithSync(cvId: string, localStorageKey: string): Promise<any | null> {
  let localSession: any = null;

  // Load from localStorage
  try {
    const stored = localStorage.getItem(localStorageKey);
    if (stored) localSession = JSON.parse(stored);
  } catch { /* ignore */ }

  // If backend is available, check for more recent version
  if (_backendAvailable) {
    try {
      const backendResult = await getSessionFromBackend(cvId);
      if (backendResult?.ok && backendResult.session) {
        const backendSession = backendResult.session;

        // Compare timestamps — use the more recent one
        const localTs = localSession?.sessionTimestamps?.lastActive || 0;
        const backendTs = backendSession?.sessionTimestamps?.lastActive || 0;

        if (backendTs > localTs) {
          console.info(`[API] using backend session (newer by ${Math.round((backendTs - localTs) / 1000)}s)`);
          // Save to localStorage so it's cached locally
          localStorage.setItem(localStorageKey, JSON.stringify(backendSession));
          return backendSession;
        }
      }
    } catch {
      // Fall back to local
    }
  }

  return localSession;
}

// -----------------------------------------------
// Init: check backend on app startup
// -----------------------------------------------
checkBackendAvailable();
