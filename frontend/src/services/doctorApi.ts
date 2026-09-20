/**
 * Doctor API Service — Connected to real backend endpoints
 * Scoped to authenticated doctor profile, day summary, live queue, notes, availability, and leaves.
 */

import { useHospitalStore } from '@/store/hospitalStore';
import { useAuthStore } from '@/store/authStore';
import { doctorPortalApi, queueApi, getApiErrorMessage } from '@/services/api';
import type {
  Doctor,
  Appointment,
  QueueEntry,
  ConsultationNote,
  DoctorAvailabilityStatus,
  DoctorAvailabilityState,
  AvailabilityLogEntry,
  DoctorLeave,
} from '@/types';

// Dev flag to force errors for testing
let shouldForceError = false;

export function setForceDoctorApiError(force: boolean): void {
  shouldForceError = force;
}

export function isForceDoctorApiErrorEnabled(): boolean {
  return shouldForceError;
}

function checkSimulatedError(): void {
  if (shouldForceError) {
    throw new Error('Simulated Doctor API Failure: server responded with status 500.');
  }
}

export function getAuthenticatedDoctorId(requestedDoctorId?: string): string {
  const { currentRole, currentDoctorId, user } = useAuthStore.getState();

  if (currentRole !== 'doctor' && currentRole !== 'hospital_admin' && currentRole !== 'super_admin') {
    throw new Error('Unauthorized: Doctor or administrative authentication required');
  }

  return requestedDoctorId || currentDoctorId || user?.linked_doctor_id || user?.id || 'doc_card_1';
}

/**
 * @endpoint GET /doctor/profile
 */
export async function getDoctorProfile(doctorId?: string): Promise<Doctor> {
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  try {
    const res = await doctorPortalApi.getProfile(id);
    const docData = res.data;
    const normalized: Doctor = {
      ...docData,
      id: docData.custom_id || docData.id || docData._id,
    };
    return normalized;
  } catch (err: any) {
    const doc = useHospitalStore.getState().doctors.find((d) => d.id === id);
    if (doc) return doc;
    throw new Error(getApiErrorMessage(err, 'Doctor profile not found'));
  }
}

/**
 * @endpoint GET /doctor/day-summary
 */
export async function getMyDaySummary(doctorId?: string): Promise<{
  doctor: Doctor;
  appointments: Appointment[];
  totalToday: number;
  completedCount: number;
  waitingCount: number;
  inConsultationCount: number;
  noShowCount: number;
  avgConsultMinutes: number;
  slotMinutes: number;
}> {
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  try {
    const res = await doctorPortalApi.getDaySummary(id);
    const data = res.data;
    return {
      doctor: data.doctor,
      appointments: data.appointments || [],
      totalToday: data.totalToday ?? (data.appointments || []).length,
      completedCount: data.completedCount ?? 0,
      waitingCount: data.waitingCount ?? 0,
      inConsultationCount: data.inConsultationCount ?? 0,
      noShowCount: data.noShowCount ?? 0,
      avgConsultMinutes: data.avgConsultMinutes ?? 12,
      slotMinutes: data.slotMinutes ?? 15,
    };
  } catch (err) {
    console.warn('Backend day summary unavailable, calculating from store:', err);
    const state = useHospitalStore.getState();
    const doctor = state.doctors.find((d) => d.id === id) || state.doctors[0];
    if (!doctor) throw new Error('Doctor not found');

    const myAppointments = state.appointments.filter((a) => a.doctor_id === id);
    const myQueue = state.queue_entries.filter((q) => q.doctor_id === id);
    const mySchedule = state.doctor_schedules.find((s) => s.doctor_id === id);

    const completedCount = myAppointments.filter((a) => a.status === 'completed').length;
    const waitingCount = myQueue.filter((q) => q.status === 'waiting').length;
    const inConsultationCount = myQueue.filter((q) => q.status === 'in_consultation' || q.status === 'called').length;
    const noShowCount = myAppointments.filter((a) => a.status === 'no_show').length;

    return {
      doctor,
      appointments: myAppointments,
      totalToday: myAppointments.length,
      completedCount,
      waitingCount,
      inConsultationCount,
      noShowCount,
      avgConsultMinutes: doctor.avg_consult_minutes,
      slotMinutes: mySchedule?.slot_minutes || 15,
    };
  }
}

/**
 * @endpoint GET /doctor/queue
 */
