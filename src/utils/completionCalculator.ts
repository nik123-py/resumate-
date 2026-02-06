/**
 * completionCalculator.ts
 * -----------------------------------------------
 * Pure utility functions for calculating section
 * completion percentages. Each returns 0-100.
 * Used by SessionContext for progress tracking.
 * -----------------------------------------------
 */

import type { ContactInfo, ExperienceItem, EducationItem } from '../types';

// -- Contact: required fields weighted 70%, optional 30% --
export function calculateContactCompletion(data: ContactInfo | null | undefined): number {
  if (!data) return 0;

  // Required fields (each worth 17.5% of total = 70% / 4)
  const requiredFields: (keyof ContactInfo)[] = ['fullName', 'email', 'phone', 'location'];
  const requiredFilled = requiredFields.filter(f => !!data[f]?.trim()).length;
  const requiredScore = (requiredFilled / requiredFields.length) * 70;

  // Optional fields (each worth 10% of total = 30% / 3)
  const optionalFields: (keyof ContactInfo)[] = ['website', 'linkedin', 'github'];
  const optionalFilled = optionalFields.filter(f => !!data[f]?.trim()).length;
  const optionalScore = (optionalFilled / optionalFields.length) * 30;

  return Math.round(requiredScore + optionalScore);
}

// -- Summary: based on content character length --
export function calculateSummaryCompletion(data: { content?: string } | null | undefined): number {
  if (!data || !data.content) return 0;

  const len = data.content.trim().length;
  if (len === 0) return 0;
  if (len < 50) return 25;      // Just started typing
  if (len < 150) return 50;     // Partial summary
  if (len < 300) return 75;     // Good draft
  return 100;                    // Detailed summary
}

// -- Experience: per-item checks for company + position + description --
export function calculateExperienceCompletion(
  data: { items?: ExperienceItem[] } | null | undefined
): number {
  if (!data || !data.items || data.items.length === 0) return 0;

  const itemScores = data.items.map(item => {
    let filled = 0;
    let total = 5; // company, position, location, dates, description

    if (item.company?.trim()) filled++;
    if (item.position?.trim()) filled++;
    if (item.location?.trim()) filled++;
    if (item.startDate?.trim()) filled++;
    if (item.description?.trim()) filled++;

    return (filled / total) * 100;
  });

  // Average across all items
  const average = itemScores.reduce((a, b) => a + b, 0) / itemScores.length;
  return Math.round(average);
}

// -- Education: same pattern as experience --
export function calculateEducationCompletion(
  data: { items?: EducationItem[] } | null | undefined
): number {
  if (!data || !data.items || data.items.length === 0) return 0;

  const itemScores = data.items.map(item => {
    let filled = 0;
    let total = 5; // institution, degree, field, dates, location

    if (item.institution?.trim()) filled++;
    if (item.degree?.trim()) filled++;
    if (item.field?.trim()) filled++;
    if (item.startDate?.trim()) filled++;
    if (item.location?.trim()) filled++;

    return (filled / total) * 100;
  });

  const average = itemScores.reduce((a, b) => a + b, 0) / itemScores.length;
  return Math.round(average);
}

// -- Skills: 0 = 0%, 1-3 = 50%, 4+ = 100% --
export function calculateSkillsCompletion(
  data: { items?: string[] } | null | undefined
): number {
  if (!data || !data.items) return 0;

  const count = data.items.filter(s => s.trim()).length;
  if (count === 0) return 0;
  if (count <= 3) return 50;
  return 100;
}

/**
 * Section weight configuration for overall progress.
 * Weighted average: Contact 10%, Summary 20%, Experience 30%, Education 20%, Skills 20%
 */
export const SECTION_WEIGHTS: Record<string, number> = {
  contact: 10,
  summary: 20,
  experience: 30,
  education: 20,
  skills: 20,
};

// -- Overall weighted progress from a completion map --
export function calculateOverallProgress(
  completionMap: Record<string, number>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [section, weight] of Object.entries(SECTION_WEIGHTS)) {
    const completion = completionMap[section] ?? 0;
    weightedSum += completion * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Determine status label for a completion value.
 */
export function getCompletionStatus(
  value: number
): 'complete' | 'in_progress' | 'not_started' {
  if (value >= 80) return 'complete';
  if (value > 0) return 'in_progress';
  return 'not_started';
}

/**
 * Get color class for a completion value (for dots and bars).
 */
export function getCompletionColor(value: number): string {
  if (value >= 80) return '#22c55e';   // green-500
  if (value > 30) return '#f59e0b';    // amber-500
  return '#4b5563';                     // gray-600
}
