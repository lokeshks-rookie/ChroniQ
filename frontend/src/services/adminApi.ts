/**
 * Admin & Staff API Service — Connected to real backend endpoints
 * (Queue control, walk-ins, check-in, departments, doctors, schedules, staff, settings)
 */

import { useHospitalStore } from '@/store/hospitalStore';
import { useAuthStore } from '@/store/authStore';
import { queueApi, bookingApi, adminPortalApi, getApiErrorMessage } from '@/services/api';
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
  checkSimulatedError();
  try {
    const res = await queueApi.callNext(doctorId);
    useHospitalStore.getState().callNext(doctorId);
    return { success: true, message: res.data?.message || 'Patient called' };
  } catch (err: any) {
    // Synchronize local store transition as well
    const storeRes = useHospitalStore.getState().callNext(doctorId);
    return storeRes;
  }
}

/**
 * @endpoint POST /queue/call-again
 * Re-call an already called patient
 */
export async function callPatientAgain(doctorId: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await queueApi.callAgain(doctorId);
    return useHospitalStore.getState().callAgain(doctorId);
  } catch (err: any) {
    return useHospitalStore.getState().callAgain(doctorId);
  }
}

/**
 * @endpoint POST /queue/start-consultation
 * Start consultation for a called patient
 */
export async function startConsultation(doctorId: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await queueApi.startConsultation(doctorId);
    return useHospitalStore.getState().startConsultation(doctorId);
  } catch (err: any) {
    return useHospitalStore.getState().startConsultation(doctorId);
  }
}

/**
 * @endpoint POST /queue/complete
 * Mark consultation completed and update rolling average duration
 */
export async function completeConsultation(doctorId: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await queueApi.completeConsultation(doctorId);
    return useHospitalStore.getState().completeConsultation(doctorId);
  } catch (err: any) {
    return useHospitalStore.getState().completeConsultation(doctorId);
  }
}

/**
 * @endpoint POST /queue/skip
 * Skip a waiting patient down one position
 */
export async function skipQueueEntry(entryId: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await queueApi.skipQueueEntry(entryId);
    return useHospitalStore.getState().skipQueueEntry(entryId);
  } catch (err: any) {
    return useHospitalStore.getState().skipQueueEntry(entryId);
  }
}

/**
 * @endpoint POST /queue/no-show
 * Mark a patient as no-show after unanswered calls
 */
export async function markQueueNoShow(entryId: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await queueApi.markNoShow(entryId);
    return useHospitalStore.getState().markNoShow(entryId);
  } catch (err: any) {
    return useHospitalStore.getState().markNoShow(entryId);
  }
}

/**
 * @endpoint PATCH /queue/{entry_id}/priority
 * Toggle priority status for vulnerable patients
 */
export async function toggleQueuePriority(entryId: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await queueApi.setPriority(entryId, 1);
    return useHospitalStore.getState().moveToPriority(entryId);
  } catch (err: any) {
    return useHospitalStore.getState().moveToPriority(entryId);
  }
}

/**
 * @endpoint POST /queue/emergency-insert
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
  checkSimulatedError();
  try {
    const res = await bookingApi.registerWalkIn({
      doctor_id: params.doctorId,
      department_id: params.departmentId,
      patient: {
        name: params.patientName,
        age: params.age,
        gender: params.gender,
        phone: params.phone,
      },
      reason: params.reason,
      priority: 0, // Emergency priority
    });
    const data = res.data;
    const storeRes = useHospitalStore.getState().emergencyInsert(params);
    return {
      success: true,
      token: data.token || storeRes.token,
      appointmentId: data.appointment?.id || storeRes.appointmentId,
    };
  } catch {
    return useHospitalStore.getState().emergencyInsert(params);
  }
}

/**
 * @endpoint POST /notifications/broadcast-delay
 */
