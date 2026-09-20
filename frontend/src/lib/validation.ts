import type { WeeklyRule } from '@/types';

export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Converts "HH:MM" time string to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

/**
 * Validate a single day's weekly rule:
 * - End must be strictly after start
 * - Each break must be valid (start < end)
 * - Breaks must be within start and end
 * - Breaks must not overlap each other
 */
export function validateWeeklyRule(rule: WeeklyRule): ScheduleValidationResult {
  const errors: string[] = [];
  const startMin = timeToMinutes(rule.start);
  const endMin = timeToMinutes(rule.end);

  if (endMin <= startMin) {
    errors.push(`End time (${rule.end}) must be after start time (${rule.start}).`);
  }

  // Check breaks
  for (let i = 0; i < rule.breaks.length; i++) {
    const b = rule.breaks[i];
    const bStart = timeToMinutes(b.start);
    const bEnd = timeToMinutes(b.end);

    if (bEnd <= bStart) {
      errors.push(`Break ${i + 1} (${b.start}–${b.end}) must have end after start.`);
    }

    if (bStart < startMin || bEnd > endMin) {
      errors.push(`Break ${i + 1} (${b.start}–${b.end}) must fall completely within shift hours (${rule.start}–${rule.end}).`);
    }

    // Check overlap with other breaks
    for (let j = i + 1; j < rule.breaks.length; j++) {
      const other = rule.breaks[j];
      const otherStart = timeToMinutes(other.start);
      const otherEnd = timeToMinutes(other.end);

      if (Math.max(bStart, otherStart) < Math.min(bEnd, otherEnd)) {
        errors.push(`Break ${i + 1} (${b.start}–${b.end}) overlaps with Break ${j + 1} (${other.start}–${other.end}).`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate an entire weekly schedule
 */
export function validateDoctorSchedule(rules: WeeklyRule[]): ScheduleValidationResult {
  const allErrors: string[] = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (const rule of rules) {
    const result = validateWeeklyRule(rule);
    if (!result.isValid) {
      const dayLabel = dayNames[rule.weekday] ?? `Day ${rule.weekday}`;
      allErrors.push(...result.errors.map((e) => `${dayLabel}: ${e}`));
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Check if two date ranges overlap: [startA, endA] and [startB, endB]
 */
export function isDateRangeOverlapping(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  return Math.max(sA, sB) <= Math.min(eA, eB);
}
