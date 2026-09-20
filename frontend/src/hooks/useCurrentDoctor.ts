import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useHospitalStore } from '@/store/hospitalStore';
import { useUiStore } from '@/store/uiStore';
import type {
  Doctor,
  Department,
  QueueEntry,
  Appointment,
  DoctorSchedule,
  DoctorLeave,
  ConsultationNote,
  DoctorAvailabilityState,
} from '@/types';

export function useCurrentDoctor() {
  const { currentDoctorId } = useAuthStore();
  const effectiveDoctorId = currentDoctorId || 'doc_card_2';

  const {
    doctors,
    departments,
    queue_entries,
    appointments,
    doctor_schedules,
    doctor_leaves,
    consultation_notes,
    doctor_availability,
    calledCountdowns,
    getDoctorEffectiveStatus,
  } = useHospitalStore();

  const { alerts, addToast } = useUiStore();

  const currentDoctor = useMemo<Doctor>(() => {
    const doc = doctors.find((d) => d.id === effectiveDoctorId);
    if (doc) return doc;
    // Fallback safe doctor object
    return (
      doctors[0] || {
        id: effectiveDoctorId,
        user_id: 'user_doc_2',
        hospital_id: 'hosp_city_01',
        department_id: 'dept_card',
        name: 'Dr. Meena Raj',
        specialty: 'Consultant Cardiologist & Electrophysiologist',
        qualifications: ['MBBS', 'MD', 'DNB (Cardiology)'],
        experience_years: 11,
        fee: 700,
        languages: ['English', 'Tamil'],
        gender: 'female',
        bio: 'Focus on heart rhythm disorders, pacemaker management, and non-invasive cardiac evaluation.',
        avg_consult_minutes: 10,
        rating_avg: 4.8,
        rating_count: 320,
        is_active: true,
        room: 'Room 102',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  }, [doctors, effectiveDoctorId]);

  const myDepartment = useMemo<Department | undefined>(() => {
    return departments.find((d) => d.id === currentDoctor.department_id);
  }, [departments, currentDoctor.department_id]);

  const availability = useMemo<DoctorAvailabilityState>(() => {
    return (
      doctor_availability[effectiveDoctorId] || {
        doctor_id: effectiveDoctorId,
        status: 'available',
        changed_at: new Date().toISOString(),
      }
    );
  }, [doctor_availability, effectiveDoctorId]);

  const effectiveStatus = useMemo(() => {
    return getDoctorEffectiveStatus(effectiveDoctorId);
  }, [getDoctorEffectiveStatus, effectiveDoctorId, queue_entries, doctor_availability]);

  const myQueue = useMemo<QueueEntry[]>(() => {
    return queue_entries.filter((q) => q.doctor_id === effectiveDoctorId);
  }, [queue_entries, effectiveDoctorId]);

  const activeEntry = useMemo<QueueEntry | null>(() => {
    return myQueue.find((q) => q.status === 'in_consultation' || q.status === 'called') || null;
  }, [myQueue]);

  const waitingEntries = useMemo<QueueEntry[]>(() => {
    return myQueue
      .filter((q) => q.status === 'waiting')
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [myQueue]);

  const completedToday = useMemo<QueueEntry[]>(() => {
    return myQueue.filter((q) => q.status === 'completed');
  }, [myQueue]);

  const myAppointmentsToday = useMemo<Appointment[]>(() => {
    return appointments
      .filter((a) => a.doctor_id === effectiveDoctorId)
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  }, [appointments, effectiveDoctorId]);

  const mySchedule = useMemo<DoctorSchedule | undefined>(() => {
    return doctor_schedules.find((s) => s.doctor_id === effectiveDoctorId);
  }, [doctor_schedules, effectiveDoctorId]);

  const myLeaves = useMemo<DoctorLeave[]>(() => {
    return doctor_leaves.filter((l) => l.doctor_id === effectiveDoctorId);
  }, [doctor_leaves, effectiveDoctorId]);

  const myConsultationNotes = useMemo<ConsultationNote[]>(() => {
    return consultation_notes.filter((n) => n.doctor_id === effectiveDoctorId);
  }, [consultation_notes, effectiveDoctorId]);

  const myAlerts = useMemo(() => {
    return alerts.filter((a) => !a.dismissed && (!a.doctor_id || a.doctor_id === effectiveDoctorId));
  }, [alerts, effectiveDoctorId]);

  const calledSecondsRemaining = calledCountdowns[effectiveDoctorId] ?? 0;

  return {
    doctorId: effectiveDoctorId,
    currentDoctor,
    myDepartment,
    availability,
    effectiveStatus,
    myQueue,
    activeEntry,
    waitingEntries,
    completedToday,
    myAppointmentsToday,
    mySchedule,
    myLeaves,
    myConsultationNotes,
    myAlerts,
    calledSecondsRemaining,
    addToast,
  };
}
