/**
 * RecoveryScreen.tsx
 * -----------------------------------------------
 * Full-screen modal overlay shown to returning
 * users. Displays progress ring, section breakdown,
 * AI suggestion, and resume/fresh-start buttons.
 * -----------------------------------------------
 * spine-hangar recovery experience
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useCV } from '../../contexts/CVContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import {
  getCompletionStatus,
  getCompletionColor,
  SECTION_WEIGHTS,
} from '../../utils/completionCalculator';

// -- Section display config --
const SECTION_LABELS: Record<string, string> = {
  contact: 'Contact Information',
  summary: 'Professional Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
};

/**
 * Format milliseconds into a human-readable duration.
 */
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return 'a few moments';
}

/**
 * Generate a contextual AI nudge based on weakest section.
 */
function generateNudge(completionMap: Record<string, number>): string {
  // Find weakest section that's not empty
  let weakest = '';
  let weakestVal = 101;

  for (const [key, val] of Object.entries(completionMap)) {
    if (val < weakestVal) {
      weakest = key;
      weakestVal = val;
    }
  }

  const nudges: Record<string, string> = {
    contact: 'Fill in your contact details so recruiters can reach you easily.',
    summary: 'A strong professional summary can increase your shortlist chances. Want AI to help write one?',
    experience: 'Your experience section could use more detail. Let AI suggest impactful bullet points.',
    education: 'Complete your education section to present a full professional picture.',
    skills: 'Adding more relevant skills helps pass ATS filters. Want AI to suggest some?',
  };

  return nudges[weakest] || 'Keep building your resume -- you\'re making great progress!';
}

// -- SVG Progress Ring Component --

interface ProgressRingProps {
  progress: number;
  sectionMap: Record<string, number>;
  size?: number;
}

function ProgressRing({ progress, sectionMap, size = 180 }: ProgressRingProps) {
  const center = size / 2;
  const radius = size / 2 - 16;
  const circumference = 2 * Math.PI * radius;

  // Build arcs per section based on weights
  const sections = Object.entries(SECTION_WEIGHTS);
  const totalWeight = sections.reduce((s, [, w]) => s + w, 0);
  let cumulativeAngle = -90; // Start from top

  const arcs = sections.map(([key, weight]) => {
    const completion = sectionMap[key] ?? 0;
    const arcAngle = (weight / totalWeight) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += arcAngle;

    const color = getCompletionColor(completion);
    const gapAngle = 3; // small gap between segments
    const effectiveArc = arcAngle - gapAngle;

    // Convert angles to SVG arc path
    const startRad = (Math.PI / 180) * startAngle;
    const endRad = (Math.PI / 180) * (startAngle + effectiveArc);

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = effectiveArc > 180 ? 1 : 0;

    return (
      <path
        key={key}
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        opacity={completion > 0 ? 1 : 0.3}
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#1f2937"
        strokeWidth="10"
      />
      {/* Section arcs */}
      {arcs}
      {/* Center text */}
      <text
        x={center}
        y={center - 8}
        textAnchor="middle"
        fill="white"
        fontSize="32"
        fontWeight="bold"
      >
        {progress}%
      </text>
      <text
        x={center}
        y={center + 16}
        textAnchor="middle"
        fill="#9ca3af"
        fontSize="12"
      >
        Complete
      </text>
    </svg>
  );
}

// -- Status Badge --

function StatusBadge({ status }: { status: 'complete' | 'in_progress' | 'not_started' }) {
  const config = {
    complete: { label: 'Complete', bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/30' },
    in_progress: { label: 'In Progress', bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-500/30' },
    not_started: { label: 'Not Started', bg: 'bg-gray-800', text: 'text-gray-500', border: 'border-gray-600/30' },
  };

  const c = config[status];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
      {c.label}
    </span>
  );
}

// -- Main Component --

export function RecoveryScreen() {
  const { user } = useAuth();
  const { currentCV } = useCV();
  const {
    sessionData,
    showRecovery,
    overallProgress,
    sectionCompletionMap,
    timeSinceLastActive,
    resumeSession,
    dismissRecovery,
  } = useSession();

  // Get last field context for display
  const lastFieldContext = useMemo(() => {
    if (!sessionData?.activeSection || !currentCV) return null;

    const section = currentCV.sections.find(s => s.type === sessionData.activeSection);
    if (!section) return null;

    // Build a human-readable context string
    if (sessionData.activeSection === 'experience' && section.data?.items?.length > 0) {
      const item = section.data.items[section.data.items.length - 1];
      if (item.company) return `Job description at ${item.company}`;
      return 'Work experience entry';
    }
    if (sessionData.activeSection === 'education' && section.data?.items?.length > 0) {
      const item = section.data.items[section.data.items.length - 1];
      if (item.institution) return `Education at ${item.institution}`;
      return 'Education entry';
    }
    return null;
  }, [sessionData, currentCV]);

  const nudge = useMemo(
    () => generateNudge(sectionCompletionMap),
    [sectionCompletionMap]
  );

  if (!showRecovery || !sessionData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-label="Resume session recovery"
        onKeyDown={(e) => {
          if (e.key === 'Escape') dismissRecovery();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* -- Header -- */}
          <div className="p-6 pb-2">
            <h2 className="text-2xl font-bold text-white">
              Welcome back{user?.name ? `, ${user.name}` : ''}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-400">
                You were away for {formatDuration(timeSinceLastActive)}
              </p>
            </div>
          </div>

          {/* -- Progress Ring -- */}
          <div className="flex justify-center py-4">
            <ProgressRing
              progress={overallProgress}
              sectionMap={sectionCompletionMap}
            />
          </div>

          {/* -- Section Breakdown -- */}
          <div className="px-6 space-y-3 max-h-52 overflow-y-auto">
            {Object.entries(SECTION_LABELS).map(([key, label]) => {
              const completion = sectionCompletionMap[key] ?? 0;
              const status = getCompletionStatus(completion);
              const color = getCompletionColor(completion);
              const isActive = sessionData.activeSection === key;

              return (
                <div key={key} className="flex items-center gap-3">
                  {/* Color dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-200 truncate">{label}</span>
                      <StatusBadge status={status} />
                    </div>

                    {/* Progress bar */}
                    <div className="mt-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${completion}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>

                    {/* Last editing context */}
                    {isActive && lastFieldContext && status === 'in_progress' && (
                      <p className="text-xs text-gray-500 italic mt-1">
                        Last editing: {lastFieldContext}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* -- AI Nudge -- */}
          <div className="mx-6 mt-4 p-3 bg-purple-900/20 border border-purple-500/20 rounded-lg flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-300">{nudge}</p>
          </div>

          {/* -- Action Buttons -- */}
          <div className="p-6 flex gap-3">
            <Button
              onClick={() => resumeSession({ scroll: true, focusField: true })}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Resume Where I Left Off
            </Button>
            <Button
              variant="secondary"
              onClick={dismissRecovery}
              className="flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Start Fresh
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
