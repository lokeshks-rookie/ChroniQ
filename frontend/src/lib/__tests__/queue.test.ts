import { describe, it, expect } from 'vitest';
import {
  sortQueueEntries,
  isGracePeriodExceeded,
  computeEtaMinutes,
  updateRollingAverage,
  handleQueueSkip,
} from '../queue';
import type { QueueEntry } from '@/types';

describe('Queue Pure Functions', () => {
  describe('sortQueueEntries', () => {
    it('sorts by priority ascending (0 emergency, 1 priority, 2 normal), then sort_time', () => {
      const now = new Date('2026-09-20T10:00:00.000Z').getTime();

      const entries: QueueEntry[] = [
        {
          id: '1',
          appointment_id: 'a1',
          hospital_id: 'h1',
          department_id: 'd1',
          doctor_id: 'doc1',
          queue_date: '2026-09-20',
          token: 'CARD-001',
          token_number: 1,
          priority: 2,
          status: 'waiting',
          sort_time: new Date(now + 10000).toISOString(),
          call_count: 0,
          created_at: new Date(now).toISOString(),
        },
        {
          id: '2',
          appointment_id: 'a2',
          hospital_id: 'h1',
          department_id: 'd1',
          doctor_id: 'doc1',
          queue_date: '2026-09-20',
          token: 'CARD-002',
          token_number: 2,
          priority: 0, // Emergency
          status: 'waiting',
          sort_time: new Date(now + 50000).toISOString(),
          call_count: 0,
          created_at: new Date(now).toISOString(),
        },
        {
          id: '3',
          appointment_id: 'a3',
          hospital_id: 'h1',
          department_id: 'd1',
          doctor_id: 'doc1',
          queue_date: '2026-09-20',
          token: 'CARD-003',
          token_number: 3,
          priority: 1, // Priority (elderly)
          status: 'waiting',
          sort_time: new Date(now + 30000).toISOString(),
          call_count: 0,
          created_at: new Date(now).toISOString(),
        },
        {
          id: '4',
          appointment_id: 'a4',
          hospital_id: 'h1',
          department_id: 'd1',
          doctor_id: 'doc1',
          queue_date: '2026-09-20',
          token: 'CARD-004',
          token_number: 4,
          priority: 2,
          status: 'waiting',
          sort_time: new Date(now + 5000).toISOString(), // earlier slot
          call_count: 0,
          created_at: new Date(now).toISOString(),
        },
      ];

      const sorted = sortQueueEntries(entries);
      expect(sorted[0].id).toBe('2'); // Emergency 0
      expect(sorted[1].id).toBe('3'); // Priority 1
      expect(sorted[2].id).toBe('4'); // Normal 2 (earlier time)
      expect(sorted[3].id).toBe('1'); // Normal 2 (later time)
    });
  });

  describe('isGracePeriodExceeded', () => {
    it('correctly detects arrival within vs beyond grace period', () => {
      const slotStart = '2026-09-20T10:00:00.000Z';
      const onTimeArrival = '2026-09-20T10:05:00.000Z';
      const exactGraceArrival = '2026-09-20T10:10:00.000Z';
      const lateArrival = '2026-09-20T10:12:00.000Z';

      expect(isGracePeriodExceeded(slotStart, onTimeArrival, 10)).toBe(false);
      expect(isGracePeriodExceeded(slotStart, exactGraceArrival, 10)).toBe(false);
      expect(isGracePeriodExceeded(slotStart, lateArrival, 10)).toBe(true);
    });
  });

  describe('computeEtaMinutes', () => {
    it('computes ETA with 8% buffer and rounds up', () => {
      // Position 1 (next): remaining 5m + 0 ahead = 5 * 1.08 = 5.4 -> 6m
      const eta1 = computeEtaMinutes({
        position: 1,
        avgConsultMinutes: 10,
        remainingCurrentMinutes: 5,
      });
      expect(eta1).toBe(6);

      // Position 2: remaining 5m + (2 - 1) * 10 = 15m * 1.08 = 16.2 -> 17m
      const eta2 = computeEtaMinutes({
        position: 2,
        avgConsultMinutes: 10,
        remainingCurrentMinutes: 5,
      });
      expect(eta2).toBe(17);

      // With doctor delay of 15 minutes
      const etaDelay = computeEtaMinutes({
        position: 2,
        avgConsultMinutes: 10,
        remainingCurrentMinutes: 5,
        delayMinutes: 15,
      });
      expect(etaDelay).toBe(32); // 17 + 15
    });
  });

  describe('updateRollingAverage', () => {
    it('applies 0.8 * avg + 0.2 * actual', () => {
      // Current avg 10, actual consult took 15 mins: 0.8 * 10 + 0.2 * 15 = 8 + 3 = 11
      const updated = updateRollingAverage(10, 15);
      expect(updated).toBe(11);
    });
  });

  describe('handleQueueSkip', () => {
    it('moves target entry back one position and increments skip_count', () => {
      const list: QueueEntry[] = [
        { id: 'a', skip_count: 0 } as any,
        { id: 'b', skip_count: 0 } as any,
        { id: 'c', skip_count: 0 } as any,
      ];

      const reordered = handleQueueSkip(list, 'a');
      expect(reordered[0].id).toBe('b');
      expect(reordered[1].id).toBe('a');
      expect(reordered[1].skip_count).toBe(1);
      expect(reordered[2].id).toBe('c');
    });
  });
});
