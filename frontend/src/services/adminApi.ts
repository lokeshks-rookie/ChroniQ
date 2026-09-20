import { useHospitalStore } from '@/store/hospitalStore';
import type {
  Department,
  Doctor,
  DoctorSchedule,
  DoctorLeave,
  PatientSnapshot,
  Hospital,
  User,
  NotificationTemplate,
} from '@/types';

// Simulated latency helper (250 - 600 ms)
function delay(minMs = 250, maxMs = 600): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Dev flag to force errors for testing error/retry states
let shouldForceError = false;

export function setForceApiError(force: boolean): void {
  shouldForceError = force;
}

export function isForceApiErrorEnabled(): boolean {
  return shouldForceError;
}

function checkSimulatedError(): void {
  if (shouldForceError) {
    throw new Error('Simulated API Failure: server responded with status 500.');
  }
}

/**
 * ==========================================
 * Queue Endpoints
 * ==========================================
 */

/**
 * @endpoint POST /queue/call-next
 * Call the next waiting patient for a doctor
 */
export async function callNextPatient(doctorId: string): Promise<{ success: boolean; message?: string }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().callNext(doctorId);
}

/**
 * @endpoint POST /queue/call-again
 * Re-call an already called patient (increments call count, resets 2:00 timer)
 */
export async function callPatientAgain(doctorId: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().callAgain(doctorId);
}

/**
 * @endpoint POST /queue/start-consultation
 * Start consultation for a called patient
 */
export async function startConsultation(doctorId: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().startConsultation(doctorId);
}

/**
 * @endpoint POST /queue/complete
 * Mark consultation completed and update rolling average duration
 */
export async function completeConsultation(doctorId: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().completeConsultation(doctorId);
}

/**
 * @endpoint POST /queue/skip
 * Skip a waiting patient down one position
 */
export async function skipQueueEntry(entryId: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().skipQueueEntry(entryId);
}

/**
 * @endpoint POST /queue/no-show
 * Mark a patient as no-show after unanswered calls
 */
export async function markQueueNoShow(entryId: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().markNoShow(entryId);
}

/**
 * @endpoint PATCH /queue/{entry_id}/priority
 * Toggle priority 1 status for vulnerable patients
 */
export async function toggleQueuePriority(entryId: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().moveToPriority(entryId);
}

/**
 * @endpoint POST /queue/emergency-insert
 * Insert an emergency patient directly at the top with priority 0
 */
export async function emergencyInsertPatient(params: {
  doctorId: string;
  departmentId: string;
  patientName: string;
  age?: number;
  gender?: string;
  phone?: string;
  reason: string;
}): Promise<{ success: boolean; token: string; appointmentId: string }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().emergencyInsert(params);
}

/**
 * @endpoint POST /notifications/broadcast-delay
 * Broadcast doctor delay and shift all waiting ETAs
 */
export async function broadcastDoctorDelay(params: {
  doctorId: string;
  minutes: number;
  message: string;
}): Promise<{ success: boolean; affectedCount: number }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().broadcastDelay(params);
}

/**
 * ==========================================
 * Walk-in & Check-in Endpoints
 * ==========================================
 */

/**
 * @endpoint POST /walk-in
 * Register a walk-in appointment and generate queue token
 */
export async function registerWalkInPatient(params: {
  patient: PatientSnapshot;
  departmentId: string;
  doctorId: string;
  reason: string;
  priority: number;
}) {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().registerWalkIn(params);
}

/**
 * @endpoint POST /queue/check-in
 * Check in an existing pre-booked appointment at front desk or kiosk
 */
export async function checkInAppointment(appointmentId: string) {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().checkInAppointment(appointmentId);
}

/**
 * ==========================================
 * Appointments Endpoints
 * ==========================================
 */

/**
 * @endpoint PATCH /appointments/{id}/reschedule
 * Reschedule an appointment to a new date/slot
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newDateStr: string,
  newSlotTime: string,
  reason?: string
): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().rescheduleAppointment(appointmentId, newDateStr, newSlotTime, reason);
}

/**
 * @endpoint DELETE /appointments/{id}
 * Cancel an appointment with a reason
 */