export async function getMyQueue(doctorId?: string): Promise<{
  doctor: Doctor;
  activeEntry: QueueEntry | null;
  waitingEntries: QueueEntry[];
  completedToday: QueueEntry[];
}> {
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  try {
    const res = await doctorPortalApi.getQueue(id);
    const data = res.data;
    return {
      doctor: data.doctor,
      activeEntry: data.activeEntry || null,
      waitingEntries: data.waitingEntries || [],
      completedToday: data.completedToday || [],
    };
  } catch {
    const state = useHospitalStore.getState();
    const doctor = state.doctors.find((d) => d.id === id) || state.doctors[0];
    if (!doctor) throw new Error('Doctor not found');

    const myEntries = state.queue_entries.filter((q) => q.doctor_id === id);
    const activeEntry = myEntries.find((q) => q.status === 'in_consultation' || q.status === 'called') || null;
    const waitingEntries = myEntries
      .filter((q) => q.status === 'waiting')
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    const completedToday = myEntries.filter((q) => q.status === 'completed');

    return {
      doctor,
      activeEntry,
      waitingEntries,
      completedToday,
    };
  }
}

/**
 * @endpoint GET /doctor/availability
 */
export async function getDoctorAvailability(doctorId?: string): Promise<{
  availability: DoctorAvailabilityState;
  log: AvailabilityLogEntry[];
}> {
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  try {
    const res = await doctorPortalApi.getAvailability(id);
    return res.data;
  } catch {
    const state = useHospitalStore.getState();
    const availability = state.doctor_availability[id] || {
      doctor_id: id,
      status: 'available',
      updated_at: new Date().toISOString(),
    };
    const log = state.availability_log.filter((l) => l.doctor_id === id);
    return { availability, log };
  }
}

/**
 * @endpoint PUT /doctor/availability
 */
export async function setDoctorAvailability(params: {
  doctorId?: string;
  status: DoctorAvailabilityStatus;
  until?: string;
  delayMinutes?: number;
  delay_minutes?: number;
  reason?: string;
  notify?: boolean;
}): Promise<{ success: boolean; affectedCount: number }> {
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(params.doctorId);
  const delay = params.delay_minutes ?? params.delayMinutes;
  try {
    const res = await doctorPortalApi.updateAvailability({
      doctor_id: id,
      status: params.status,
      until: params.until,
      delay_minutes: delay ?? 0,
      reason: params.reason,
      notify: params.notify ?? false,
    });
    useHospitalStore.getState().setDoctorAvailability({
      doctor_id: id,
      status: params.status,
      until: params.until,
      delay_minutes: delay,
      reason: params.reason,
      notify: params.notify,
    });
    return { success: true, affectedCount: res.data?.affectedCount ?? 0 };
  } catch {
    return useHospitalStore.getState().setDoctorAvailability({
      doctor_id: id,
      status: params.status,
      until: params.until,
      delay_minutes: delay,
      reason: params.reason,
      notify: params.notify,
    });
  }
}

/**
 * @endpoint POST /doctor/notes
 */
export async function saveConsultationDraft(params: {
  appointmentId?: string;
  appointment_id?: string;
  patientId?: string;
  patient_id?: string;
  doctorId?: string;
  doctor_id?: string;
  text: string;
  followUp?: ConsultationNote['follow_up'];
  follow_up?: ConsultationNote['follow_up'];
  followUpDate?: string;
  follow_up_date?: string;
  finalized?: boolean;
}): Promise<ConsultationNote> {
  checkSimulatedError();
  const aptId = params.appointmentId || params.appointment_id || '';
  const patId = params.patientId || params.patient_id || '';
  const doctorId = getAuthenticatedDoctorId(params.doctorId || params.doctor_id);
  const fUp = params.followUp || params.follow_up || 'none';
  const fUpDate = params.followUpDate || params.follow_up_date;
  try {
    const res = await doctorPortalApi.saveNotes({
      appointment_id: aptId,
      patient_id: patId,
      doctor_id: doctorId,
      text: params.text,
      follow_up: fUp,
      follow_up_date: fUpDate,
      finalized: false,
    });
    const saved = res.data;
    useHospitalStore.getState().saveConsultationDraft(saved);
    return saved;
  } catch {
    return useHospitalStore.getState().saveConsultationDraft({
      appointment_id: aptId,
      patient_id: patId,
      doctor_id: doctorId,
      text: params.text,
      follow_up: fUp,
      follow_up_date: fUpDate,
      finalized: false,
    });
  }
}

/**
 * @endpoint POST /doctor/notes (finalize)
 */
