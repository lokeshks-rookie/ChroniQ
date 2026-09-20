import { useHospitalStore } from '@/store/hospitalStore';
import { useAuthStore } from '@/store/authStore';
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

// Simulated latency helper (250 - 600 ms)
function delay(minMs = 250, maxMs = 600): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Dev flag to force errors for testing error/retry states
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

/**
 * Scoping helper: Ensures requests are strictly bound to the authenticated doctor.
 * Throws Forbidden error if a doctor tries to pass or access another doctor's ID.
 */
export function getAuthenticatedDoctorId(requestedDoctorId?: string): string {
  const { currentRole, currentDoctorId } = useAuthStore.getState();

  if (currentRole !== 'doctor') {
    throw new Error('Unauthorized: Doctor authentication required');
  }

  const effectiveId = currentDoctorId || 'doc_card_2';

  if (requestedDoctorId && requestedDoctorId !== effectiveId) {
    throw new Error(`Forbidden: Access denied to doctor profile ${requestedDoctorId}`);
  }

  return effectiveId;
}

/**
 * @endpoint GET /doctor/profile
 * Fetch the authenticated doctor's full profile and department details
 */
export async function getDoctorProfile(doctorId?: string): Promise<Doctor> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  const doc = useHospitalStore.getState().doctors.find((d) => d.id === id);
  if (!doc) throw new Error('Doctor profile not found');
  return doc;
}

/**
 * @endpoint GET /doctor/day-summary
 * Fetch today's schedule, appointments, and live KPI counters for the doctor
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
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  const state = useHospitalStore.getState();

  const doctor = state.doctors.find((d) => d.id === id);
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

/**
 * @endpoint GET /doctor/queue
 * Fetch live queue entries for the authenticated doctor
 */
export async function getMyQueue(doctorId?: string): Promise<{
  doctor: Doctor;
  activeEntry: QueueEntry | null;
  waitingEntries: QueueEntry[];
  completedToday: QueueEntry[];
}> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  const state = useHospitalStore.getState();

  const doctor = state.doctors.find((d) => d.id === id);
  if (!doctor) throw new Error('Doctor not found');

  const myEntries = state.queue_entries.filter((q) => q.doctor_id === id);
  const activeEntry = myEntries.find((q) => q.status === 'in_consultation' || q.status === 'called') || null;
  const waitingEntries = myEntries.filter((q) => q.status === 'waiting').sort((a, b) => (a.position || 0) - (b.position || 0));
  const completedToday = myEntries.filter((q) => q.status === 'completed');

  return {
    doctor,
    activeEntry,
    waitingEntries,
    completedToday,
  };
}

/**
 * @endpoint POST /queue/call-next
 * Call the next waiting patient for the authenticated doctor
 */
export async function callNextDoctorPatient(doctorId?: string): Promise<{ success: boolean; message?: string }> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  return useHospitalStore.getState().callNext(id);
}

/**
 * @endpoint POST /queue/call-again
 * Repeat voice chime / call announcement for called patient
 */
export async function callDoctorPatientAgain(doctorId?: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  return useHospitalStore.getState().callAgain(id);
}

/**
 * @endpoint POST /queue/start
 * Mark patient consultation started (transitions called -> in_consultation)
 */
export async function startDoctorConsultation(doctorId?: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  return useHospitalStore.getState().startConsultation(id);
}

/**
 * @endpoint POST /queue/complete
 * Mark consultation completed, record notes, and update rolling avg
 */
export async function completeDoctorConsultation(
  note?: { text: string; follow_up: ConsultationNote['follow_up']; follow_up_date?: string },
  doctorId?: string
): Promise<{ success: boolean; consultMinutes?: number }> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  return useHospitalStore.getState().completeConsultation(id, note);
}

/**
 * @endpoint POST /queue/no-show
 * Mark a patient no-show
 */
export async function markDoctorPatientNoShow(entryId: string, doctorId?: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);

  // Scoping check: entry must belong to this doctor
  const entry = useHospitalStore.getState().queue_entries.find((q) => q.id === entryId);
  if (entry && entry.doctor_id !== id) {
    throw new Error('Forbidden: Cannot modify queue entry of another doctor.');
  }

  return useHospitalStore.getState().markNoShow(entryId);
}

/**
 * @endpoint POST /consultations/draft
 * Debounced autosave for consultation clinical note draft
 */
export async function saveConsultationDraftNote(
  draft: Omit<ConsultationNote, 'id' | 'updated_at'>,
  doctorId?: string
): Promise<ConsultationNote> {
  // Faster latency for seamless autosave experience
  await delay(100, 250);
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);

  if (draft.doctor_id && draft.doctor_id !== id) {
    throw new Error('Forbidden: Cannot draft consultation note for another doctor.');
  }

  return useHospitalStore.getState().saveConsultationDraft({
    ...draft,
    doctor_id: id,
  });
}

/**
 * @endpoint GET /doctor/availability
 * Get current availability state and recent log for authenticated doctor
 */
export async function getDoctorAvailabilityData(doctorId?: string): Promise<{
  availability: DoctorAvailabilityState;
  effectiveStatus: {
    status: 'available' | 'in_consultation' | 'on_break' | 'late' | 'on_leave';
    lateMinutes?: number;
    until?: string;
    reason?: string;
  };
  recentLogs: AvailabilityLogEntry[];
  upcomingLeaves: DoctorLeave[];
}> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);
  const state = useHospitalStore.getState();

  const availability = state.doctor_availability[id] || {
    doctor_id: id,
    status: 'available',
    changed_at: new Date().toISOString(),
  };

  const effectiveStatus = state.getDoctorEffectiveStatus(id);
  const recentLogs = state.availability_log.filter((l) => l.doctor_id === id);
  const upcomingLeaves = state.doctor_leaves.filter((l) => l.doctor_id === id);

  return {
    availability,
    effectiveStatus,
    recentLogs,
    upcomingLeaves,
  };
}

/**
 * @endpoint POST /doctor/availability
 * Update doctor availability (available, on_break, late, on_leave)
 */
export async function setDoctorAvailabilityStatus(
  params: {
    status: DoctorAvailabilityStatus;
    until?: string;
    delay_minutes?: number;
    reason?: string;
    notify?: boolean;
  },
  doctorId?: string
): Promise<{ success: boolean; affectedCount: number }> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);

  return useHospitalStore.getState().setDoctorAvailability({
    ...params,
    doctor_id: id,
  });
}

/**
 * @endpoint POST /doctor/leaves
 * Schedule upcoming doctor leave
 */
export async function createDoctorLeave(
  leave: {
    date_from: string;
    date_to: string;
    reason: string;
  },
  doctorId?: string
): Promise<{ success: boolean; affectedCount: number }> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);

  return useHospitalStore.getState().addDoctorLeave({
    ...leave,
    doctor_id: id,
  });
}

/**
 * @endpoint DELETE /doctor/leaves/:id
 * Cancel an upcoming scheduled leave
 */
export async function cancelDoctorScheduledLeave(leaveId: string, doctorId?: string): Promise<boolean> {
  await delay();
  checkSimulatedError();
  const id = getAuthenticatedDoctorId(doctorId);

  const leave = useHospitalStore.getState().doctor_leaves.find((l) => l.id === leaveId);
  if (leave && leave.doctor_id !== id) {
    throw new Error('Forbidden: Cannot cancel leave belonging to another doctor.');
  }

  return useHospitalStore.getState().removeDoctorLeave(leaveId);
}