export async function cancelAppointment(
  appointmentId: string,
  reason: string,
  notifyPatient?: boolean
): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().cancelAppointment(appointmentId, reason, notifyPatient);
}

/**
 * @endpoint POST /appointments/{id}/confirm
 * Front-desk confirmation flag
 */
export async function confirmAppointmentDesk(appointmentId: string): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().confirmAppointment(appointmentId);
}

/**
 * ==========================================
 * Admin Management Endpoints
 * ==========================================
 */

/**
 * @endpoint POST /admin/departments
 */
export async function createDepartment(dept: Omit<Department, 'id' | 'hospital_id'>): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().addDepartment(dept);
}

/**
 * @endpoint PUT /admin/departments/{id}
 */
export async function updateDepartment(dept: Department): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().updateDepartment(dept);
}

/**
 * @endpoint PATCH /admin/departments/{id}/status
 */
export async function toggleDepartmentStatus(deptId: string): Promise<{ success: boolean; reason?: string }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().toggleDepartmentActive(deptId);
}

/**
 * @endpoint POST /admin/doctors
 */
export async function createDoctor(
  doc: Omit<Doctor, 'id' | 'hospital_id' | 'rating_avg' | 'rating_count' | 'created_at' | 'updated_at'>
): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().addDoctor(doc);
}

/**
 * @endpoint PUT /admin/doctors/{id}
 */
export async function updateDoctor(doc: Doctor): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().updateDoctor(doc);
}

/**
 * @endpoint PATCH /admin/doctors/{id}/status
 */
export async function toggleDoctorStatus(doctorId: string): Promise<{ success: boolean; affectedCount: number }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().toggleDoctorActive(doctorId);
}

/**
 * @endpoint PUT /admin/schedules/{doctor_id}
 */
export async function saveDoctorSchedule(schedule: DoctorSchedule): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().saveDoctorSchedule(schedule);
}

/**
 * @endpoint POST /admin/doctors/{id}/leaves
 */
export async function addDoctorLeave(
  leave: Omit<DoctorLeave, 'id' | 'hospital_id'>
): Promise<{ success: boolean; affectedCount: number }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().addDoctorLeave(leave);
}

/**
 * @endpoint DELETE /admin/doctors/leaves/{leave_id}
 */
export async function deleteDoctorLeave(leaveId: string): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().removeDoctorLeave(leaveId);
}

/**
 * @endpoint PATCH /admin/settings/policies
 */
export async function updateHospitalPolicies(settings: Hospital['settings']): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().updateHospitalSettings(settings);
}

/**
 * @endpoint PATCH /admin/settings/profile
 */
export async function updateHospitalProfile(profile: Partial<Hospital>): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().updateHospitalProfile(profile);
}

/**
 * @endpoint PUT /admin/settings/templates/{type}
 */
export async function saveNotificationTemplate(type: string, template: NotificationTemplate): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().updateTemplate(type, template);
}

/**
 * @endpoint POST /admin/staff
 */
export async function createStaffMember(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().addStaffUser(user);
}

/**
 * @endpoint PUT /admin/staff/{id}
 */
export async function updateStaffMember(user: User): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().updateStaffUser(user);
}

/**
 * @endpoint PATCH /admin/staff/{id}/status
 */
export async function toggleStaffStatus(userId: string): Promise<{ success: boolean; reason?: string }> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().toggleStaffActive(userId);
}

/**
 * @endpoint POST /patients/{id}/notes
 */
export async function addPatientStaffNote(params: {
  patientId: string;
  authorId: string;
  authorName: string;
  note: string;
}): Promise<boolean> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().addPatientNote({
    patient_id: params.patientId,
    author_id: params.authorId,
    author_name: params.authorName,
    note: params.note,
  });
}

/**
 * @endpoint POST /audit/log
 */
export async function logAudit(action: string, details: string): Promise<void> {
  useHospitalStore.getState().logAuditAction(action, details);
}