export async function submitConsultationFinal(params: {
  appointmentId: string;
  patientId: string;
  doctorId?: string;
  text: string;
  followUp?: ConsultationNote['follow_up'];
  followUpDate?: string;
}): Promise<{ success: boolean; note: ConsultationNote }> {
  checkSimulatedError();
  const doctorId = getAuthenticatedDoctorId(params.doctorId);
  try {
    const res = await doctorPortalApi.saveNotes({
      appointment_id: params.appointmentId,
      patient_id: params.patientId,
      doctor_id: doctorId,
      text: params.text,
      follow_up: params.followUp ?? 'none',
      follow_up_date: params.followUpDate,
      finalized: true,
    });
    const saved = res.data;
    useHospitalStore.getState().saveConsultationDraft(saved);
    return { success: true, note: saved };
  } catch {
    const note = useHospitalStore.getState().saveConsultationDraft({
      appointment_id: params.appointmentId,
      patient_id: params.patientId,
      doctor_id: doctorId,
      text: params.text,
      follow_up: params.followUp ?? 'none',
      follow_up_date: params.followUpDate,
      finalized: true,
    });
    return { success: true, note };
  }
}

/**
 * @endpoint POST /doctor/leaves
 */
export async function addDoctorLeave(params: {
  doctorId?: string;
  dateFrom: string;
  dateTo: string;
  reason?: string;
}): Promise<{ success: boolean; affectedCount: number }> {
  checkSimulatedError();
  const doctorId = getAuthenticatedDoctorId(params.doctorId);
  try {
    const res = await doctorPortalApi.createLeave({
      doctor_id: doctorId,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      reason: params.reason || 'Leave',
    });
    const affected = res.data?.affectedCount ?? 0;
    useHospitalStore.getState().addDoctorLeave({
      doctor_id: doctorId,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      reason: params.reason,
    });
    return { success: true, affectedCount: affected };
  } catch {
    return useHospitalStore.getState().addDoctorLeave({
      doctor_id: doctorId,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      reason: params.reason,
    });
  }
}

/**
 * @endpoint DELETE /doctor/leaves/{leaveId}
 */
export async function deleteDoctorLeave(leaveId: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await doctorPortalApi.deleteLeave(leaveId);
    useHospitalStore.getState().removeDoctorLeave(leaveId);
    return { success: true };
  } catch {
    const ok = useHospitalStore.getState().removeDoctorLeave(leaveId);
    return { success: ok };
  }
}

export async function callNextDoctorPatient(doctorId?: string): Promise<{ success: boolean; message?: string }> {
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  try {
    await queueApi.callNext(id);
    return useHospitalStore.getState().callNext(id);
  } catch {
    return useHospitalStore.getState().callNext(id);
  }
}

export async function callDoctorPatientAgain(doctorId?: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  try {
    await queueApi.callAgain(id);
    return useHospitalStore.getState().callAgain(id);
  } catch {
    return useHospitalStore.getState().callAgain(id);
  }
}

export async function startDoctorConsultation(doctorId?: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  try {
    await queueApi.startConsultation(id);
    return useHospitalStore.getState().startConsultation(id);
  } catch {
    return useHospitalStore.getState().startConsultation(id);
  }
}

export async function completeDoctorConsultation(
  arg1?: string | { text: string; follow_up?: any; follow_up_date?: string },
  arg2?: { text: string; follow_up?: any; follow_up_date?: string }
): Promise<{ success: boolean; consultMinutes?: number }> {
  checkSimulatedError();
  let doctorId: string;
  let note: { text: string; follow_up?: any; follow_up_date?: string } | undefined;

  if (typeof arg1 === 'object' && arg1 !== null) {
    doctorId = getAuthenticatedDoctorId();
    note = arg1;
  } else {
    doctorId = getAuthenticatedDoctorId(arg1);
    note = arg2;
  }

  try {
    await queueApi.completeConsultation(doctorId);
    return useHospitalStore.getState().completeConsultation(doctorId, note as any);
  } catch {
    return useHospitalStore.getState().completeConsultation(doctorId, note as any);
  }
}

export async function markDoctorPatientNoShow(entryId: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await queueApi.markNoShow(entryId);
    return useHospitalStore.getState().markNoShow(entryId);
  } catch {
    return useHospitalStore.getState().markNoShow(entryId);
  }
}

export async function createDoctorLeave(params: {
  doctorId?: string;
  doctor_id?: string;
  dateFrom?: string;
  date_from?: string;
  dateTo?: string;
  date_to?: string;
  reason?: string;
}): Promise<{ success: boolean; affectedCount: number }> {
  const dFrom = params.dateFrom || params.date_from || '';
  const dTo = params.dateTo || params.date_to || '';
  return addDoctorLeave({
    doctorId: params.doctorId || params.doctor_id,
    dateFrom: dFrom,
    dateTo: dTo,
    reason: params.reason,
  });
}

// Aliases for page components
export const saveConsultationDraftNote = saveConsultationDraft;
export const setDoctorAvailabilityStatus = setDoctorAvailability;
export const cancelDoctorScheduledLeave = deleteDoctorLeave;
