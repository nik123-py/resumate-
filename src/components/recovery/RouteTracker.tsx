/**
 * RouteTracker.tsx
 * -----------------------------------------------
 * Invisible component that watches route changes
 * and reports them to the globalSessionService.
 * Also tracks the active CV title for briefing.
 * Must be placed inside <Router>.
 * -----------------------------------------------
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { globalSessionService } from '../../services/globalSessionService';
import { useCV } from '../../contexts/CVContext';

export function RouteTracker() {
  const location = useLocation();
  const { currentCV } = useCV();

  // Track every route change
  useEffect(() => {
    globalSessionService.trackRoute(location.pathname);
  }, [location.pathname]);

  // Track active CV info for contextual briefing
  useEffect(() => {
    globalSessionService.trackActiveCV(
      currentCV?.id ?? null,
      currentCV?.title ?? null
    );
  }, [currentCV?.id, currentCV?.title]);

  // This component renders nothing
  return null;
}
