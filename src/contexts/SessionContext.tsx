/**
 * SessionContext.tsx
 * -----------------------------------------------
 * React context that wraps the session tracking
 * service. Provides useSession() hook to all
 * components for reading/writing session data.
 * -----------------------------------------------
 * spine-hangar session intelligence layer
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useCV } from './CVContext';
import { sessionService, type SessionState } from '../services/sessionService';
import {
  calculateContactCompletion,
  calculateSummaryCompletion,
  calculateExperienceCompletion,
  calculateEducationCompletion,
  calculateSkillsCompletion,
  calculateOverallProgress,
} from '../utils/completionCalculator';

// -- Hook return type --

export interface UseSessionReturn {
  sessionData: SessionState | null;
  isReturningUser: boolean;
  timeSinceLastActive: number;
  overallProgress: number;
  sectionCompletionMap: Record<string, number>;
  resumeSession: (options?: { scroll?: boolean; focusField?: boolean }) => void;
  clearSession: () => void;
  setPatch: (patch: Partial<SessionState>) => void;
  pushAction: (action: string, meta?: Record<string, unknown>) => void;
  dismissRecovery: () => void;
  showRecovery: boolean;
}

// -- Context --

const SessionContext = createContext<UseSessionReturn | null>(null);

export function useSession(): UseSessionReturn {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}

// -- Provider --

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { currentCV } = useCV();
  const [sessionData, setSessionData] = useState<SessionState | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const initializedCvId = useRef<string | null>(null);

  // -- Initialize/load session when CV changes --
  useEffect(() => {
    if (!currentCV) {
      // Detach but don't clear (user just navigated away)
      sessionService.detach();
      initializedCvId.current = null;
      setSessionData(null);
      setShowRecovery(false);
      return;
    }

    // Avoid re-initializing the same CV
    if (initializedCvId.current === currentCV.id) return;

    const loaded = sessionService.init(currentCV.id);
    initializedCvId.current = currentCV.id;
    setSessionData(loaded);

    // Determine if returning user (away > 2 minutes)
    const timeSince = Date.now() - (loaded.sessionTimestamps?.lastActive ?? Date.now());
    if (timeSince > 2 * 60 * 1000 && loaded.actionLog.length > 0) {
      setShowRecovery(true);
      console.info('[SessionContext] returning user detected', {
        cvId: currentCV.id,
        awayFor: `${Math.round(timeSince / 60000)} min`,
      });
    }

    // Subscribe to service changes
    const unsub = sessionService.onChange((state) => {
      setSessionData({ ...state });
    });

    return () => {
      unsub();
    };
  }, [currentCV?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Recalculate section completions when CV data changes --
  useEffect(() => {
    if (!currentCV || !sessionData) return;

    const sectionMap: Record<string, number> = {};

    for (const section of currentCV.sections) {
      switch (section.type) {
        case 'contact':
          sectionMap.contact = calculateContactCompletion(section.data);
          break;
        case 'summary':
          sectionMap.summary = calculateSummaryCompletion(section.data);
          break;
        case 'experience':
          sectionMap.experience = calculateExperienceCompletion(section.data);
          break;
        case 'education':
          sectionMap.education = calculateEducationCompletion(section.data);
          break;
        case 'skills':
          sectionMap.skills = calculateSkillsCompletion(section.data);
          break;
      }
    }

    sessionService.setPatch({ sectionCompletionMap: sectionMap });
  }, [currentCV]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Derived values --

  const timeSinceLastActive = sessionData
    ? Date.now() - (sessionData.sessionTimestamps?.lastActive ?? Date.now())
    : 0;

  const isReturningUser = timeSinceLastActive > 2 * 60 * 1000 && showRecovery;

  const sectionCompletionMap = sessionData?.sectionCompletionMap ?? {};
  const overallProgress = calculateOverallProgress(sectionCompletionMap);

  // -- Actions --

  const setPatch = useCallback((patch: Partial<SessionState>) => {
    sessionService.setPatch(patch);
  }, []);

  const pushAction = useCallback((action: string, meta?: Record<string, unknown>) => {
    sessionService.pushAction(action, meta);
  }, []);

  const clearSession = useCallback(() => {
    sessionService.clear();
    setSessionData(null);
    setShowRecovery(false);
    initializedCvId.current = null;
  }, []);

  const dismissRecovery = useCallback(() => {
    setShowRecovery(false);
  }, []);

  /**
   * Resume session: scroll to last section, focus last field.
   */
  const resumeSession = useCallback(
    (options?: { scroll?: boolean; focusField?: boolean }) => {
      setShowRecovery(false);

      if (!sessionData) return;

      // Small delay so DOM has rendered after modal closes
      requestAnimationFrame(() => {
        // Scroll to last active section
        if (options?.scroll !== false && sessionData.activeSection) {
          const sectionEl = document.querySelector(
            `[data-section-id="${sessionData.activeSection}"]`
          );
          if (sectionEl) {
            sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }

        // Focus the last cursor field
        if (options?.focusField !== false && sessionData.lastCursorField) {
          setTimeout(() => {
            const fieldEl = document.querySelector(
              `[data-field-id="${sessionData.lastCursorField}"]`
            ) as HTMLElement | null;
            if (fieldEl) {
              fieldEl.focus();
            }
          }, 400);
        }
      });

      console.info('[SessionContext] resumed session', {
        cvId: sessionData.cvId,
        section: sessionData.activeSection,
        field: sessionData.lastCursorField,
      });
    },
    [sessionData]
  );

  return (
    <SessionContext.Provider
      value={{
        sessionData,
        isReturningUser,
        timeSinceLastActive,
        overallProgress,
        sectionCompletionMap,
        resumeSession,
        clearSession,
        setPatch,
        pushAction,
        dismissRecovery,
        showRecovery,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
