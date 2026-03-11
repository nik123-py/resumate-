/**
 * globalSessionService.ts
 * -----------------------------------------------
 * Tracks app-wide user activity independent of
 * any specific CV. Persists last route, activity
 * log, and generates a human-readable briefing
 * when the user returns after closing the app.
 * -----------------------------------------------
 * spine-hangar global re-entry intelligence
 */

// -- Types --

export interface ActivityEntry {
  ts: number;
  route: string;
  action: string;
  detail?: string;
}

export interface LastEditInfo {
  sectionType: string;
  sectionTitle: string;
  fieldName?: string;
  timestamp: number;
}

export interface GlobalSessionState {
  lastRoute: string;
  lastActiveAt: number;
  lastCvId: string | null;
  lastCvTitle: string | null;
  activityLog: ActivityEntry[];
  totalSessionCount: number;
  wasGracefulExit: boolean;
  lastEdit: LastEditInfo | null; // Track the exact last edit location
}

// -- Constants --
const STORAGE_KEY = 'resumate_global_session';
const MAX_ACTIVITY_LOG = 30;
const RETURN_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes = returning user

// -- Human-readable route labels --
const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/editor': 'Resume Editor',
  '/preview': 'Resume Preview',
  '/ai-assistant': 'AI Assistant',
  '/applications': 'Application Tracker',
};

// -- Human-readable action labels --
const ACTION_LABELS: Record<string, string> = {
  'page_visit': 'Visited',
  'cv_created': 'Created a new resume',
  'cv_edited': 'Edited resume',
  'cv_deleted': 'Deleted a resume',
  'section_edited': 'Worked on section',
  'ai_chat': 'Chatted with AI assistant',
  'pdf_exported': 'Exported resume as PDF',
  'app_tracked': 'Added a job application',
  'template_selected': 'Selected a template',
  'skills_added': 'Added skills',
};

// -----------------------------------------------
// GlobalSessionService
// -----------------------------------------------

class GlobalSessionService {
  private state: GlobalSessionState;

  constructor() {
    this.state = this.load();

    // Mark that this session started (detect closing)
    window.addEventListener('beforeunload', () => {
      this.state.wasGracefulExit = false;
      this.persist();
    });
  }

