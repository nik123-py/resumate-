/**
 * WelcomeBackGuide.tsx
 * -----------------------------------------------
 * Full-screen overlay shown when user returns to
 * the app after closing it. Provides a briefing
 * of what they were doing, where they were, and
 * a one-click path back to their last context.
 * -----------------------------------------------
 * spine-hangar global re-entry guide
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  History,
  MapPin,
  FileText,
  Bot,
  Briefcase,
  Eye,
  LayoutDashboard,
  Lightbulb,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { globalSessionService } from '../../services/globalSessionService';

// -- Route icon mapping --
const ROUTE_ICONS: Record<string, React.ReactNode> = {
  '/dashboard': <LayoutDashboard className="w-5 h-5" />,
  '/editor': <FileText className="w-5 h-5" />,
  '/preview': <Eye className="w-5 h-5" />,
  '/ai-assistant': <Bot className="w-5 h-5" />,
  '/applications': <Briefcase className="w-5 h-5" />,
};

// -- Format duration --
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return 'a few moments';
}

// -- Timeline dot color based on action type --
function getActionColor(action: string): string {
  if (action.includes('edit') || action.includes('section')) return '#7c3aed'; // purple
  if (action.includes('ai') || action.includes('chat')) return '#3b82f6'; // blue
  if (action.includes('export') || action.includes('pdf')) return '#22c55e'; // green
  if (action.includes('app') || action.includes('track')) return '#f59e0b'; // amber
  return '#6b7280'; // gray
}

// -- Main Component --

export function WelcomeBackGuide() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  // Check on mount if user is returning
  useEffect(() => {
    const isReturning = globalSessionService.isReturningUser();
    if (isReturning) {
      setIsVisible(true);
      console.info('[WelcomeBackGuide] returning user detected, showing briefing');
    }
    // Mark the start of this session
    globalSessionService.startSession();
  }, []);

  const briefing = useMemo(() => {
    if (!isVisible) return null;
    return globalSessionService.generateBriefing();
  }, [isVisible]);

  const timeSince = globalSessionService.getTimeSinceLastActive();

  // Dismiss handler
  const handleDismiss = () => {
    globalSessionService.dismissWelcomeBack();
    setIsVisible(false);
  };

  // Resume to last page
  const handleResume = () => {
    if (briefing) {
      navigate(briefing.lastPage);
    }
    globalSessionService.dismissWelcomeBack();
    setIsVisible(false);
  };

  // Go to dashboard instead
  const handleGoToDashboard = () => {
    navigate('/dashboard');
    globalSessionService.dismissWelcomeBack();
    setIsVisible(false);
  };

  if (!isVisible || !briefing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4"
        role="dialog"
        aria-label="Welcome back guide"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden relative"
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors z-10"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>

          {/* -- Gradient accent bar at top -- */}
          <div className="h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600" />

          {/* -- Header -- */}
          <div className="p-6 pb-3">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-bold text-white"
            >
              {briefing.headline}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-sm text-gray-400 mt-1"
            >
              You were away for {formatDuration(timeSince)}
            </motion.p>
          </div>

          {/* -- Where you left off -- */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-6 p-3 bg-gray-800/70 border border-gray-700/50 rounded-xl flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 flex-shrink-0">
              {ROUTE_ICONS[briefing.lastPage] || <MapPin className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Last location
              </p>
              <p className="text-sm text-white font-medium">
                {briefing.lastPageLabel}
              </p>
              {briefing.lastCvTitle && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  Resume: {briefing.lastCvTitle}
                </p>
              )}
            </div>
          </motion.div>

          {/* -- Activity Summary (the briefing) -- */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mx-6 mt-4 p-3 bg-gray-800/40 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <History className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                What you were doing
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {briefing.summary}
            </p>
          </motion.div>

          {/* -- Recent Actions Timeline -- */}
          {briefing.recentActions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mx-6 mt-3"
            >
              <div className="space-y-2">
                {briefing.recentActions.map((action, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="flex items-center gap-2.5"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getActionColor(action) }}
                    />
                    <span className="text-xs text-gray-400">{action}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* -- AI Suggestion -- */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-6 mt-4 p-3 bg-purple-900/20 border border-purple-500/20 rounded-xl flex items-start gap-2.5"
          >
            <Lightbulb className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-300 leading-relaxed">
              {briefing.suggestion}
            </p>
          </motion.div>

          {/* -- Action Buttons -- */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="p-6 pt-5 flex gap-3"
          >
            <Button
              onClick={handleResume}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {ROUTE_ICONS[briefing.lastPage] || <ArrowRight className="w-4 h-4" />}
              <span>
                Go to {briefing.lastPageLabel}
              </span>
            </Button>
            {briefing.lastPage !== '/dashboard' && (
              <Button
                variant="secondary"
                onClick={handleGoToDashboard}
                className="flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