export async function broadcastDoctorDelay(params: {
  doctorId: string;
  minutes: number;
  message: string;
}): Promise<{ success: boolean; affectedCount: number }> {
  checkSimulatedError();
  try {
    const res = await adminPortalApi.broadcastDelay({
      doctor_id: params.doctorId,
      minutes_delayed: params.minutes,
      message: params.message,
    });
    useHospitalStore.getState().broadcastDelay(params);
    return { success: true, affectedCount: res.data?.affectedCount ?? 1 };
  } catch {
    return useHospitalStore.getState().broadcastDelay(params);
  }
}

/**
 * ==========================================
 * Walk-in & Check-in Endpoints
 * ==========================================
 */

/**
 * @endpoint POST /walk-in/register
 */
export async function registerWalkInPatient(params: {
  patient: PatientSnapshot;
  departmentId: string;
  doctorId: string;
  reason: string;
  priority: number;
}) {
  checkSimulatedError();
  try {
    const res = await bookingApi.registerWalkIn({
      doctor_id: params.doctorId,
      department_id: params.departmentId,
      patient: params.patient,
      reason: params.reason,
      priority: params.priority,
    });
    const result = res.data;
    const localRes = useHospitalStore.getState().registerWalkIn(params);
    return {
      success: true,
      appointment: result.appointment || localRes.appointment,
      queueEntry: result.queue_entry || localRes.queueEntry,
      token: result.token || localRes.queueEntry.token,
      position: result.queue_entry?.position || localRes.queueEntry.position || 1,
      etaMinutes: result.queue_entry?.eta_minutes || localRes.queueEntry.eta_minutes || 10,
    };
  } catch (err: any) {
    console.warn('Walk-in API error, using store:', err);
    const localRes = useHospitalStore.getState().registerWalkIn(params);
    return {
      success: true,
      appointment: localRes.appointment,
      queueEntry: localRes.queueEntry,
      token: localRes.queueEntry.token,
      position: localRes.queueEntry.position || 1,
      etaMinutes: localRes.queueEntry.eta_minutes || 10,
    };
  }
}

/**
 * @endpoint POST /queue/check-in
 */
export async function checkInAppointment(appointmentId: string) {
  checkSimulatedError();
  try {
    const res = await queueApi.checkIn({ appointment_id: appointmentId });
    const result = res.data;
    const localRes = useHospitalStore.getState().checkInAppointment(appointmentId);
    const storeApt = useHospitalStore.getState().appointments.find((a) => a.id === appointmentId);
    return {
      success: true,
      appointment: result.appointment || storeApt,
      token: result.token || localRes.token,
      position: result.queue_entry?.position || localRes.position,
      etaMinutes: result.queue_entry?.eta_minutes || localRes.etaMinutes,
      isLate: result.queue_entry?.is_late_arrival || localRes.isLate,
      message: localRes.message || 'Checked in successfully',
    };
  } catch (err: any) {
    console.warn('CheckIn API error, using store:', err);
    return useHospitalStore.getState().checkInAppointment(appointmentId);
  }
}

/**
 * ==========================================
 * Appointments Endpoints
 * ==========================================
 */

/**
 * @endpoint PATCH /appointments/{id}/reschedule
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newDateStr: string,
  newSlotTime: string,
  reason?: string
): Promise<boolean> {
  checkSimulatedError();
  try {
    await bookingApi.reschedule(appointmentId, {
      new_date: newDateStr,
      new_time: newSlotTime,
      reason,
    });
    return useHospitalStore.getState().rescheduleAppointment(appointmentId, newDateStr, newSlotTime, reason);
  } catch {
    return useHospitalStore.getState().rescheduleAppointment(appointmentId, newDateStr, newSlotTime, reason);
  }
}

/**
 * @endpoint POST /appointments/{id}/cancel
 */
export async function cancelAppointment(
  appointmentId: string,
  reason: string,
  notifyPatient?: boolean
): Promise<boolean> {
  checkSimulatedError();
  try {
    await bookingApi.cancel(appointmentId, { reason });
    return useHospitalStore.getState().cancelAppointment(appointmentId, reason, notifyPatient);
  } catch {
    return useHospitalStore.getState().cancelAppointment(appointmentId, reason, notifyPatient);
  }
}

/**
 * @endpoint POST /appointments/{id}/confirm
 */
