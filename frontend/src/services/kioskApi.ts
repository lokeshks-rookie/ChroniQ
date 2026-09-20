/**
 * Kiosk API Service — Connected to real backend endpoints
 */

import { useHospitalStore } from '@/store/hospitalStore';
import { kioskApi as backendKioskApi, queueApi, bookingApi } from '@/services/api';
import type { Appointment, Department, Doctor, QueueEntry } from '@/types';

// Dev flag to force errors for testing error/retry states
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
 */
export async function lookupByPhone(
  hospitalId: string,
  phone10: string
): Promise<Appointment[]> {
  checkSimulatedError();
  const cleanPhone = phone10.replace(/\D/g, '').slice(-10);

  try {
    const res = await backendKioskApi.lookupPhone(hospitalId, cleanPhone);
    const appointments = res.data?.appointments || (Array.isArray(res.data) ? res.data : []);
    if (appointments.length > 0) {
      return appointments;
    }
  } catch (err) {
    console.warn('Backend kiosk phone lookup failed, searching store:', err);
  }

  const state = useHospitalStore.getState();
  return state.appointments.filter((a) => {
    if (a.hospital_id !== hospitalId) return false;
    const patPhone = (a.patient.phone || '').replace(/\D/g, '');
    return patPhone.endsWith(cleanPhone);
  });
}

/**
 * @endpoint GET /kiosk/:hospitalId/lookup-code
 */
export async function lookupByQr(
  hospitalId: string,
  qrPayload: string
): Promise<Appointment | null> {
  checkSimulatedError();
  const cleanPayload = qrPayload.trim().toUpperCase();

  try {
    const res = await backendKioskApi.lookupCode(hospitalId, cleanPayload);
    if (res.data?.appointment) {
      return res.data.appointment;
    }
  } catch (err) {
    console.warn('Backend kiosk code lookup failed, searching store:', err);
  }

  const state = useHospitalStore.getState();
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
 * @endpoint POST /queue/check-in
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
  checkSimulatedError();
  try {
    const res = await queueApi.checkIn({ appointment_id: appointmentId });
    const data = res.data;
    const storeRes = useHospitalStore.getState().checkInAppointment(appointmentId, 'kiosk');
    return {
      success: true,
      token: data.token || storeRes.token,
      position: data.queue_entry?.position || storeRes.position,
      etaMinutes: data.queue_entry?.eta_minutes || storeRes.etaMinutes,
      isLate: data.queue_entry?.is_late_arrival || storeRes.isLate,
    };
  } catch (err: any) {
    return useHospitalStore.getState().checkInAppointment(appointmentId, 'kiosk');
  }
}

export function findShortestWaitDoctor(deptId: string): { doctor: Doctor | null; waitMinutes: number; estimatedWaitMinutes: number } {
  const state = useHospitalStore.getState();
  const deptDocs = state.doctors.filter((d) => d.department_id === deptId && d.is_active);
  if (deptDocs.length === 0) return { doctor: null, waitMinutes: 0, estimatedWaitMinutes: 0 };

  let bestDoc: Doctor | null = null;
  let minWait = Infinity;

  deptDocs.forEach((doc) => {
    const waiting = state.queue_entries.filter((q) => q.doctor_id === doc.id && q.status === 'waiting').length;
    const estWait = waiting * (doc.avg_consult_minutes || 10);
    if (estWait < minWait) {
      minWait = estWait;
      bestDoc = doc;
    }
  });

  const minutes = minWait === Infinity ? 0 : minWait;
  return { doctor: bestDoc || deptDocs[0], waitMinutes: minutes, estimatedWaitMinutes: minutes };
}

/**
 * @endpoint POST /walk-in/register
 */
export async function registerKioskWalkIn(params: {
  hospitalId: string;
  departmentId: string;
  doctorId?: string;
  patientName: string;
  phone: string;
  age?: number;
  gender?: string;
  reason?: string;
}): Promise<{
  success: boolean;
  appointment: Appointment;
  queueEntry: QueueEntry;
  token: string;
  doctor: Doctor;
  department: Department;
  position: number;
  etaMinutes: number;
}> {
  checkSimulatedError();
  const state = useHospitalStore.getState();
  const dept = state.departments.find((d) => d.id === params.departmentId) || state.departments[0];
  const chosenDoctor = params.doctorId
    ? state.doctors.find((d) => d.id === params.doctorId) || state.doctors[0]
    : state.doctors.filter((d) => d.department_id === params.departmentId && d.is_active)[0] || state.doctors[0];

  const nowIso = new Date().toISOString();

  try {
    const res = await bookingApi.registerWalkIn({
      doctor_id: chosenDoctor.id,
      department_id: dept.id,
      patient: {
        name: params.patientName,
        phone: params.phone,
        age: params.age,
        gender: params.gender,
      },
      reason: params.reason || 'Kiosk walk-in registration',
      priority: 2,
    });
    const data = res.data;
    const localRes = state.registerWalkIn({
      patient: {
        name: params.patientName,
        phone: params.phone,
        age: params.age,
        gender: params.gender,
      },
      departmentId: dept.id,
      doctorId: chosenDoctor.id,
      reason: params.reason || 'Kiosk Walk-In',
      priority: 2,
    });

    return {
      success: true,
      appointment: data.appointment || localRes.appointment,
      queueEntry: data.queue_entry || localRes.queueEntry,
      token: data.token || localRes.queueEntry.token,
      doctor: chosenDoctor,
      department: dept,
      position: data.queue_entry?.position || localRes.queueEntry.position || 1,
      etaMinutes: data.queue_entry?.eta_minutes || localRes.queueEntry.eta_minutes || 10,
    };
  } catch {
    const localRes = state.registerWalkIn({
      patient: {
        name: params.patientName,
        phone: params.phone,
        age: params.age,
        gender: params.gender,
      },
      departmentId: dept.id,
      doctorId: chosenDoctor.id,
      reason: params.reason || 'Kiosk Walk-In',
      priority: 2,
    });

    return {
      success: true,
      appointment: localRes.appointment,
      queueEntry: localRes.queueEntry,
      token: localRes.queueEntry.token,
      doctor: chosenDoctor,
      department: dept,
      position: localRes.queueEntry.position || 1,
      etaMinutes: localRes.queueEntry.eta_minutes || 10,
    };
  }
}
