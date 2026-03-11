/**
 * ProgressSidebar.tsx
 * -----------------------------------------------
 * Collapsible sidebar on the left side of the
 * CV editor. Shows overall progress, per-section
 * status, AI improvement suggestions with
 * selection probability, and session timeline.
 * -----------------------------------------------
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  ChevronDown,
  Loader2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  X,
} from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useCV } from '../../contexts/CVContext';
import { aiService } from '../../services/aiService';
import {
  getCompletionColor,
} from '../../utils/completionCalculator';

// -- Section display labels --
const SECTION_LABELS: Record<string, string> = {
  contact: 'Contact',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
};

// -- Section improvement tips (fallback when AI is unavailable) --
const SECTION_TIPS: Record<string, string[]> = {
  contact: [
    'Add a professional email address',
    'Include your LinkedIn profile URL',
    'Add your location (city, state)',
  ],
  summary: [
    'Write 2-3 sentences highlighting your key strengths',
    'Include years of experience and main expertise',
    'Mention your career goals aligned with the role',
  ],
  experience: [
    'Use action verbs to start each bullet point',
    'Quantify achievements with numbers and metrics',
    'Include relevant keywords from job descriptions',
  ],
  education: [
    'List your highest degree first',
    'Include relevant coursework or projects',
    'Add GPA if it\'s above 3.5',
  ],
  skills: [
    'Group skills by category (Technical, Soft, Tools)',
    'Prioritize skills mentioned in job descriptions',
    'Include proficiency levels for languages',
  ],
};

interface SectionAnalysis {
  sectionType: string;
  selectionProbability: number;
  improvements: string[];
  strengths: string[];
  priority: 'high' | 'medium' | 'low';
}

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
        stroke="#172033"
        strokeWidth="3"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#14b8a6"
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

// -- Priority badge component --
function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${colors[priority]} uppercase font-semibold`}>
      {priority}
    </span>
  );
}

// -- Selection probability meter --
function SelectionMeter({ probability }: { probability: number }) {
  const getColor = () => {
    if (probability >= 70) return '#22c55e'; // green
    if (probability >= 40) return '#eab308'; // yellow
    return '#ef4444'; // red
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${probability}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: getColor() }}
        />
      </div>
      <span className="text-[10px] font-semibold" style={{ color: getColor() }}>
        {probability}%
      </span>
    </div>
  );
}

// -- Main Component --

export function ProgressSidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<SectionAnalysis[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const { overallProgress, sectionCompletionMap, sessionData } = useSession();
  const { currentCV } = useCV();

  // Last 5 action log entries
  const recentActions = (sessionData?.actionLog ?? [])
    .filter(a => a.action !== 'patch') // filter out noise
    .slice(-5)
    .reverse();

  // Count sections where AI could help (< 80% complete)
  const sectionsToImprove = Object.entries(sectionCompletionMap)
    .filter(([, v]) => v < 80)
    .map(([k]) => k);
  const aiSuggestionsCount = sectionsToImprove.length;

  // Analyze CV with AI
  const analyzeCV = useCallback(async () => {
    if (!currentCV || !aiService.hasApiKey()) {
      // Use fallback analysis
      const fallbackResults: SectionAnalysis[] = sectionsToImprove.map(sectionType => {
        const completion = sectionCompletionMap[sectionType] ?? 0;
        return {
          sectionType,
          selectionProbability: Math.min(95, completion + 15),
          improvements: SECTION_TIPS[sectionType] || ['Add more details to this section'],
          strengths: completion > 50 ? ['Good start on this section'] : [],
          priority: completion < 30 ? 'high' : completion < 60 ? 'medium' : 'low',
        };
      });
      setAnalysisResults(fallbackResults);
      setShowAnalysis(true);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const prompt = `Analyze this resume and provide specific improvement suggestions for each section. For each section that needs improvement, provide:
1. A selection probability percentage (0-100) - how likely this resume section would pass ATS and impress recruiters
2. 2-3 specific, actionable improvements
3. Any strengths to highlight
4. Priority level (high/medium/low)

Focus on sections: ${sectionsToImprove.join(', ')}

Respond in this exact JSON format (no markdown, just pure JSON):
{
  "sections": [
    {
      "sectionType": "summary",
      "selectionProbability": 45,
      "improvements": ["Add quantifiable achievements", "Include industry keywords"],
      "strengths": ["Clear career objective"],
      "priority": "high"
    }
  ]
}`;

      const response = await aiService.generateResponse(prompt, currentCV);
      
      // Parse the JSON response
      try {
        // Extract JSON from the response (handle potential markdown wrapping)
        let jsonStr = response;
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
        
        const parsed = JSON.parse(jsonStr);
        if (parsed.sections && Array.isArray(parsed.sections)) {
          setAnalysisResults(parsed.sections);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Fallback to basic analysis
        const fallbackResults: SectionAnalysis[] = sectionsToImprove.map(sectionType => {
          const completion = sectionCompletionMap[sectionType] ?? 0;
          return {
            sectionType,
            selectionProbability: Math.min(95, completion + 15),
            improvements: SECTION_TIPS[sectionType] || ['Add more details to this section'],
            strengths: completion > 50 ? ['Good start on this section'] : [],
            priority: completion < 30 ? 'high' : completion < 60 ? 'medium' : 'low',
          };
        });
        setAnalysisResults(fallbackResults);
      }
      
      setShowAnalysis(true);
    } catch (error: any) {
      console.error('Analysis error:', error);
      setAnalysisError(error.message || 'Failed to analyze resume');
      // Still show fallback
      const fallbackResults: SectionAnalysis[] = sectionsToImprove.map(sectionType => {
        const completion = sectionCompletionMap[sectionType] ?? 0;
        return {
          sectionType,
          selectionProbability: Math.min(95, completion + 15),
          improvements: SECTION_TIPS[sectionType] || ['Add more details to this section'],
          strengths: completion > 50 ? ['Good start on this section'] : [],
          priority: completion < 30 ? 'high' : completion < 60 ? 'medium' : 'low',
        };
      });
      setAnalysisResults(fallbackResults);
      setShowAnalysis(true);
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentCV, sectionsToImprove, sectionCompletionMap]);

  // Scroll to section
  const scrollToSection = (sectionType: string) => {
    const el = document.querySelector(`[data-section-id="${sectionType}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isExpanded ? 280 : 56 }}
      transition={{ duration: 0.25 }}
      className="h-full bg-surface-900/60 border-r border-slate-800 flex flex-col overflow-hidden flex-shrink-0"
    >
      {/* -- Toggle Button -- */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        {isExpanded && (
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Progress
          </span>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-slate-500 hover:text-white rounded transition-colors"
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
                onClick={() => scrollToSection(key)}
                className="w-3 h-3 rounded-full hover:ring-2 ring-teal-400 transition-all"
                style={{ backgroundColor: color }}
                title={`${SECTION_LABELS[key]} - ${completion}%`}
              />
            );
          })}
          
          {/* AI badge when collapsed */}
          {aiSuggestionsCount > 0 && (
            <button
              onClick={() => {
                setIsExpanded(true);
                analyzeCV();
              }}
              className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center hover:bg-teal-500/30 transition-colors"
              title={`${aiSuggestionsCount} sections can be improved`}
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
            </button>
          )}
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

                return (
                  <button
                    key={key}
                    onClick={() => scrollToSection(key)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface-800/50 transition-colors text-left group"
                  >
                    {/* Dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 group-hover:text-white truncate">
                          {label}
                        </span>
                        <span className="text-[10px] text-slate-600">{completion}%</span>
                      </div>
                      {/* Mini bar */}
                      <div className="mt-1 h-1 bg-surface-800 rounded-full overflow-hidden">
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

            {/* AI suggestions badge - Interactive */}
            {aiSuggestionsCount > 0 && (
              <div className="mx-3 mt-4">
                <button
                  onClick={analyzeCV}
                  disabled={isAnalyzing}
                  className="w-full p-3 bg-gradient-to-r from-teal-900/30 to-teal-800/20 border border-teal-600/30 rounded-lg hover:border-teal-500/50 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-xs text-teal-300 font-medium">
                      {isAnalyzing ? 'Analyzing...' : `${aiSuggestionsCount} section${aiSuggestionsCount > 1 ? 's' : ''} can be improved`}
                    </span>
                  </div>
                  {!showAnalysis && !isAnalyzing && (
                    <p className="text-[10px] text-teal-400/60 mt-1 text-left">
                      Click to get AI-powered suggestions
                    </p>
                  )}
                </button>
              </div>
            )}

            {/* Analysis Results Panel */}
            <AnimatePresence>
              {showAnalysis && analysisResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-3 mt-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-teal-400" />
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        AI Analysis
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAnalysis(false)}
                      className="p-1 text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {analysisError && (
                    <div className="mb-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-[10px] text-yellow-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>Using offline suggestions</span>
                    </div>
                  )}

                  {/* Section Cards */}
                  <div className="space-y-2">
                    {analysisResults.map((analysis) => (
                      <motion.div
                        key={analysis.sectionType}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-surface-800/50 border border-slate-700/50 rounded-lg overflow-hidden"
                      >
                        {/* Section Header */}
                        <button
                          onClick={() => setExpandedSection(
                            expandedSection === analysis.sectionType ? null : analysis.sectionType
                          )}
                          className="w-full p-2.5 flex items-center justify-between hover:bg-surface-700/30 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-300 font-medium">
                              {SECTION_LABELS[analysis.sectionType]}
                            </span>
                            <PriorityBadge priority={analysis.priority} />
                          </div>
                          <ChevronDown 
                            className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                              expandedSection === analysis.sectionType ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Selection Probability */}
                        <div className="px-2.5 pb-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] text-slate-500 uppercase">Selection Chance</span>
                          </div>
                          <SelectionMeter probability={analysis.selectionProbability} />
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {expandedSection === analysis.sectionType && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-slate-700/50"
                            >
                              <div className="p-2.5 space-y-3">
                                {/* Improvements */}
                                {analysis.improvements.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <Lightbulb className="w-3 h-3 text-yellow-400" />
                                      <span className="text-[9px] text-slate-500 uppercase font-semibold">
                                        Suggestions
                                      </span>
                                    </div>
                                    <ul className="space-y-1">
                                      {analysis.improvements.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                                          <span className="text-teal-400 mt-0.5">•</span>
                                          <span>{tip}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Strengths */}
                                {analysis.strengths.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                                      <span className="text-[9px] text-slate-500 uppercase font-semibold">
                                        Strengths
                                      </span>
                                    </div>
                                    <ul className="space-y-1">
                                      {analysis.strengths.map((strength, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-[10px] text-green-400/80">
                                          <span className="mt-0.5">✓</span>
                                          <span>{strength}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Action Button */}
                                <button
                                  onClick={() => scrollToSection(analysis.sectionType)}
                                  className="w-full py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 text-[10px] font-medium rounded transition-colors"
                                >
                                  Edit {SECTION_LABELS[analysis.sectionType]}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Session timeline */}
            {recentActions.length > 0 && (
              <div className="mx-3 mt-4 mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                    Timeline
                  </span>
                </div>
                <div className="space-y-1.5">
                  {recentActions.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-600 w-10 text-right flex-shrink-0">
                        {relativeTime(entry.ts)}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-surface-700 flex-shrink-0" />
                      <span className="text-slate-500 truncate">
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