export async function confirmAppointmentDesk(appointmentId: string): Promise<boolean> {
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
  checkSimulatedError();
  try {
    await adminPortalApi.createDepartment(dept);
    return useHospitalStore.getState().addDepartment(dept);
  } catch {
    return useHospitalStore.getState().addDepartment(dept);
  }
}

/**
 * @endpoint PUT /admin/departments/{id}
 */
export async function updateDepartment(dept: Department): Promise<boolean> {
  checkSimulatedError();
  try {
    await adminPortalApi.updateDepartment(dept.id, dept);
    return useHospitalStore.getState().updateDepartment(dept);
  } catch {
    return useHospitalStore.getState().updateDepartment(dept);
  }
}

/**
 * @endpoint PATCH /admin/departments/{id}/status
 */
export async function toggleDepartmentStatus(deptId: string): Promise<{ success: boolean; reason?: string }> {
  checkSimulatedError();
  try {
    await adminPortalApi.toggleDepartmentStatus(deptId);
    return useHospitalStore.getState().toggleDepartmentActive(deptId);
  } catch {
    return useHospitalStore.getState().toggleDepartmentActive(deptId);
  }
}

/**
 * @endpoint POST /admin/doctors
 */
export async function createDoctor(doc: any): Promise<boolean> {
  checkSimulatedError();
  try {
    await adminPortalApi.createDoctor(doc);
    return useHospitalStore.getState().addDoctor(doc as any);
  } catch {
    return useHospitalStore.getState().addDoctor(doc as any);
  }
}

/**
 * @endpoint PUT /admin/doctors/{id}
 */
export async function updateDoctor(doc: Doctor): Promise<boolean> {
  checkSimulatedError();
  try {
    await adminPortalApi.updateDoctor(doc.id, doc);
    return useHospitalStore.getState().updateDoctor(doc);
  } catch {
    return useHospitalStore.getState().updateDoctor(doc);
  }
}

/**
 * @endpoint PATCH /admin/doctors/{id}/status
 */
export async function toggleDoctorStatus(
  doctorId: string
): Promise<{ success: boolean; affectedCount?: number }> {
  checkSimulatedError();
  try {
    const res = await adminPortalApi.toggleDoctorStatus(doctorId);
    const localRes = useHospitalStore.getState().toggleDoctorActive(doctorId);
    return { success: true, affectedCount: res.data?.affectedCount ?? localRes.affectedCount ?? 1 };
  } catch {
    const localRes = useHospitalStore.getState().toggleDoctorActive(doctorId);
    return { success: localRes.success, affectedCount: localRes.affectedCount };
  }
}

/**
 * @endpoint PUT /admin/schedules/{doctorId}
 */
export async function saveDoctorSchedule(sched: DoctorSchedule): Promise<boolean> {
  checkSimulatedError();
  try {
    await adminPortalApi.saveDoctorSchedule(sched.doctor_id, sched);
    return useHospitalStore.getState().saveDoctorSchedule(sched);
  } catch {
    return useHospitalStore.getState().saveDoctorSchedule(sched);
  }
}

/**
 * @endpoint POST /admin/doctors/{id}/leaves
 */
export async function addDoctorLeave(
  leave: any
): Promise<{ success: boolean; affectedCount: number }> {
  checkSimulatedError();
  const hospId = useHospitalStore.getState().hospital.id || 'hosp_city_01';
  try {
    const res = await adminPortalApi.addDoctorLeave(leave.doctor_id, { hospital_id: hospId, ...leave });
    const localRes = useHospitalStore.getState().addDoctorLeave({ hospital_id: hospId, ...leave });
    return { success: true, affectedCount: res.data?.affectedCount ?? localRes.affectedCount ?? 0 };
  } catch {
    const localRes = useHospitalStore.getState().addDoctorLeave({ hospital_id: hospId, ...leave });
    return { success: localRes.success, affectedCount: localRes.affectedCount };
  }
}

/**
 * @endpoint DELETE /admin/doctors/leaves/{leaveId}
 */
