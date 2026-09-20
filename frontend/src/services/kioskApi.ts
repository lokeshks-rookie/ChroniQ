import { useHospitalStore } from '@/store/hospitalStore';
import type { Appointment, Department, Doctor, QueueEntry } from '@/types';

// Simulated latency helper (250 - 600 ms)
function delay(minMs = 250, maxMs = 600): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let shouldForceError = false;

export function setForceKioskApiError(force: boolean): void {
  shouldForceError = force;
}

export function isForceKioskApiErrorEnabled(): boolean {
  return shouldForceError;
}

function checkSimulatedError(): void {
  if (shouldForceError) {
    throw new Error('Simulated Kiosk API Failure: terminal communication error.');
  }
}

/**
 * @endpoint GET /kiosk/:hospitalId/lookup-phone
 * Search today's appointments by patient 10-digit mobile number
 */
export async function lookupByPhone(
  hospitalId: string,
  phone10: string
): Promise<Appointment[]> {
  await delay();
  checkSimulatedError();
  const state = useHospitalStore.getState();

  const cleanQuery = phone10.replace(/\D/g, '').slice(-10);
  if (!cleanQuery) return [];

  return state.appointments.filter((a) => {
    if (a.hospital_id !== hospitalId) return false;
    const patPhone = (a.patient.phone || '').replace(/\D/g, '');
    return patPhone.endsWith(cleanQuery);
  });
}

/**
 * @endpoint GET /kiosk/:hospitalId/lookup-qr
 * Lookup appointment by scanned booking code or QR payload
 */
export async function lookupByQr(
  hospitalId: string,
  qrPayload: string
): Promise<Appointment | null> {
  await delay();
  checkSimulatedError();
  const state = useHospitalStore.getState();

  const cleanPayload = qrPayload.trim().toUpperCase();

  const match = state.appointments.find((a) => {
    if (a.hospital_id !== hospitalId) return false;
    return (
      a.booking_code.toUpperCase() === cleanPayload ||
      a.id.toUpperCase() === cleanPayload ||
      cleanPayload.includes(a.booking_code.toUpperCase()) ||
      cleanPayload.includes(a.id.toUpperCase())
    );
  });

  return match || null;
}

/**
 * @endpoint POST /kiosk/check-in
 * Confirm self-service patient check-in at kiosk terminal
 */
export async function kioskCheckIn(
  appointmentId: string
): Promise<{
  success: boolean;
  token?: string;
  position?: number;
  etaMinutes?: number;
  isLate?: boolean;
  message?: string;
}> {
  await delay();
  checkSimulatedError();
  return useHospitalStore.getState().checkInAppointment(appointmentId, 'kiosk');
}

/**
 * @endpoint POST /kiosk/walk-in
 * Register a kiosk walk-in patient, auto-assigning the doctor with shortest wait
 */
export async function registerKioskWalkIn(params: {
  hospitalId: string;
  departmentId: string;
  doctorId: string;
  patientName: string;
  phone: string;
  reason: string;
}): Promise<{
  success: boolean;
  appointment: Appointment;
  queueEntry: QueueEntry;
}> {
  await delay();
  checkSimulatedError();

  return useHospitalStore.getState().registerWalkIn({
    patient: {
      name: params.patientName,
      phone: params.phone,
    },
    departmentId: params.departmentId,
    doctorId: params.doctorId,
    reason: params.reason,
    priority: 2, // Kiosk walk-ins are standard priority
    created_via: 'kiosk',
  });
}

/**
 * @endpoint GET /kiosk/:hospitalId/departments
 * List active departments for walk-in selection
 */
export async function listKioskDepartments(
  hospitalId: string
): Promise<Department[]> {
  await delay(150, 300);
  checkSimulatedError();
  const state = useHospitalStore.getState();
  return state.departments.filter(
    (d) => d.hospital_id === hospitalId && d.is_active
  );
}

/**
 * Helper to find available doctor in a department with the shortest estimated wait
 * Excludes doctors who are on break, late, or on leave.
 */
export function findShortestWaitDoctor(departmentId: string): {
  doctor: Doctor | null;
  estimatedWaitMinutes: number;
} {
  const state = useHospitalStore.getState();
  const activeDoctorsInDept = state.doctors.filter(
    (d) => d.department_id === departmentId && d.is_active
  );

  // Filter only available doctors (not on break, late, or on leave)
  const availableDoctors = activeDoctorsInDept.filter((doc) => {
    const status = state.getDoctorEffectiveStatus(doc.id);
    return status.status === 'available' || status.status === 'in_consultation';
  });

  if (availableDoctors.length === 0) {
    return { doctor: null, estimatedWaitMinutes: 0 };
  }

  // Calculate estimated wait for each available doctor
  let bestDoctor: Doctor = availableDoctors[0];
  let minWait = 999;

  availableDoctors.forEach((doc) => {
    const waitingEntries = state.queue_entries.filter(
      (q) => q.doctor_id === doc.id && q.status === 'waiting'
    );
    const inConsult = state.queue_entries.find(
      (q) => q.doctor_id === doc.id && q.status === 'in_consultation'
    );
    const delay = state.doctorDelays[doc.id] || 0;

    // Remaining time in current + waiting patients * avg
    const waitingMinutes =
      (inConsult ? doc.avg_consult_minutes : 0) +
      waitingEntries.length * doc.avg_consult_minutes +
      delay;

    if (waitingMinutes < minWait) {
      minWait = waitingMinutes;
      bestDoctor = doc;
    }
  });

  return {
    doctor: bestDoctor,
    estimatedWaitMinutes: minWait === 999 ? 15 : Math.max(5, minWait),
  };
}
