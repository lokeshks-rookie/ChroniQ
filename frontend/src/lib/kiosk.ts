import type { Appointment } from '@/types';
import { isGracePeriodExceeded } from './queue';
import { getTodayDateStringIST } from './time';

export const EARLY_CHECKIN_MINUTES = 60;

export function isTooEarlyForCheckIn(
  slotStartTimeIso: string,
  arrivalTimeIso: string,
  earlyCheckInMinutes: number = EARLY_CHECKIN_MINUTES
): boolean {
  const slotStart = new Date(slotStartTimeIso).getTime();
  const arrival = new Date(arrivalTimeIso).getTime();
  const earliestAllowed = slotStart - earlyCheckInMinutes * 60 * 1000;
  return arrival < earliestAllowed;
}

export type CheckInEligibilityResult =
  | 'eligible'
  | 'too_early'
  | 'late'
  | 'already_checked_in'
  | 'cancelled'
  | 'wrong_day'
  | 'not_found';

export interface EligibilityEvaluation {
  result: CheckInEligibilityResult;
  minutesLate?: number;
  openTimeStr?: string;
  appointmentDateStr?: string;
}

/**
 * Privacy Rule: Mask full name to first name + initial only
 * "Arun Kumar" -> "Arun K."
 * "Dr. Meena Raj" -> "Meena R."
 * "Priya" -> "Priya"
 */
export function maskPatientName(name?: string): string {
  if (!name) return 'Patient';
  const clean = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

/**
 * Privacy Rule: Show only last 4 digits of phone number
 * "+91 98401 23456" -> "•••• ••3456"
 * "9840123456" -> "•••• ••3456"
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone || !phone.trim()) {
    return '•••• ••••';
  }
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return '•••• ••••';
  }
  const last4 = digits.slice(-4);
  return `•••• ••${last4}`;
}

/**
 * Pure function to evaluate check-in eligibility at the self-service kiosk
 */
export function getCheckInEligibility(
  appointment: Appointment | null | undefined,
  nowIso: string = new Date().toISOString(),
  gracePeriodMinutes: number = 10
): EligibilityEvaluation {
  if (!appointment) {
    return { result: 'not_found' };
  }

  // 1. Check cancelled
  if (appointment.status === 'cancelled') {
    return { result: 'cancelled' };
  }

  // 2. Check already checked in or active
  if (
    appointment.status === 'in_queue' ||
    appointment.status === 'called' ||
    appointment.status === 'in_consultation' ||
    appointment.status === 'completed'
  ) {
    return { result: 'already_checked_in' };
  }

  // 3. Check wrong day
  const todayStr = getTodayDateStringIST();
  const apptDateStr = appointment.scheduled_start.split('T')[0];
  if (apptDateStr !== todayStr) {
    return {
      result: 'wrong_day',
      appointmentDateStr: appointment.scheduled_start,
    };
  }

  const slotTime = new Date(appointment.scheduled_start).getTime();
  const nowTime = new Date(nowIso).getTime();

  // 4. Check too early (more than 60 minutes before slot)
  const isTooEarly = isTooEarlyForCheckIn(
    appointment.scheduled_start,
    nowIso,
    EARLY_CHECKIN_MINUTES
  );

  if (isTooEarly) {
    const openTime = new Date(slotTime - EARLY_CHECKIN_MINUTES * 60000);
    return {
      result: 'too_early',
      openTimeStr: openTime.toISOString(),
    };
  }

  // 5. Check late arrival (past grace period)
  const isLate = isGracePeriodExceeded(
    appointment.scheduled_start,
    nowIso,
    gracePeriodMinutes
  );

  if (isLate) {
    const diffMs = nowTime - slotTime;
    const minutesLate = Math.max(1, Math.floor(diffMs / 60000));
    return {
      result: 'late',
      minutesLate,
    };
  }

  return { result: 'eligible' };
}
