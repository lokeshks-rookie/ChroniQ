import { describe, it, expect } from 'vitest';
import { selectBoard, roundWait, pageTiles, type DisplayDoctorTile } from '../display';
import type { Doctor, Department, QueueEntry, DoctorAvailabilityState } from '@/types';

describe('Section 4.6 - Display Board Pure Functions (lib/display.ts)', () => {
  const mockDepartments: Department[] = [
    {
      id: 'dep_card',
      hospital_id: 'hosp_test',
      name: 'Cardiology',
      token_prefix: 'CARD',
      is_active: true,
      room: '101-105',
    },
    {
      id: 'dep_ortho',
      hospital_id: 'hosp_test',
      name: 'Orthopaedics',
      token_prefix: 'ORTH',
      is_active: true,
      room: '201-204',
    },
  ];

  const mockDoctors: Doctor[] = [
    {
      id: 'doc_1',
      hospital_id: 'hosp_test',
      department_id: 'dep_card',
      name: 'Dr. Anand Ramanathan',
      specialty: 'Senior Cardiologist',
      room: 'Room 101',
      is_active: true,
      avg_consult_minutes: 12,
      qualifications: ['MBBS', 'MD'],
      experience_years: 15,
      fee: 800,
      languages: ['English', 'Tamil'],
      rating_avg: 4.8,
      rating_count: 120,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc_2',
      hospital_id: 'hosp_test',
      department_id: 'dep_card',
      name: 'Dr. Priya Sundaram',
      specialty: 'Cardiologist',
      room: 'Room 102',
      is_active: true,
      avg_consult_minutes: 10,
      qualifications: ['MBBS', 'MD'],
      experience_years: 10,
      fee: 700,
      languages: ['English', 'Tamil'],
      rating_avg: 4.9,
      rating_count: 85,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  describe('1. roundWait function', () => {
    it('returns "under 5 min" for wait times less than 5 minutes', () => {
      expect(roundWait(0)).toBe('under 5 min');
      expect(roundWait(1)).toBe('under 5 min');
      expect(roundWait(3)).toBe('under 5 min');
      expect(roundWait(4.5)).toBe('under 5 min');
    });

    it('rounds up to nearest 5 minutes for wait times >= 5 minutes', () => {
      expect(roundWait(5)).toBe('about 5 min');
      expect(roundWait(6)).toBe('about 10 min');
      expect(roundWait(10)).toBe('about 10 min');
      expect(roundWait(11)).toBe('about 15 min');
      expect(roundWait(24)).toBe('about 25 min');
      expect(roundWait(25)).toBe('about 25 min');
    });
  });

  describe('2. selectBoard Privacy Verification (Hard Rule)', () => {
    it('runtime output objects MUST NOT contain any patient identifiers or medical reasons', () => {
      const mockQueueEntries: QueueEntry[] = [
        {
          id: 'q_1',
          appointment_id: 'apt_1',
          hospital_id: 'hosp_test',
          department_id: 'dep_card',
          doctor_id: 'doc_1',
          token: 'CARD-010',
          position: 1,
          status: 'called',
          priority: 0, // Emergency
          sort_time: new Date().toISOString(),
          eta_minutes: 2,
          created_at: new Date().toISOString(),
          patient: {
            id: 'pat_1',
            name: 'Secret Patient Real Name',
            phone: '+91 99999 12345',
            age: 45,
            gender: 'male',
          },
          reason: 'Severe Chest Pain - Urgent',
        } as any,
      ];

      const board = selectBoard({
        hospitalId: 'hosp_test',
        deptId: 'all',
        doctors: mockDoctors,
        departments: mockDepartments,
        queue_entries: mockQueueEntries,
        broadcasts: [],
        availabilityStates: {},
      });

      // Verify doctor tiles have no patient fields
      expect(board.doctorTiles).toHaveLength(2);
      for (const tile of board.doctorTiles) {
        const json = JSON.stringify(tile);
        expect(json).not.toContain('Secret Patient Real Name');
        expect(json).not.toContain('99999 12345');
        expect(json).not.toContain('Severe Chest Pain');
        expect(json).not.toContain('pat_1');
        expect((tile as any).patient_name).toBeUndefined();
        expect((tile as any).patient).toBeUndefined();
        expect((tile as any).phone).toBeUndefined();
        expect((tile as any).reason).toBeUndefined();
      }

      // Verify nextInLine has only token, room, waitStr, etaMinutes, sort_time
      expect(board.nextInLine).toHaveLength(0); // called entry is not waiting

      // Add waiting entries
      const waitingEntries: QueueEntry[] = [
        {
          id: 'q_2',
          appointment_id: 'apt_2',
          hospital_id: 'hosp_test',
          department_id: 'dep_card',
          doctor_id: 'doc_1',
          token: 'CARD-011',
          position: 2,
          status: 'waiting',
          priority: 0, // emergency entry
          sort_time: new Date(Date.now() + 1000).toISOString(),
          eta_minutes: 12,
          created_at: new Date().toISOString(),
          patient: {
            id: 'pat_2',
            name: 'Confidential Person',
            phone: '8888877777',
            age: 60,
            gender: 'female',
          },
          reason: 'Cardiac Arrest',
        } as any,
      ];

      const boardWithWaiting = selectBoard({
        hospitalId: 'hosp_test',
        deptId: 'all',
        doctors: mockDoctors,
        departments: mockDepartments,
        queue_entries: waitingEntries,
        broadcasts: [],
        availabilityStates: {},
      });

      expect(boardWithWaiting.nextInLine).toHaveLength(1);
      const nextItem = boardWithWaiting.nextInLine[0];
      expect(nextItem.token).toBe('CARD-011');
      expect((nextItem as any).patient_name).toBeUndefined();
      expect((nextItem as any).patient).toBeUndefined();
      expect((nextItem as any).phone).toBeUndefined();
      expect((nextItem as any).reason).toBeUndefined();
      expect((nextItem as any).priority).toBeUndefined(); // Emergency tags not exposed
      expect(JSON.stringify(nextItem)).not.toContain('Confidential Person');
      expect(JSON.stringify(nextItem)).not.toContain('Cardiac Arrest');
    });
  });

  describe('3. Calling takes precedence over Serving', () => {
    it('displays calling state with accent fill when doctor has a called patient even if another entry was in consultation', () => {
      const queueEntries: QueueEntry[] = [
        {
          id: 'q_serving',
          appointment_id: 'apt_srv',
          hospital_id: 'hosp_test',
          department_id: 'dep_card',
          doctor_id: 'doc_1',
          queue_date: '2026-09-20',
          token: 'CARD-008',
          token_number: 8,
          position: 1,
          status: 'in_consultation',
          priority: 2,
          call_count: 1,
          sort_time: new Date().toISOString(),
          eta_minutes: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: 'q_called',
          appointment_id: 'apt_cld',
          hospital_id: 'hosp_test',
          department_id: 'dep_card',
          doctor_id: 'doc_1',
          queue_date: '2026-09-20',
          token: 'CARD-009',
          token_number: 9,
          position: 2,
          status: 'called',
          priority: 2,
          call_count: 1,
          sort_time: new Date().toISOString(),
          eta_minutes: 0,
          created_at: new Date().toISOString(),
        },
      ];

      const board = selectBoard({
        hospitalId: 'hosp_test',
        deptId: 'dep_card',
        doctors: mockDoctors,
        departments: mockDepartments,
        queue_entries: queueEntries,
        broadcasts: [],
        availabilityStates: {},
      });

      const doc1Tile = board.doctorTiles.find((t) => t.doctor_id === 'doc_1');
      expect(doc1Tile).toBeDefined();
      expect(doc1Tile?.state).toBe('calling');
      expect(doc1Tile?.token).toBe('CARD-009');
      expect(doc1Tile?.statusText).toBe('Now calling');
    });

    it('displays serving state when doctor has in_consultation entry and no called entry', () => {
      const queueEntries: QueueEntry[] = [
        {
          id: 'q_serving',
          appointment_id: 'apt_srv',
          hospital_id: 'hosp_test',
          department_id: 'dep_card',
          doctor_id: 'doc_1',
          queue_date: '2026-09-20',
          token: 'CARD-008',
          token_number: 8,
          position: 1,
          status: 'in_consultation',
          priority: 2,
          call_count: 1,
          sort_time: new Date().toISOString(),
          eta_minutes: 0,
          created_at: new Date().toISOString(),
        },
      ];

      const board = selectBoard({
        hospitalId: 'hosp_test',
        deptId: 'dep_card',
        doctors: mockDoctors,
        departments: mockDepartments,
        queue_entries: queueEntries,
        broadcasts: [],
        availabilityStates: {},
      });

      const doc1Tile = board.doctorTiles.find((t) => t.doctor_id === 'doc_1');
      expect(doc1Tile?.state).toBe('serving');
      expect(doc1Tile?.token).toBe('CARD-008');
      expect(doc1Tile?.statusText).toBe('Now serving');
    });

    it('displays break state when doctor is on break', () => {
      const availStates: Record<string, DoctorAvailabilityState> = {
        doc_1: {
          doctor_id: 'doc_1',
          status: 'on_break',
          until: '13:30',
          changed_at: new Date().toISOString(),
        },
      };

      const board = selectBoard({
        hospitalId: 'hosp_test',
        deptId: 'dep_card',
        doctors: mockDoctors,
        departments: mockDepartments,
        queue_entries: [],
        broadcasts: [],
        availabilityStates: availStates,
      });

      const doc1Tile = board.doctorTiles.find((t) => t.doctor_id === 'doc_1');
      expect(doc1Tile?.state).toBe('on_break');
      expect(doc1Tile?.statusText).toContain('On break until 13:30');
    });
  });

  describe('4. Next in Line Cap of 8 & ETA Ordering', () => {
    it('orders by ETA ascending (ties by token) and caps at 8 items with +N more waiting counter', () => {
      const entries: QueueEntry[] = Array.from({ length: 12 }, (_, i) => ({
        id: `q_wait_${i}`,
        appointment_id: `apt_wait_${i}`,
        hospital_id: 'hosp_test',
        department_id: 'dep_card',
        doctor_id: 'doc_1',
        queue_date: '2026-09-20',
        token: `CARD-${String(100 + i).padStart(3, '0')}`,
        token_number: 100 + i,
        position: i + 1,
        status: 'waiting' as const,
        priority: 2,
        call_count: 0,
        sort_time: new Date(Date.now() + (12 - i) * 60000).toISOString(),
        eta_minutes: (12 - i) * 5, // 60, 55, 50, ..., 5
        created_at: new Date().toISOString(),
      }));

      const board = selectBoard({
        hospitalId: 'hosp_test',
        deptId: 'dep_card',
        doctors: mockDoctors,
        departments: mockDepartments,
        queue_entries: entries,
        broadcasts: [],
        availabilityStates: {},
      });

      expect(board.nextInLine).toHaveLength(8);
      expect(board.totalWaitingAcrossScope).toBe(12);
      expect(board.moreWaitingCount).toBe(4);

      // Verify ascending ETA ordering (smallest ETA first)
      for (let i = 0; i < board.nextInLine.length - 1; i++) {
        expect(board.nextInLine[i].etaMinutes).toBeLessThanOrEqual(board.nextInLine[i + 1].etaMinutes);
      }
      expect(board.nextInLine[0].token).toBe('CARD-111'); // eta_minutes = 5
    });
  });

  describe('5. Page Rotation (pageTiles)', () => {
    it('correctly chunks tiles into pages of 4 tiles max', () => {
      const dummyTiles: DisplayDoctorTile[] = Array.from({ length: 10 }, (_, i) => ({
        doctorId: `doc_${i}`,
        doctor_id: `doc_${i}`,
        doctorName: `Dr. Doctor ${i}`,
        doctor_name: `Dr. Doctor ${i}`,
        department_id: 'dep_card',
        department_name: 'Cardiology',
        room: `Room 10${i}`,
        state: 'available_empty' as const,
        token: null,
        statusText: 'No patients waiting',
      }));

      const page0 = pageTiles(dummyTiles, 0);
      expect(page0.visibleTiles).toHaveLength(4);
      expect(page0.totalPages).toBe(3);
      expect(page0.currentPage).toBe(0);

      const page1 = pageTiles(dummyTiles, 1);
      expect(page1.visibleTiles).toHaveLength(4);
      expect(page1.currentPage).toBe(1);

      const page2 = pageTiles(dummyTiles, 2);
      expect(page2.visibleTiles).toHaveLength(2);
      expect(page2.currentPage).toBe(2);

      // Wrap-around
      const page3 = pageTiles(dummyTiles, 3);
      expect(page3.currentPage).toBe(0);
    });
  });
});
