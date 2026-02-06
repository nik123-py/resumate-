/**
 * ProgressSidebar.tsx
 * -----------------------------------------------
 * Collapsible sidebar on the left side of the
 * CV editor. Shows overall progress, per-section
 * status, and session timeline.
 * -----------------------------------------------
 * spine-hangar editor progress tracking
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import {
  getCompletionStatus,
  getCompletionColor,
  SECTION_WEIGHTS,
} from '../../utils/completionCalculator';

// -- Section display labels --
const SECTION_LABELS: Record<string, string> = {
  contact: 'Contact',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
};

// -- Mini circular progress for collapsed state --
function MiniProgress({ progress, size = 36 }: { progress: number; size?: number }) {
  const center = size / 2;
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#1f2937"
        strokeWidth="3"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#7c3aed"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x={center}
        y={center + 4}
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="bold"
      >
        {progress}
      </text>
    </svg>
  );
}

// -- Format relative time --
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// -- Format action label --
function formatAction(action: string, meta?: Record<string, unknown>): string {
  const labels: Record<string, string> = {
    'edited_field': `Edited ${(meta?.section as string) || 'field'}`,
    'section_expanded': `Opened ${(meta?.section as string) || 'section'}`,
    'section_collapsed': `Closed ${(meta?.section as string) || 'section'}`,
    'interruption_detected': `Session ${(meta?.type as string)?.replace(/_/g, ' ') || 'interrupted'}`,
    'patch': 'Auto-saved',
  };
  return labels[action] || action.replace(/_/g, ' ');
}

// -- Main Component --

export function ProgressSidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { overallProgress, sectionCompletionMap, sessionData } = useSession();

  // Last 5 action log entries
  const recentActions = (sessionData?.actionLog ?? [])
    .filter(a => a.action !== 'patch') // filter out noise
    .slice(-5)
    .reverse();

  // Count sections where AI could help (< 80% complete)
  const aiSuggestionsCount = Object.values(sectionCompletionMap).filter(v => v < 80).length;

  return (
    <motion.div
      initial={false}
      animate={{ width: isExpanded ? 240 : 56 }}
      transition={{ duration: 0.25 }}
      className="h-full bg-gray-800/60 border-r border-gray-700/50 flex flex-col overflow-hidden flex-shrink-0"
    >
      {/* -- Toggle Button -- */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        {isExpanded && (
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Progress
          </span>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 hover:text-white rounded transition-colors"
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* -- Collapsed State: Mini Ring Only -- */}
      {!isExpanded && (
        <div className="flex flex-col items-center gap-4 py-4">
          <MiniProgress progress={overallProgress} />

          {/* Section dots */}
          {Object.entries(SECTION_LABELS).map(([key]) => {
            const completion = sectionCompletionMap[key] ?? 0;
            const color = getCompletionColor(completion);
            return (
              <button
                key={key}
                onClick={() => {
                  const el = document.querySelector(`[data-section-id="${key}"]`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="w-3 h-3 rounded-full hover:ring-2 ring-purple-400 transition-all"
                style={{ backgroundColor: color }}
                title={`${SECTION_LABELS[key]} - ${completion}%`}
              />
            );
          })}
        </div>
      )}

      {/* -- Expanded State -- */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto"
          >
            {/* Overall progress */}
            <div className="flex justify-center py-4">
              <MiniProgress progress={overallProgress} size={64} />
            </div>

            {/* Section list */}
            <div className="px-3 space-y-2">
              {Object.entries(SECTION_LABELS).map(([key, label]) => {
                const completion = sectionCompletionMap[key] ?? 0;
                const color = getCompletionColor(completion);
                const status = getCompletionStatus(completion);

                return (
                  <button
                    key={key}
                    onClick={() => {
                      const el = document.querySelector(`[data-section-id="${key}"]`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/50 transition-colors text-left group"
                  >
                    {/* Dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300 group-hover:text-white truncate">
                          {label}
                        </span>
                        <span className="text-[10px] text-gray-500">{completion}%</span>
                      </div>
                      {/* Mini bar */}
                      <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${completion}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* AI suggestions badge */}
            {aiSuggestionsCount > 0 && (
              <div className="mx-3 mt-4 p-2 bg-purple-900/20 border border-purple-500/20 rounded-lg flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] text-purple-300">
                  {aiSuggestionsCount} section{aiSuggestionsCount > 1 ? 's' : ''} can be improved
                </span>
              </div>
            )}

            {/* Session timeline */}
            {recentActions.length > 0 && (
              <div className="mx-3 mt-4 mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                    Timeline
                  </span>
                </div>
                <div className="space-y-1.5">
                  {recentActions.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="text-gray-600 w-10 text-right flex-shrink-0">
                        {relativeTime(entry.ts)}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
                      <span className="text-gray-400 truncate">
                        {formatAction(entry.action, entry.meta)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
