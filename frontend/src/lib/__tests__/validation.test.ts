import { describe, it, expect } from 'vitest';
import { validateWeeklyRule, validateDoctorSchedule, isDateRangeOverlapping } from '../validation';
import type { WeeklyRule } from '@/types';

describe('Schedule Validation Pure Functions', () => {
  it('validates rule where end is after start and breaks are inside working hours', () => {
    const validRule: WeeklyRule = {
      weekday: 0,
      start: '09:00',
      end: '17:00',
      breaks: [{ start: '13:00', end: '14:00' }],
    };

    const res = validateWeeklyRule(validRule);
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('fails when end time is before or equal to start time', () => {
    const invalidRule: WeeklyRule = {
      weekday: 0,
      start: '17:00',
      end: '09:00',
      breaks: [],
    };

    const res = validateWeeklyRule(invalidRule);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('must be after start time');
  });

  it('fails when breaks fall outside working hours', () => {
    const breakOutside: WeeklyRule = {
      weekday: 0,
      start: '09:00',
      end: '17:00',
      breaks: [{ start: '17:30', end: '18:00' }],
    };

    const res = validateWeeklyRule(breakOutside);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('must fall completely within shift hours');
  });

  it('fails when breaks overlap each other', () => {
    const overlappingBreaks: WeeklyRule = {
      weekday: 0,
      start: '09:00',
      end: '17:00',
      breaks: [
        { start: '12:00', end: '13:30' },
        { start: '13:00', end: '14:00' },
      ],
    };

    const res = validateWeeklyRule(overlappingBreaks);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('overlaps with Break 2');
  });

  it('validates entire doctor schedule rules collection', () => {
    const rules: WeeklyRule[] = [
      { weekday: 0, start: '09:00', end: '17:00', breaks: [] },
      { weekday: 1, start: '09:00', end: '17:00', breaks: [] },
    ];
    const res = validateDoctorSchedule(rules);
    expect(res.isValid).toBe(true);
  });

  it('validates date range overlap accurately', () => {
    expect(
      isDateRangeOverlapping(
        '2026-09-20',
        '2026-09-25',
        '2026-09-22',
        '2026-09-28'
      )
    ).toBe(true);

    expect(
      isDateRangeOverlapping(
        '2026-09-20',
        '2026-09-22',
        '2026-09-24',
        '2026-09-28'
      )
    ).toBe(false);
  });
});
