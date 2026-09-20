import { describe, it, expect } from 'vitest';
import {
  getCheckInEligibility,
  maskPatientName,
  maskPhoneNumber,
  isTooEarlyForCheckIn,
} from '../kiosk';
import type { Appointment } from '@/types';
import { getTodayDateStringIST } from '../time';

describe('Section 4.6 - Kiosk Check-In Rules & Privacy (lib/kiosk.ts)', () => {
  describe('1. Privacy Masking Functions', () => {
    it('masks full names to first name + initial only', () => {
      expect(maskPatientName('Arun Kumar')).toBe('Arun K.');
      expect(maskPatientName('Deepa Sundaram')).toBe('Deepa S.');
      expect(maskPatientName('Vijay')).toBe('Vijay');
      expect(maskPatientName('Dr. Vijay Anand')).toBe('Vijay A.');
      expect(maskPatientName('')).toBe('Patient');
    });

    it('masks phone numbers showing only the last 4 digits', () => {
      expect(maskPhoneNumber('9876543210')).toBe('•••• ••3210');
      expect(maskPhoneNumber('+91 9876543210')).toBe('•••• ••3210');
      expect(maskPhoneNumber('3210')).toBe('•••• ••3210');
      expect(maskPhoneNumber('')).toBe('•••• ••••');
    });
  });

  describe('2. Check-In Eligibility Evaluation (Table Compliance)', () => {
    const today = getTodayDateStringIST();

    const baseAppointment: Appointment = {
      id: 'apt_test_1',
      hospital_id: 'hosp_test',
      department_id: 'dep_card',
      department_name: 'Cardiology',
      doctor_id: 'doc_1',
      doctor_name: 'Dr. Anand Ramanathan',
      patient_id: 'pat_1',
      patient: {
        name: 'Arun Kumar',
        phone: '9876543210',
        age: 38,
        gender: 'male',
      },
      scheduled_start: `${today}T10:30:00.000Z`,
      scheduled_end: `${today}T10:45:00.000Z`,
      status: 'booked',
      type: 'booked',
      booking_code: 'BK-12345',
      fee: 800,
      created_via: 'web',
      status_history: [],
      hospital_name: 'City Care Hospital',
      created_at: `${today}T08:00:00.000Z`,
      updated_at: `${today}T08:00:00.000Z`,
    };

    it('returns not_found when appointment is null or undefined', () => {
      expect(getCheckInEligibility(null).result).toBe('not_found');
      expect(getCheckInEligibility(undefined).result).toBe('not_found');
    });

    it('returns cancelled when appointment is cancelled', () => {
      const appt: Appointment = { ...baseAppointment, status: 'cancelled' };
      const evalRes = getCheckInEligibility(appt, `${today}T10:20:00.000Z`);
      expect(evalRes.result).toBe('cancelled');
    });

    it('returns already_checked_in when status is in_queue, called, in_consultation, or completed', () => {
      const statuses: Appointment['status'][] = ['in_queue', 'called', 'in_consultation', 'completed'];
      for (const st of statuses) {
        const appt: Appointment = { ...baseAppointment, status: st };
        const evalRes = getCheckInEligibility(appt, `${today}T10:20:00.000Z`);
        expect(evalRes.result).toBe('already_checked_in');
      }
    });

    it('returns wrong_day when appointment date does not match today', () => {
      const appt: Appointment = {
        ...baseAppointment,
        scheduled_start: '2026-11-20T10:30:00.000Z',
      };
      const evalRes = getCheckInEligibility(appt, `${today}T10:20:00.000Z`);
      expect(evalRes.result).toBe('wrong_day');
      expect(evalRes.appointmentDateStr).toBe('2026-11-20T10:30:00.000Z');
    });

    it('returns too_early when arrival is more than EARLY_CHECKIN_MINUTES (60 min) before slot', () => {
      // Slot is at 10:30. Check-in at 09:15 (75 min before slot) -> too early
      const evalRes = getCheckInEligibility(
        baseAppointment,
        `${today}T09:15:00.000Z`,
        10
      );
      expect(evalRes.result).toBe('too_early');
      expect(evalRes.openTimeStr).toBeDefined();
    });

    it('returns eligible when arrival is within 60 minutes before slot up to slot start + grace period', () => {
      // Slot is at 10:30. Check-in at 09:45 (45 min before slot) -> eligible
      const evalEarly = getCheckInEligibility(
        baseAppointment,
        `${today}T09:45:00.000Z`,
        10
      );
      expect(evalEarly.result).toBe('eligible');

      // Check-in exactly on slot time 10:30 -> eligible
      const evalExact = getCheckInEligibility(
        baseAppointment,
        `${today}T10:30:00.000Z`,
        10
      );
      expect(evalExact.result).toBe('eligible');

      // Check-in at 10:38 (within 10m grace period) -> eligible
      const evalWithinGrace = getCheckInEligibility(
        baseAppointment,
        `${today}T10:38:00.000Z`,
        10
      );
      expect(evalWithinGrace.result).toBe('eligible');
    });

    it('returns late when arrival exceeds grace period after slot', () => {
      // Slot is at 10:30. Check-in at 10:45 with 10m grace period -> 15 min late
      const evalLate = getCheckInEligibility(
        baseAppointment,
        `${today}T10:45:00.000Z`,
        10
      );
      expect(evalLate.result).toBe('late');
      expect(evalLate.minutesLate).toBe(15);
    });

    it('validates isTooEarlyForCheckIn utility boundary', () => {
      const slot = `${today}T10:00:00.000Z`;
      // 61 min before -> true
      expect(isTooEarlyForCheckIn(slot, `${today}T08:59:00.000Z`, 60)).toBe(true);
      // 60 min before -> false
      expect(isTooEarlyForCheckIn(slot, `${today}T09:00:00.000Z`, 60)).toBe(false);
      // 30 min before -> false
      expect(isTooEarlyForCheckIn(slot, `${today}T09:30:00.000Z`, 60)).toBe(false);
    });
  });
});
