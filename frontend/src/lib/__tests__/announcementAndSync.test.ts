import { describe, it, expect } from 'vitest';
import {
  AnnouncementQueue,
  formatTokenForSpeech,
} from '../announce';
import type { CallEvent } from '@/types';
import { SyncManager } from '../sync';

describe('Section 4.6 - Announcements & Cross-Tab Sync (announce.ts & sync.ts)', () => {
  describe('1. Spoken Token Formatting', () => {
    it('spells tokens as separate letters and digits with natural pauses', () => {
      expect(formatTokenForSpeech('CARD-015')).toBe('C A R D, zero one five');
      expect(formatTokenForSpeech('ORTH-102')).toBe('O R T H, one zero two');
      expect(formatTokenForSpeech('OPD-001')).toBe('O P D, zero zero one');
    });
  });

  describe('2. Announcement Queue Rules', () => {
    it('enforces FIFO ordering, cap of 5 (drops oldest when exceeding 5), and flags Second call', () => {
      const queue = new AnnouncementQueue(5);
      const now = Date.now();

      // Create 6 events with call_count = 1, except event 3 with call_count = 2
      for (let i = 1; i <= 6; i++) {
        const callEvent: CallEvent = {
          id: `ev_${i}`,
          entry_id: `entry_${i}`,
          token: `CARD-00${i}`,
          doctor_id: 'doc_1',
          department_id: 'dep_card',
          room: 'Room 101',
          call_count: i === 3 ? 2 : 1,
          at: new Date(now + i * 100).toISOString(),
        };

        const enqueued = queue.enqueue(callEvent, 'en');
        expect(enqueued).toBe(true);
      }

      // Max capacity is 5, so ev_1 must have been dropped, leaving ev_2 to ev_6
      expect(queue.size()).toBe(5);

      // Peek next should be ev_2
      const first = queue.peek();
      expect(first?.event.id).toBe('ev_2');
      expect(first?.isSecondCall).toBe(false);

      // Dequeue ev_2
      const dequeued2 = queue.dequeue();
      expect(dequeued2?.event.id).toBe('ev_2');

      // Next should be ev_3, which has call_count = 2 ("Second call")
      const dequeued3 = queue.dequeue();
      expect(dequeued3?.event.id).toBe('ev_3');
      expect(dequeued3?.isSecondCall).toBe(true);
      expect(dequeued3?.text).toContain('Second call');
    });

    it('ignores call events older than 20 seconds on load/enqueue', () => {
      const queue = new AnnouncementQueue(5);
      const staleTime = new Date(Date.now() - 25000).toISOString(); // 25s ago (> 20s)

      const staleEvent: CallEvent = {
        id: 'ev_old',
        entry_id: 'entry_old',
        token: 'CARD-001',
        doctor_id: 'doc_1',
        department_id: 'dep_card',
        room: 'Room 101',
        call_count: 1,
        at: staleTime,
      };

      const accepted = queue.enqueue(staleEvent, 'en');
      expect(accepted).toBe(false);
      expect(queue.size()).toBe(0);

      // Fresh event within 20s
      const freshEvent: CallEvent = {
        id: 'ev_fresh',
        entry_id: 'entry_fresh',
        token: 'CARD-002',
        doctor_id: 'doc_1',
        department_id: 'dep_card',
        room: 'Room 101',
        call_count: 1,
        at: new Date(Date.now() - 5000).toISOString(), // 5s ago
      };

      const freshAccepted = queue.enqueue(freshEvent, 'en');
      expect(freshAccepted).toBe(true);
      // Fresh event was accepted and immediately moved to active playback
      expect(queue.isBusy()).toBe(true);

      // A second fresh event will wait in the queue
      const freshEvent2: CallEvent = {
        ...freshEvent,
        id: 'ev_fresh_2',
        token: 'CARD-003',
      };
      queue.enqueue(freshEvent2, 'en');
      expect(queue.size()).toBe(1);
    });
  });

  describe('3. Cross-Tab Sync Snapshot Versioning Rules', () => {
    it('applies snapshots only if version is newer, and ignores own echoes', () => {
      let appliedSnapshot: any = null;
      let currentVersion = 10;

      const sync = new SyncManager({
        getSnapshot: () => ({ version: currentVersion }),
        applySnapshot: (snap, ver) => {
          appliedSnapshot = snap;
          if (ver) currentVersion = ver;
        },
        tabId: 'tab_alpha',
        initialVersion: 10,
      });

      // 1. Echo message from same tab_id -> must be ignored
      const echoMsg = {
        type: 'SNAPSHOT' as const,
        tab_id: 'tab_alpha',
        version: 15,
        heartbeat_at: new Date().toISOString(),
        state: { test: 'echo' },
      };
      sync.handleChannelMessage({ data: echoMsg });
      expect(appliedSnapshot).toBeNull();

      // 2. Snapshot from another tab with OLDER version (v8 <= v10) -> rejected
      const olderMsg = {
        type: 'SNAPSHOT' as const,
        tab_id: 'tab_beta',
        version: 8,
        heartbeat_at: new Date().toISOString(),
        state: { test: 'stale' },
      };
      sync.handleChannelMessage({ data: olderMsg });
      expect(appliedSnapshot).toBeNull();

      // 3. Snapshot from another tab with EQUAL version (v10 <= v10) -> rejected
      const equalMsg = {
        type: 'SNAPSHOT' as const,
        tab_id: 'tab_beta',
        version: 10,
        heartbeat_at: new Date().toISOString(),
        state: { test: 'equal' },
      };
      sync.handleChannelMessage({ data: equalMsg });
      expect(appliedSnapshot).toBeNull();

      // 4. Snapshot from another tab with NEWER version (v12 > v10) -> applied
      const newerMsg = {
        type: 'SNAPSHOT' as const,
        tab_id: 'tab_beta',
        version: 12,
        heartbeat_at: new Date().toISOString(),
        state: { test: 'fresh_data' },
      };
      sync.handleChannelMessage({ data: newerMsg });
      expect(appliedSnapshot).toEqual({ test: 'fresh_data' });
      expect(currentVersion).toBe(12);

      sync.destroy();
    });
  });
});