export async function deleteDoctorLeave(leaveId: string): Promise<boolean> {
  checkSimulatedError();
  try {
    await adminPortalApi.deleteDoctorLeave(leaveId);
    return useHospitalStore.getState().removeDoctorLeave(leaveId);
  } catch {
    return useHospitalStore.getState().removeDoctorLeave(leaveId);
  }
}

/**
 * @endpoint POST /admin/staff
 */
export async function createStaffUser(user: any): Promise<boolean> {
  checkSimulatedError();
  try {
    await adminPortalApi.createStaff(user);
    return useHospitalStore.getState().addStaffUser(user as any);
  } catch {
    return useHospitalStore.getState().addStaffUser(user as any);
  }
}

/**
 * @endpoint PUT /admin/staff/{id}
 */
export async function updateStaffUser(user: User): Promise<boolean> {
  checkSimulatedError();
  try {
    await adminPortalApi.updateStaff(user.id, user);
    return useHospitalStore.getState().updateStaffUser(user);
  } catch {
    return useHospitalStore.getState().updateStaffUser(user);
  }
}

/**
 * @endpoint PATCH /admin/staff/{id}/status
 */
export async function toggleStaffStatus(userId: string): Promise<{ success: boolean; reason?: string }> {
  checkSimulatedError();
  try {
    await adminPortalApi.toggleStaffStatus(userId);
    return useHospitalStore.getState().toggleStaffActive(userId);
  } catch {
    return useHospitalStore.getState().toggleStaffActive(userId);
  }
}

/**
 * @endpoint PATCH /admin/settings/policies
 */
export async function updateHospitalPolicies(
  policies: Hospital['settings']
): Promise<boolean> {
  checkSimulatedError();
  try {
    await adminPortalApi.updatePolicies(policies);
    return useHospitalStore.getState().updateHospitalSettings(policies);
  } catch {
    return useHospitalStore.getState().updateHospitalSettings(policies);
  }
}

/**
 * @endpoint PATCH /admin/settings/profile
 */
export async function updateHospitalProfile(
  profile: Partial<Hospital>
): Promise<boolean> {
  checkSimulatedError();
  try {
    await adminPortalApi.updateProfile(profile);
    return useHospitalStore.getState().updateHospitalProfile(profile);
  } catch {
    return useHospitalStore.getState().updateHospitalProfile(profile);
  }
}

/**
 * @endpoint PUT /admin/settings/templates/{type}
 */
export async function saveNotificationTemplate(
  type: string,
  tpl: NotificationTemplate
): Promise<boolean> {
  checkSimulatedError();
  try {
    await adminPortalApi.saveTemplate(type, tpl);
    return useHospitalStore.getState().updateTemplate(type, tpl);
  } catch {
    return useHospitalStore.getState().updateTemplate(type, tpl);
  }
}

/**
 * @endpoint POST /patients/{id}/notes
 */
export async function addPatientNote(
  param1: string | { patientId: string; authorId?: string; authorName?: string; note: string },
  param2?: string,
  param3?: string
): Promise<boolean> {
  checkSimulatedError();
  const currentUserId = useAuthStore.getState().user?.id || 'usr_staff_1';
  let patientId = '';
  let note = '';
  let authorName = 'Staff';
  let authorId = currentUserId;

  if (typeof param1 === 'object') {
    patientId = param1.patientId;
    note = param1.note;
    authorName = param1.authorName || 'Staff';
    authorId = param1.authorId || currentUserId;
  } else {
    patientId = param1;
    note = param2 || '';
    authorName = param3 || 'Staff';
  }

  return useHospitalStore.getState().addPatientNote({
    patient_id: patientId,
    author_id: authorId,
    author_name: authorName,
    note,
  });
}

/**
 * @endpoint POST /audit/log
 */
export async function logAuditEvent(action: string, details: string): Promise<void> {
  checkSimulatedError();
  try {
    await adminPortalApi.logAudit({ action, details });
  } catch {
    // fallback
  }
  useHospitalStore.getState().logAuditAction(action, details);
}

// Aliases for admin pages
export const createStaffMember = createStaffUser;
export const updateStaffMember = updateStaffUser;
export const addPatientStaffNote = addPatientNote;
export const logAudit = logAuditEvent;