  // -- Load from localStorage --
  private load(): GlobalSessionState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      console.warn('[GlobalSession] corrupt data, resetting');
    }

    return {
      lastRoute: '/dashboard',
      lastActiveAt: 0,
      lastCvId: null,
      lastCvTitle: null,
      activityLog: [],
      totalSessionCount: 0,
      wasGracefulExit: true,
      lastEdit: null,
    };
  }

  // -- Persist to localStorage --
  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      console.error('[GlobalSession] persist failed', err);
    }
  }

  // -- Public API --

  /**
   * Record a route change. Called from the route tracker component.
   */
  trackRoute(route: string): void {
    this.state.lastRoute = route;
    this.state.lastActiveAt = Date.now();
    this.pushActivity(route, 'page_visit', ROUTE_LABELS[route] || route);
    this.persist();
  }

  /**
   * Record a meaningful user action.
   */
  trackAction(route: string, action: string, detail?: string): void {
    this.state.lastActiveAt = Date.now();
    this.pushActivity(route, action, detail);
    this.persist();
  }

  /**
   * Record the active CV info for briefing context.
   */
  trackActiveCV(cvId: string | null, cvTitle: string | null): void {
    this.state.lastCvId = cvId;
    this.state.lastCvTitle = cvTitle;
    this.state.lastActiveAt = Date.now();
    this.persist();
  }

  /**
   * Track the exact edit location (section and field).
   * This enables precise "where you left off" highlighting.
   */
  trackLastEdit(sectionType: string, sectionTitle: string, fieldName?: string): void {
    this.state.lastEdit = {
      sectionType,
      sectionTitle,
      fieldName,
      timestamp: Date.now(),
    };
    this.state.lastActiveAt = Date.now();
    this.pushActivity('/editor', 'section_edited', `${sectionTitle}${fieldName ? ` - ${fieldName}` : ''}`);
    this.persist();
    console.info('[GlobalSession] tracked edit:', sectionType, sectionTitle, fieldName);
  }

  /**
   * Get the last edit info for highlighting.
   */
  getLastEdit(): LastEditInfo | null {
    return this.state.lastEdit;
  }

  /**
   * Mark the start of a new session.
   */
  startSession(): void {
    this.state.totalSessionCount++;
    this.state.wasGracefulExit = true;
    this.persist();
    console.info('[GlobalSession] session #' + this.state.totalSessionCount + ' started');
  }

  /**
   * Check if the user is returning after an absence.
   */
  isReturningUser(): boolean {
    if (this.state.lastActiveAt === 0) return false;
    const elapsed = Date.now() - this.state.lastActiveAt;
    return elapsed > RETURN_THRESHOLD_MS && this.state.activityLog.length > 0;
  }

  /**
   * Get the time elapsed since last activity.
   */
  getTimeSinceLastActive(): number {
    if (this.state.lastActiveAt === 0) return 0;
    return Date.now() - this.state.lastActiveAt;
  }

  /**
   * Get the last route the user was on.
   */
  getLastRoute(): string {
    return this.state.lastRoute;
  }

  /**
   * Get full state snapshot.
   */
  getState(): GlobalSessionState {
    return { ...this.state };
  }

  /**
   * Generate a human-readable briefing of what the user
   * was doing before they left. This is the core re-entry
   * intelligence that orients the user instantly.
   */
  generateBriefing(): {
    headline: string;
    summary: string;
    lastPage: string;
    lastPageLabel: string;
    recentActions: string[];
    suggestion: string;
    lastCvTitle: string | null;
    lastEdit: LastEditInfo | null;
  } {
    const state = this.state;
    const lastPageLabel = ROUTE_LABELS[state.lastRoute] || 'the app';

    // Build headline based on context
    let headline = 'Welcome back!';
    if (state.lastCvTitle) {
      headline = `Welcome back to "${state.lastCvTitle}"`;
    }

    // Build summary from recent activity log
    const recentActivity = state.activityLog.slice(-8);
    const summary = this.buildSummary(recentActivity, state);

    // Extract last 5 unique human-readable actions
    const recentActions = this.getRecentActionLabels(recentActivity);

    // Generate contextual suggestion
    const suggestion = this.generateSuggestion(state);

    return {
      headline,
      summary,
      lastPage: state.lastRoute,
      lastPageLabel,
      recentActions,
      suggestion,
      lastCvTitle: state.lastCvTitle,
      lastEdit: state.lastEdit,
    };
  }

  /**
   * Mark that user has seen the welcome back screen.
   * Updates the lastActiveAt so it won't show again immediately.
   */
  dismissWelcomeBack(): void {
    this.state.lastActiveAt = Date.now();
    this.persist();
  }

  /**
   * Clear all global session data.
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.load();
  }

  // -- Private helpers --

  private pushActivity(route: string, action: string, detail?: string): void {
    this.state.activityLog.push({
      ts: Date.now(),
      route,
      action,
      detail,
    });
    // Keep log bounded
    if (this.state.activityLog.length > MAX_ACTIVITY_LOG) {
      this.state.activityLog = this.state.activityLog.slice(-MAX_ACTIVITY_LOG);
    }
  }

  /**
   * Build a natural language summary of what user was doing.
   */
  private buildSummary(
    activities: ActivityEntry[],
    state: GlobalSessionState
  ): string {
    if (activities.length === 0) {
      return 'You were just getting started.';
    }

    const parts: string[] = [];

    // What page were they on?
    const lastLabel = ROUTE_LABELS[state.lastRoute] || 'the app';
    parts.push(`You were last on the ${lastLabel}.`);

    // What CV were they working on?
    if (state.lastCvTitle) {
      parts.push(`Working on your resume "${state.lastCvTitle}".`);
    }

    // Summarize key actions (deduplicated)
    const actionSet = new Set<string>();
    for (const a of activities) {
      if (a.action === 'page_visit') continue;
      const label = ACTION_LABELS[a.action] || a.action.replace(/_/g, ' ');
      const full = a.detail ? `${label}: ${a.detail}` : label;
      actionSet.add(full);
    }

    if (actionSet.size > 0) {
      const actionList = Array.from(actionSet).slice(-3);
      parts.push(`Recent activity: ${actionList.join('. ')}.`);
    }

    return parts.join(' ');
  }

  /**
   * Extract unique, human-readable action labels from recent log.
   */
  private getRecentActionLabels(activities: ActivityEntry[]): string[] {
    const labels: string[] = [];
    const seen = new Set<string>();

    // Reverse to get most recent first
    for (let i = activities.length - 1; i >= 0; i--) {
      const a = activities[i];
      if (a.action === 'page_visit') continue;

      const label = ACTION_LABELS[a.action] || a.action.replace(/_/g, ' ');
      const full = a.detail ? `${label} -- ${a.detail}` : label;
      const key = a.action + (a.detail || '');

      if (!seen.has(key)) {
        seen.add(key);
        labels.push(full);
      }
      if (labels.length >= 5) break;
    }

    return labels;
  }

  /**
   * Generate a contextual suggestion based on where user left off.
   */
  private generateSuggestion(state: GlobalSessionState): string {
    switch (state.lastRoute) {
      case '/editor':
        return 'You were editing your resume. Pick up right where you left off -- your progress is saved.';
      case '/ai-assistant':
        return 'You were chatting with the AI assistant. Your conversation is waiting for you.';
      case '/preview':
        return 'You were previewing your resume. Ready to export or make final tweaks?';
      case '/applications':
        return 'You were tracking job applications. Check if any need follow-up.';
      case '/dashboard':
        return 'You were browsing your resumes. Continue editing or create a new one.';
      default:
        return 'Ready to continue building your resume?';
    }
  }
}

// Export singleton
export const globalSessionService = new GlobalSessionService();
