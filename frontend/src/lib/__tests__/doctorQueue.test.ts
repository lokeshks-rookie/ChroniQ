import { describe, it, expect, beforeEach } from 'vitest';
import { computeEtaMinutes, computeEta } from '../queue';
import { useHospitalStore } from '@/store/hospitalStore';
import { useAuthStore } from '@/store/authStore';
import {
  getMyQueue,
  callNextDoctorPatient,
  startDoctorConsultation,
  completeDoctorConsultation,
  saveConsultationDraftNote,
  setDoctorAvailabilityStatus,
  createDoctorLeave,
  cancelDoctorScheduledLeave,
} from '@/services/doctorApi';

describe('Doctor Queue & Availability Vitest Suite', () => {
  beforeEach(() => {
    // Reset stores to default clean test state
    useHospitalStore.getState().resetToDefaults();
    useAuthStore.getState().setRole('doctor');
    useAuthStore.getState().setDoctorId('doc_card_2');
  });

  describe('1. computeEta with offset_minutes (Section 2.5)', () => {
    it('accurately computes ETA including offset_minutes (e.g. break or lateness shift)', () => {
      // Base calculation:
      // Position 1: remaining 5m + 0 ahead = 5 * 1.08 = 5.4 -> 6m
      const baseEta = computeEtaMinutes({
        position: 1,
        avgConsultMinutes: 10,
        remainingCurrentMinutes: 5,
      });
      expect(baseEta).toBe(6);

      // With 15 minutes break or lateness offset:
      const etaWithBreakOffset = computeEtaMinutes({
        position: 1,
        avgConsultMinutes: 10,
        remainingCurrentMinutes: 5,
        offsetMinutes: 15,
      });
      expect(etaWithBreakOffset).toBe(21); // 6 + 15

      // Check computeEta helper compatibility
      const directHelperEta = computeEta({
        position: 2,
        avg_consult_minutes: 10,
        remaining_current_minutes: 5,
        offset_minutes: 20,
      });
      // Position 2: 5 + 10 = 15 * 1.08 = 16.2 -> 17 + 20 = 37
      expect(directHelperEta).toBe(37);
    });
  });

  describe('2. Availability Effect on ETAs and Leave Rescheduling (Section 4 & 40)', () => {
    it('shifts waiting patients ETAs when break is declared and restores on available', async () => {
      const initialQueue = await getMyQueue();
      const firstWaiting = initialQueue.waitingEntries[0];
      expect(firstWaiting).toBeDefined();
      const originalEta = firstWaiting.eta_minutes || 0;

      // Set break for 20 minutes
      const breakUntil = new Date(Date.now() + 20 * 60 * 1000).toISOString();
      await setDoctorAvailabilityStatus({
        status: 'on_break',
        until: breakUntil,
        delay_minutes: 20,
        reason: 'Clinical Tea Break',
      });

      // State check
      const state = useHospitalStore.getState();
      const avail = state.doctor_availability['doc_card_2'];
      expect(avail.status).toBe('on_break');
      expect(avail.delay_minutes).toBe(20);

      // Verify waiting entries in store now have the shifted ETA
      const updatedQueue = await getMyQueue();
      const updatedFirstWaiting = updatedQueue.waitingEntries.find((e) => e.id === firstWaiting.id);
      expect(updatedFirstWaiting?.eta_minutes).toBe(originalEta + 20);

      // Clear break back to available
      await setDoctorAvailabilityStatus({ status: 'available' });
      const resumedState = useHospitalStore.getState();
      expect(resumedState.doctor_availability['doc_card_2'].status).toBe('available');
      const resumedQueue = await getMyQueue();
      const resumedFirstWaiting = resumedQueue.waitingEntries.find((e) => e.id === firstWaiting.id);
      expect(resumedFirstWaiting?.eta_minutes).toBe(originalEta);
    });

    it('marks overlapping appointments with needs_reschedule: true when leave is created', async () => {
      const doctorId = 'doc_card_2';
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Schedule leave for tomorrow
      const res = await createDoctorLeave({
        date_from: tomorrow,
        date_to: tomorrow,
        reason: 'Emergency Medical Conference',
      });
      expect(res.success).toBe(true);

      const store = useHospitalStore.getState();
      // Check that appointments for this doctor tomorrow are flagged needs_reschedule
      const myDoctorAppts = store.appointments.filter(
        (a) => a.doctor_id === doctorId && a.scheduled_start.startsWith(tomorrow) && (a.status === 'booked' || a.status === 'in_queue')
      );
      expect(myDoctorAppts.length).toBeGreaterThan(0);
      myDoctorAppts.forEach((appt) => {
        expect(appt.needs_reschedule).toBe(true);
      });

      // Find the leave and cancel it
      const leave = store.doctor_leaves.find((l) => l.doctor_id === doctorId && l.date_from.startsWith(tomorrow));
      expect(leave).toBeDefined();

      if (leave) {
        await cancelDoctorScheduledLeave(leave.id);
        const afterCancelStore = useHospitalStore.getState();
        const clearedAppts = afterCancelStore.appointments.filter(
          (a) => a.doctor_id === doctorId && a.scheduled_start.startsWith(tomorrow) && (a.status === 'booked' || a.status === 'in_queue')
        );
        clearedAppts.forEach((appt) => {
          expect(appt.needs_reschedule).toBeFalsy();
        });
      }
    });
  });

  describe('3. Strict Scoping Tests (Section 2.7 & 2.8)', () => {
    it('ensures getMyQueue strictly scopes entries to the authenticated doctor', async () => {
      // Test as Dr. Meena Raj (doc_card_2)
      useAuthStore.getState().setDoctorId('doc_card_2');
      const myQueue = await getMyQueue();

      // All waiting entries must belong to doc_card_2
      myQueue.waitingEntries.forEach((entry) => {
        expect(entry.doctor_id).toBe('doc_card_2');
      });

      // Active entry (if any) must belong to doc_card_2
      if (myQueue.activeEntry) {
        expect(myQueue.activeEntry.doctor_id).toBe('doc_card_2');
      }

      // Check against other doctors in the store
      const allEntries = useHospitalStore.getState().queue_entries;
      const otherDoctorEntries = allEntries.filter((e) => e.doctor_id !== 'doc_card_2');
      expect(otherDoctorEntries.length).toBeGreaterThan(0);

      // Verify none of the other doctor entries leak into myQueue
      const otherIds = new Set(otherDoctorEntries.map((e) => e.id));
      myQueue.waitingEntries.forEach((entry) => {
        expect(otherIds.has(entry.id)).toBe(false);
      });
    });

    it('rejects calls when not authenticated as doctor', async () => {
      // Switch role to receptionist without doctor credentials
      useAuthStore.getState().setRole('receptionist');

      await expect(getMyQueue()).rejects.toThrow(/Unauthorized/i);
      await expect(callNextDoctorPatient()).rejects.toThrow(/Unauthorized/i);
    });

    it('runs consultation workflow end-to-end for the authenticated doctor', async () => {
      useAuthStore.getState().setRole('doctor');
      useAuthStore.getState().setDoctorId('doc_card_2');

      const initialQueue = await getMyQueue();
      // If there's an active consultation, complete it first
      if (initialQueue.activeEntry) {
        await completeDoctorConsultation({
          text: 'Completed existing consultation',
          follow_up: '1_week',
        });
      }

      // 1. Call next
      const callRes = await callNextDoctorPatient();
      expect(callRes.success).toBe(true);

      const queueAfterCall = await getMyQueue();
      expect(queueAfterCall.activeEntry).toBeDefined();
      expect(queueAfterCall.activeEntry?.status).toBe('called');
      expect(queueAfterCall.activeEntry?.doctor_id).toBe('doc_card_2');

      // 2. Start consultation
      const startRes = await startDoctorConsultation();
      expect(startRes.success).toBe(true);

      const queueAfterStart = await getMyQueue();
      expect(queueAfterStart.activeEntry?.status).toBe('in_consultation');

      const activeAppointmentId = queueAfterStart.activeEntry!.appointment_id;

      // 3. Draft notes autosave
      const draft = await saveConsultationDraftNote({
        appointment_id: activeAppointmentId,
        patient_id: 'pat_001',
        doctor_id: 'doc_card_2',
        text: 'Patient presented with mild chest tightness. ECG normal.',
        follow_up: '2_weeks',
        finalized: false,
      });
      expect(draft.finalized).toBe(false);
      expect(draft.text).toContain('ECG normal');

      // 4. Complete consultation
      const completeRes = await completeDoctorConsultation({
        text: draft.text,
        follow_up: '2_weeks',
      });
      expect(completeRes.success).toBe(true);

      // Verify activeEntry cleared
      const queueAfterComplete = await getMyQueue();
      expect(queueAfterComplete.activeEntry).toBeNull();

      // Verify finalized note in store
      const state = useHospitalStore.getState();
      const finalized = state.consultation_notes.find((n) => n.appointment_id === activeAppointmentId);
      expect(finalized).toBeDefined();
      expect(finalized?.finalized).toBe(true);
    });
  });
});
