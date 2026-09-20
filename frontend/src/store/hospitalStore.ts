import { create } from 'zustand';
import type {
  Hospital,
  Department,
  Doctor,
  DoctorSchedule,
  DoctorLeave,
  Appointment,
  QueueEntry,
  User,
  BroadcastLog,
  NotificationTemplate,
  PatientNote,
  AuditLog,
  PatientSnapshot,
  ConsultationNote,
  DoctorAvailabilityState,
  DoctorAvailabilityStatus,
  AvailabilityLogEntry,
  CallEvent,
  CreatedVia,
} from '@/types';
import {
  INITIAL_HOSPITAL,
  INITIAL_DEPARTMENTS,
  INITIAL_DOCTORS,
  INITIAL_SCHEDULES,
  INITIAL_LEAVES,
  INITIAL_USERS,
  INITIAL_BROADCASTS,
  INITIAL_NOTIFICATION_TEMPLATES,
  INITIAL_PATIENT_NOTES,
  INITIAL_AUDIT_LOGS,
  INITIAL_DOCTOR_AVAILABILITY,
  INITIAL_AVAILABILITY_LOG,
  INITIAL_CONSULTATION_NOTES,
  generateSeedAppointmentsAndQueue,
} from '@/mocks/seedData';
import { recomputeDoctorQueueEtas, updateRollingAverage, handleQueueSkip, isGracePeriodExceeded } from '@/lib/queue';
import { getTodayDateStringIST } from '@/lib/time';
import { useUiStore } from './uiStore';
import { useAuthStore } from './authStore';
import { syncManager } from '@/lib/sync';

interface HospitalState {
  hospital: Hospital;
  departments: Department[];
  doctors: Doctor[];
  doctor_schedules: DoctorSchedule[];
  doctor_leaves: DoctorLeave[];
  appointments: Appointment[];
  queue_entries: QueueEntry[];
  users: User[];
  broadcasts: BroadcastLog[];
  templates: NotificationTemplate[];
  patient_notes: PatientNote[];
  audit_logs: AuditLog[];
  // Section 4.4 Doctor View slices
  doctor_availability: Record<string, DoctorAvailabilityState>;
  availability_log: AvailabilityLogEntry[];
  consultation_notes: ConsultationNote[];
  // Section 4.6 Special Screens slices
  call_events: CallEvent[];
  heartbeat_at: string;

  // Simulation controls
  isSimulationPaused: boolean;
  simulatedSeconds: number;
  // doctor_id -> seconds remaining in called countdown (starts at 120)
  calledCountdowns: Record<string, number>;
  // doctor_id -> current delay in minutes applied
  doctorDelays: Record<string, number>;

  // Actions
  resetDemoData: () => void;
  toggleSimulation: () => void;
  tickSimulation: () => void;

  // Queue Operations
  callNext: (doctorId: string) => { success: boolean; message?: string };
  callAgain: (doctorId: string) => { success: boolean };
  startConsultation: (doctorId: string) => { success: boolean };
  completeConsultation: (
    doctorId: string,
    note?: { text: string; follow_up: ConsultationNote['follow_up']; follow_up_date?: string }
  ) => { success: boolean; consultMinutes?: number };
  skipQueueEntry: (entryId: string) => { success: boolean };
  markNoShow: (entryId: string) => { success: boolean };
  moveToPriority: (entryId: string) => { success: boolean };

  // Doctor Availability & Notes Operations
  setDoctorAvailability: (params: {
    doctor_id: string;
    status: DoctorAvailabilityStatus;
    until?: string;
    delay_minutes?: number;
    reason?: string;
    notify?: boolean;
  }) => { success: boolean; affectedCount: number };
  saveConsultationDraft: (note: Omit<ConsultationNote, 'id' | 'updated_at'>) => ConsultationNote;
  finalizeConsultationNote: (noteId: string) => void;
  getDoctorEffectiveStatus: (doctorId: string) => {
    status: 'available' | 'in_consultation' | 'on_break' | 'late' | 'on_leave';
    lateMinutes?: number;
    until?: string;
    reason?: string;
  };
  emergencyInsert: (params: {
    doctorId: string;
    departmentId: string;
    patientName: string;
    age?: number;
    gender?: string;
    phone?: string;
    reason: string;
  }) => { success: boolean; token: string; appointmentId: string };
  broadcastDelay: (params: {
    doctorId: string;
    minutes: number;
    message: string;
  }) => { success: boolean; affectedCount: number };

  // Desk & Kiosk Operations
  checkInAppointment: (appointmentId: string, createdVia?: CreatedVia) => {
    success: boolean;
    token?: string;
    position?: number;
    etaMinutes?: number;
    isLate?: boolean;
    message?: string;
  };
  registerWalkIn: (params: {
    patient: PatientSnapshot;
    departmentId: string;
    doctorId: string;
    reason: string;
    priority: number;
    created_via?: CreatedVia;
  }) => {
    success: boolean;
    appointment: Appointment;
    queueEntry: QueueEntry;
  };

  // Appointment Operations
  rescheduleAppointment: (appointmentId: string, newDateStr: string, newSlotTime: string, reason?: string) => boolean;
  cancelAppointment: (appointmentId: string, reason: string, notifyPatient?: boolean) => boolean;
  confirmAppointment: (appointmentId: string) => boolean;

  // Management Operations
  addDepartment: (dept: Omit<Department, 'id' | 'hospital_id'>) => boolean;
  updateDepartment: (dept: Department) => boolean;
  toggleDepartmentActive: (deptId: string) => { success: boolean; reason?: string };

  addDoctor: (doc: Omit<Doctor, 'id' | 'hospital_id' | 'rating_avg' | 'rating_count' | 'created_at' | 'updated_at'>) => boolean;
  updateDoctor: (doc: Doctor) => boolean;
  toggleDoctorActive: (doctorId: string) => { success: boolean; affectedCount: number };

  saveDoctorSchedule: (schedule: DoctorSchedule) => boolean;
  addDoctorLeave: (leave: Omit<DoctorLeave, 'id' | 'hospital_id'>) => { success: boolean; affectedCount: number };
  removeDoctorLeave: (leaveId: string) => boolean;

  updateHospitalSettings: (settings: Hospital['settings']) => boolean;
  updateHospitalProfile: (profile: Partial<Hospital>) => boolean;
  updateTemplate: (type: string, template: NotificationTemplate) => boolean;

  addStaffUser: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) => boolean;
  updateStaffUser: (user: User) => boolean;
  toggleStaffActive: (userId: string) => { success: boolean; reason?: string };

  addPatientNote: (note: Omit<PatientNote, 'id' | 'created_at'>) => boolean;
  logAuditAction: (action: string, details: string) => void;
  resetToDefaults: () => void;

  // Section 4.6 Special Screens sync
  updateHeartbeat: () => void;
  applySyncSnapshot: (snapshot: {
    appointments?: Appointment[];
    queue_entries?: QueueEntry[];
    doctor_availability?: Record<string, DoctorAvailabilityState>;
    availability_log?: AvailabilityLogEntry[];
    doctor_leaves?: DoctorLeave[];
    consultation_notes?: ConsultationNote[];
    call_events?: CallEvent[];
    heartbeat_at?: string;
    isSimulationPaused?: boolean;
  }) => void;
  setSimulationPaused: (paused: boolean) => void;
}

const initialSeed = generateSeedAppointmentsAndQueue();

export const useHospitalStore = create<HospitalState>((set, get) => ({
  hospital: INITIAL_HOSPITAL,
  departments: INITIAL_DEPARTMENTS,
  doctors: INITIAL_DOCTORS,
  doctor_schedules: INITIAL_SCHEDULES,
  doctor_leaves: INITIAL_LEAVES,
  appointments: initialSeed.appointments,
  queue_entries: initialSeed.queueEntries,
  users: INITIAL_USERS,
  broadcasts: INITIAL_BROADCASTS,
  templates: INITIAL_NOTIFICATION_TEMPLATES,
  patient_notes: INITIAL_PATIENT_NOTES,
  audit_logs: INITIAL_AUDIT_LOGS,
  doctor_availability: INITIAL_DOCTOR_AVAILABILITY,
  availability_log: INITIAL_AVAILABILITY_LOG,
  consultation_notes: INITIAL_CONSULTATION_NOTES,
  call_events: [],
  heartbeat_at: new Date().toISOString(),

  updateHeartbeat: () => {
    set({ heartbeat_at: new Date().toISOString() });
  },

  applySyncSnapshot: (snapshot) => {
    set((state) => ({
      ...state,
      ...snapshot,
    }));
  },

  setSimulationPaused: (paused: boolean) => {
    set({ isSimulationPaused: paused });
  },

  resetToDefaults: () => {
    const seed = generateSeedAppointmentsAndQueue();
    set({
      hospital: INITIAL_HOSPITAL,
      departments: INITIAL_DEPARTMENTS,
      doctors: INITIAL_DOCTORS,
      doctor_schedules: INITIAL_SCHEDULES,
      doctor_leaves: INITIAL_LEAVES,
      appointments: seed.appointments,
      queue_entries: seed.queueEntries,
      users: INITIAL_USERS,
      broadcasts: INITIAL_BROADCASTS,
      templates: INITIAL_NOTIFICATION_TEMPLATES,
      patient_notes: INITIAL_PATIENT_NOTES,
      audit_logs: INITIAL_AUDIT_LOGS,
      doctor_availability: INITIAL_DOCTOR_AVAILABILITY,
      availability_log: INITIAL_AVAILABILITY_LOG,
      consultation_notes: INITIAL_CONSULTATION_NOTES,
      call_events: [],
      heartbeat_at: new Date().toISOString(),
    });
  },

  isSimulationPaused: false,
  simulatedSeconds: 0,
  calledCountdowns: {},
  doctorDelays: {},

  resetDemoData: () => {
    const seed = generateSeedAppointmentsAndQueue();
    set({
      hospital: INITIAL_HOSPITAL,
      departments: INITIAL_DEPARTMENTS,
      doctors: INITIAL_DOCTORS,
      doctor_schedules: INITIAL_SCHEDULES,
      doctor_leaves: INITIAL_LEAVES,
      appointments: seed.appointments,
      queue_entries: seed.queueEntries,
      users: INITIAL_USERS,
      broadcasts: INITIAL_BROADCASTS,
      templates: INITIAL_NOTIFICATION_TEMPLATES,
      patient_notes: INITIAL_PATIENT_NOTES,
      audit_logs: INITIAL_AUDIT_LOGS,
      doctor_availability: INITIAL_DOCTOR_AVAILABILITY,
      availability_log: INITIAL_AVAILABILITY_LOG,
      consultation_notes: INITIAL_CONSULTATION_NOTES,
      simulatedSeconds: 0,
      calledCountdowns: {},
      doctorDelays: {},
    });
    useUiStore.getState().addToast({
      title: 'Demo data reset',
      description: 'The hospital state has been restored to default seed.',
      variant: 'info',
    });
  },

  toggleSimulation: () => {
    set((s) => {
      const next = !s.isSimulationPaused;
      useUiStore.getState().addToast({
        title: next ? 'Simulation paused' : 'Simulation resumed',
        description: next ? 'Automatic timer movements are held.' : 'Automatic queue updates are active.',
        variant: 'info',
      });
      return { isSimulationPaused: next };
    });
  },

  tickSimulation: () => {
    const state = get();
    if (state.isSimulationPaused) return;

    const nextSeconds = state.simulatedSeconds + 1;
    const now = new Date();

    // 1. Decrement called countdowns
    const updatedCountdowns = { ...state.calledCountdowns };
    Object.keys(updatedCountdowns).forEach((docId) => {
      if (updatedCountdowns[docId] > 0) {
        updatedCountdowns[docId] -= 1;
      }
    });

    // 2. Check doctor breaks expiration
    let availabilityChanged = false;
    const updatedAvailability = { ...state.doctor_availability };
    const updatedLog = [...state.availability_log];

    Object.entries(updatedAvailability).forEach(([docId, avl]) => {
      if (avl.status === 'on_break' && avl.until) {
        const untilDate = new Date(avl.until);
        if (!isNaN(untilDate.getTime()) && now.getTime() >= untilDate.getTime()) {
          availabilityChanged = true;
          const doc = state.doctors.find((d) => d.id === docId);
          updatedAvailability[docId] = {
            doctor_id: docId,
            status: 'available',
            changed_at: now.toISOString(),
          };
          updatedLog.unshift({
            id: `avl_${Date.now()}`,
            doctor_id: docId,
            status: 'available',
            changed_at: now.toISOString(),
            reason: 'Break period completed automatically',
          });

          // Recompute ETAs without break offset
          const waiting = state.queue_entries.filter((q) => q.doctor_id === docId && q.status === 'waiting');
          const delay = state.doctorDelays[docId] || 0;
          if (doc) {
            const recomputed = recomputeDoctorQueueEtas(doc, waiting, null, delay, undefined, 0);
            set((s) => ({
              queue_entries: s.queue_entries.map((q) => recomputed.find((r) => r.id === q.id) || q),
            }));
          }

          useUiStore.getState().addToast({
            title: 'Break ended',
            description: `Break duration completed for ${doc?.name || 'doctor'}. Status is now Available.`,
            variant: 'info',
          });
        }
      }
    });

    set({
      simulatedSeconds: nextSeconds,
      calledCountdowns: updatedCountdowns,
      ...(availabilityChanged ? { doctor_availability: updatedAvailability, availability_log: updatedLog.slice(0, 20) } : {}),
    });

    // 3. Simulated queue movement (every 22s)
    // Only leader tab runs the simulation! (Section 2.1)
    if (!syncManager.isCurrentTabLeader()) {
      return;
    }

    if (nextSeconds % 22 === 0) {
      const { currentRole, currentDoctorId } = useAuthStore.getState();
      const crossTabDoctorIds = syncManager.getActiveDoctorIds();
      if (currentRole === 'doctor' && currentDoctorId) {
        crossTabDoctorIds.add(currentDoctorId);
      }

      const eligibleDoctors = state.doctors.filter((d) => !crossTabDoctorIds.has(d.id));

      const docWithConsult = eligibleDoctors.find((doc) => {
        return state.queue_entries.some(
          (q) => q.doctor_id === doc.id && q.status === 'in_consultation'
        );
      });

      if (docWithConsult) {
        get().completeConsultation(docWithConsult.id);
        useUiStore.getState().announce(`Queue updated: consultation completed for ${docWithConsult.name}`);
      } else {
        const docWithWaiting = eligibleDoctors.find((doc) => {
          return state.queue_entries.some((q) => q.doctor_id === doc.id && q.status === 'waiting');
        });
        if (docWithWaiting) {
          get().callNext(docWithWaiting.id);
          useUiStore.getState().announce(`Queue updated: next patient called for ${docWithWaiting.name}`);
        }
      }
    }
  },

  callNext: (doctorId: string) => {
    const state = get();
    const doc = state.doctors.find((d) => d.id === doctorId);
    if (!doc) return { success: false, message: 'Doctor not found' };

    // Check if anyone is already called or in consultation
    const existingActive = state.queue_entries.find(
      (q) => q.doctor_id === doctorId && (q.status === 'called' || q.status === 'in_consultation')
    );
    if (existingActive) {
      return {
        success: false,
        message: existingActive.status === 'called' ? 'A patient is already called. Start or mark no-show first.' : 'Consultation is already in progress.',
      };
    }

    // Find the next waiting patient in sorted order
    const waitingEntries = state.queue_entries.filter(
      (q) => q.doctor_id === doctorId && q.status === 'waiting'
    );
    if (waitingEntries.length === 0) {
      return { success: false, message: 'No waiting patients in this queue.' };
    }

    // Recompute order to pick position 1
    const delay = state.doctorDelays[doctorId] || 0;
    const sorted = recomputeDoctorQueueEtas(doc, waitingEntries, null, delay);
    const nextPatient = sorted[0];

    const nowIso = new Date().toISOString();

    const updatedQueue = state.queue_entries.map((q) => {
      if (q.id === nextPatient.id) {
        return {
          ...q,
          status: 'called' as const,
          called_at: nowIso,
          call_count: (q.call_count || 0) + 1,
          position: undefined,
          eta_minutes: undefined,
        };
      }
      return q;
    });

    const updatedAppointments = state.appointments.map((apt) => {
      if (apt.id === nextPatient.appointment_id) {
        return {
          ...apt,
          status: 'called' as const,
          status_history: [...apt.status_history, { status: 'called' as const, at: nowIso }],
        };
      }
      return apt;
    });

    // Section 4.6 Special Screens: Append CallEvent for display board
    const newCallEvent: CallEvent = {
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      entry_id: nextPatient.id,
      token: nextPatient.token,
      doctor_id: doctorId,
      department_id: nextPatient.department_id,
      room: doc.room || 'Room 1',
      call_count: (nextPatient.call_count || 0) + 1,
      at: nowIso,
    };
    const updatedCallEvents = [newCallEvent, ...(state.call_events || [])].slice(0, 50);

    set({
      queue_entries: updatedQueue,
      appointments: updatedAppointments,
      call_events: updatedCallEvents,
      calledCountdowns: {
        ...state.calledCountdowns,
        [doctorId]: 120, // 2:00 countdown
      },
    });

    syncManager.broadcastSnapshot();

    useUiStore.getState().addToast({
      title: `Called token ${nextPatient.token}`,
      description: `${aptPatientName(state, nextPatient.appointment_id)} called to ${doc.room || 'consultation room'}.`,
      variant: 'default',
    });

    return { success: true };
  },

  callAgain: (doctorId: string) => {
    const state = get();
    const doc = state.doctors.find((d) => d.id === doctorId);
    const calledEntry = state.queue_entries.find(
      (q) => q.doctor_id === doctorId && q.status === 'called'
    );
    if (!calledEntry) return { success: false };

    const newCallCount = (calledEntry.call_count || 1) + 1;
    const nowIso = new Date().toISOString();
    const updatedQueue = state.queue_entries.map((q) =>
      q.id === calledEntry.id ? { ...q, call_count: newCallCount } : q
    );

    const newCallEvent: CallEvent = {
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      entry_id: calledEntry.id,
      token: calledEntry.token,
      doctor_id: doctorId,
      department_id: calledEntry.department_id,
      room: doc?.room || 'Room 1',
      call_count: newCallCount,
      at: nowIso,
    };
    const updatedCallEvents = [newCallEvent, ...(state.call_events || [])].slice(0, 50);

    set({
      queue_entries: updatedQueue,
      call_events: updatedCallEvents,
      calledCountdowns: {
        ...state.calledCountdowns,
        [doctorId]: 120,
      },
    });

    syncManager.broadcastSnapshot();

    useUiStore.getState().addToast({
      title: `Called again (${newCallCount}x)`,
      description: `Turn reminder announced for token ${calledEntry.token}.`,
      variant: 'default',
    });

    return { success: true };
  },

  startConsultation: (doctorId: string) => {
    const state = get();
    const calledEntry = state.queue_entries.find(
      (q) => q.doctor_id === doctorId && q.status === 'called'
    );
    if (!calledEntry) return { success: false };

    const nowIso = new Date().toISOString();

    const updatedQueue = state.queue_entries.map((q) => {
      if (q.id === calledEntry.id) {
        return {
          ...q,
          status: 'in_consultation' as const,
          started_at: nowIso,
        };
      }
      return q;
    });

    const updatedAppointments = state.appointments.map((apt) => {
      if (apt.id === calledEntry.appointment_id) {
        return {
          ...apt,
          status: 'in_consultation' as const,
          status_history: [...apt.status_history, { status: 'in_consultation' as const, at: nowIso }],
        };
      }
      return apt;
    });

    const updatedCountdowns = { ...state.calledCountdowns };
    delete updatedCountdowns[doctorId];

    set({
      queue_entries: updatedQueue,
      appointments: updatedAppointments,
      calledCountdowns: updatedCountdowns,
    });

    useUiStore.getState().addToast({
      title: `Consultation started`,
      description: `Token ${calledEntry.token} is now in consultation.`,
      variant: 'default',
    });

    return { success: true };
  },

  completeConsultation: (doctorId: string, note?: { text: string; follow_up: ConsultationNote['follow_up']; follow_up_date?: string }) => {
    const state = get();
    const doc = state.doctors.find((d) => d.id === doctorId);
    if (!doc) return { success: false };

    const activeEntry = state.queue_entries.find(
      (q) => q.doctor_id === doctorId && (q.status === 'in_consultation' || q.status === 'called')
    );
    if (!activeEntry) return { success: false };

    const now = new Date();
    const nowIso = now.toISOString();

    let actualDuration = doc.avg_consult_minutes;
    if (activeEntry.started_at) {
      const durationMs = now.getTime() - new Date(activeEntry.started_at).getTime();
      actualDuration = Math.max(3, Number((durationMs / (60 * 1000)).toFixed(1)));
    }

    // Update rolling average: avg = 0.8 * avg + 0.2 * actualDuration
    const newRollingAvg = updateRollingAverage(doc.avg_consult_minutes, actualDuration);

    const updatedDoctors = state.doctors.map((d) =>
      d.id === doctorId ? { ...d, avg_consult_minutes: newRollingAvg } : d
    );

    const updatedQueue = state.queue_entries.map((q) => {
      if (q.id === activeEntry.id) {
        return {
          ...q,
          status: 'completed' as const,
          completed_at: nowIso,
          consult_minutes: actualDuration,
        };
      }
      return q;
    });

    const updatedAppointments = state.appointments.map((apt) => {
      if (apt.id === activeEntry.appointment_id) {
        return {
          ...apt,
          status: 'completed' as const,
          status_history: [...apt.status_history, { status: 'completed' as const, at: nowIso }],
        };
      }
      return apt;
    });

    // Handle consultation note finalization if provided or draft exists
    let updatedNotes = [...state.consultation_notes];
    if (note) {
      const existingIdx = updatedNotes.findIndex((n) => n.appointment_id === activeEntry.appointment_id);
      if (existingIdx !== -1) {
        updatedNotes[existingIdx] = {
          ...updatedNotes[existingIdx],
          ...note,
          finalized: true,
          updated_at: nowIso,
        };
      } else {
        const apt = state.appointments.find((a) => a.id === activeEntry.appointment_id);
        updatedNotes.unshift({
          id: `cnote_${Date.now()}`,
          appointment_id: activeEntry.appointment_id,
          doctor_id: doctorId,
          patient_id: apt?.patient_id || `pat_${activeEntry.appointment_id}`,
          text: note.text,
          follow_up: note.follow_up,
          follow_up_date: note.follow_up_date,
          finalized: true,
          updated_at: nowIso,
        });
      }
    } else {
      // Finalize draft if one was already auto-saved
      updatedNotes = updatedNotes.map((n) =>
        n.appointment_id === activeEntry.appointment_id ? { ...n, finalized: true, updated_at: nowIso } : n
      );
    }

    // Recompute downstream ETAs with the updated doctor rolling average and any break/late offset
    const waitingForDoc = updatedQueue.filter((q) => q.doctor_id === doctorId && q.status === 'waiting');
    const delay = state.doctorDelays[doctorId] || 0;
    const currentAvl = state.doctor_availability[doctorId];
    let offsetMinutes = 0;
    if (currentAvl?.status === 'late') {
      offsetMinutes = currentAvl.delay_minutes || 0;
    }

    const recomputedWaiting = recomputeDoctorQueueEtas(
      { ...doc, avg_consult_minutes: newRollingAvg },
      waitingForDoc,
      null,
      delay,
      nowIso,
      offsetMinutes
    );

    const finalQueue = updatedQueue.map((q) => {
      const found = recomputedWaiting.find((rw) => rw.id === q.id);
      return found || q;
    });

    const updatedCountdowns = { ...state.calledCountdowns };
    delete updatedCountdowns[doctorId];

    set({
      doctors: updatedDoctors,
      queue_entries: finalQueue,
      appointments: updatedAppointments,
      calledCountdowns: updatedCountdowns,
      consultation_notes: updatedNotes,
    });

    useUiStore.getState().addToast({
      title: `Consultation completed`,
      description: `Token ${activeEntry.token} completed (${actualDuration}m). Doctor avg updated to ${newRollingAvg}m.`,
      variant: 'success',
    });

    return { success: true, consultMinutes: actualDuration };
  },

  setDoctorAvailability: ({ doctor_id, status, until, delay_minutes, reason, notify = true }) => {
    const state = get();
    const doc = state.doctors.find((d) => d.id === doctor_id);
    if (!doc) return { success: false, affectedCount: 0 };

    const now = new Date();
    const nowIso = now.toISOString();

    const waitingEntries = state.queue_entries.filter((q) => q.doctor_id === doctor_id && q.status === 'waiting');
    const affectedCount = waitingEntries.length;

    let offsetMinutes = 0;
    if (status === 'on_break' && until) {
      const untilDate = new Date(until);
      const diffMs = untilDate.getTime() - now.getTime();
      offsetMinutes = Math.max(0, Math.ceil(diffMs / 60000));
    } else if (status === 'late' && delay_minutes) {
      offsetMinutes = delay_minutes;
    }

    // Recompute ETAs with offset
    const currentInConsult = state.queue_entries.find((q) => q.doctor_id === doctor_id && q.status === 'in_consultation');
    const baseDelay = state.doctorDelays[doctor_id] || 0;
    const recomputedWaiting = recomputeDoctorQueueEtas(
      doc,
      waitingEntries,
      currentInConsult,
      baseDelay,
      nowIso,
      offsetMinutes
    );

    const updatedQueue = state.queue_entries.map((q) => {
      const found = recomputedWaiting.find((r) => r.id === q.id);
      return found || q;
    });

    const newAvailability: DoctorAvailabilityState = {
      doctor_id,
      status,
      until,
      delay_minutes,
      reason,
      changed_at: nowIso,
    };

    const newLogEntry: AvailabilityLogEntry = {
      id: `avl_${Date.now()}`,
      doctor_id,
      status,
      changed_at: nowIso,
      reason: reason || (status === 'available' ? 'Resumed consultations' : undefined),
      duration_minutes: delay_minutes || offsetMinutes || undefined,
    };

    const updatedAvailability = {
      ...state.doctor_availability,
      [doctor_id]: newAvailability,
    };

    const updatedLog = [newLogEntry, ...state.availability_log].slice(0, 20);

    let updatedBroadcasts = state.broadcasts;
    if (notify && affectedCount > 0 && (status === 'late' || status === 'on_break')) {
      const bcastMsg =
        status === 'late'
          ? `Advisory: ${doc.name} is delayed by ${delay_minutes || 15} minutes. Queue ETAs have adjusted.`
          : `Advisory: ${doc.name} is on temporary break. Consultations will resume shortly.`;

      const newBcast: BroadcastLog = {
        id: `bcast_${Date.now()}`,
        hospital_id: state.hospital.id,
        type: 'delay',
        audience_type: 'doctor',
        target_id: doctor_id,
        target_name: doc.name,
        minutes_delayed: delay_minutes || offsetMinutes,
        channels: ['in_app', 'sms'],
        message: bcastMsg,
        recipients_count: affectedCount,
        sent_count: affectedCount,
        failed_count: 0,
        sent_at: nowIso,
      };

      updatedBroadcasts = [newBcast, ...state.broadcasts];

      useUiStore.getState().addAlert({
        severity: 'warning',
        title: `${doc.name} availability update`,
        message: bcastMsg,
        actionLabel: 'View queue',
        actionUrl: `/admin/queue?dept=${doc.department_id}`,
        doctor_id,
      });
    }

    set({
      doctor_availability: updatedAvailability,
      availability_log: updatedLog,
      queue_entries: updatedQueue,
      broadcasts: updatedBroadcasts,
    });

    return { success: true, affectedCount };
  },

  saveConsultationDraft: (noteData) => {
    const state = get();
    const existingIdx = state.consultation_notes.findIndex(
      (n) => n.appointment_id === noteData.appointment_id
    );

    const nowIso = new Date().toISOString();

    if (existingIdx !== -1) {
      const updatedNote: ConsultationNote = {
        ...state.consultation_notes[existingIdx],
        ...noteData,
        updated_at: nowIso,
      };
      const updatedList = [...state.consultation_notes];
      updatedList[existingIdx] = updatedNote;
      set({ consultation_notes: updatedList });
      return updatedNote;
    } else {
      const newNote: ConsultationNote = {
        id: `cnote_${Date.now()}`,
        ...noteData,
        finalized: false,
        updated_at: nowIso,
      };
      set({ consultation_notes: [newNote, ...state.consultation_notes] });
      return newNote;
    }
  },

  finalizeConsultationNote: (noteId: string) => {
    set((state) => ({
      consultation_notes: state.consultation_notes.map((n) =>
        n.id === noteId ? { ...n, finalized: true, updated_at: new Date().toISOString() } : n
      ),
    }));
  },

  getDoctorEffectiveStatus: (doctorId: string) => {
    const state = get();
    const activeInConsult = state.queue_entries.some(
      (q) => q.doctor_id === doctorId && q.status === 'in_consultation'
    );

    const baseAvl = state.doctor_availability[doctorId];

    // Derived: in consultation if active and not on leave
    if (activeInConsult && baseAvl?.status !== 'on_leave') {
      return { status: 'in_consultation' as const };
    }

    if (!baseAvl) return { status: 'available' as const };

    return {
      status: baseAvl.status,
      lateMinutes: baseAvl.delay_minutes,
      until: baseAvl.until,
      reason: baseAvl.reason,
    };
  },

  skipQueueEntry: (entryId: string) => {
    const state = get();
    const entry = state.queue_entries.find((q) => q.id === entryId);
    if (!entry) return { success: false };

    const waitingForDoc = state.queue_entries.filter(
      (q) => q.doctor_id === entry.doctor_id && q.status === 'waiting'
    );
    const reordered = handleQueueSkip(waitingForDoc, entryId);

    const updatedQueue = state.queue_entries.map((q) => {
      const match = reordered.find((r) => r.id === q.id);
      return match || q;
    });

    set({ queue_entries: updatedQueue });

    useUiStore.getState().addToast({
      title: `Skipped token ${entry.token}`,
      description: 'Patient moved back one place in the queue.',
      variant: 'default',
    });

    return { success: true };
  },

  markNoShow: (entryId: string) => {
    const state = get();
    const entry = state.queue_entries.find((q) => q.id === entryId);
    if (!entry) return { success: false };

    const nowIso = new Date().toISOString();

    const updatedQueue = state.queue_entries.map((q) =>
      q.id === entryId ? { ...q, status: 'no_show' as const } : q
    );

    const updatedAppointments = state.appointments.map((apt) => {
      if (apt.id === entry.appointment_id) {
        return {
          ...apt,
          status: 'no_show' as const,
          status_history: [...apt.status_history, { status: 'no_show' as const, at: nowIso }],
        };
      }
      return apt;
    });

    // Clear countdown if this was the called patient
    const updatedCountdowns = { ...state.calledCountdowns };
    delete updatedCountdowns[entry.doctor_id];

    // Recompute ETAs for remaining waiting
    const doc = state.doctors.find((d) => d.id === entry.doctor_id)!;
    const remainingWaiting = updatedQueue.filter((q) => q.doctor_id === entry.doctor_id && q.status === 'waiting');
    const delay = state.doctorDelays[entry.doctor_id] || 0;
    const recomputed = recomputeDoctorQueueEtas(doc, remainingWaiting, null, delay);

    const finalQueue = updatedQueue.map((q) => {
      const found = recomputed.find((r) => r.id === q.id);
      return found || q;
    });

    set({
      queue_entries: finalQueue,
      appointments: updatedAppointments,
      calledCountdowns: updatedCountdowns,
    });

    useUiStore.getState().addToast({
      title: `Marked no-show`,
      description: `Token ${entry.token} has been recorded as no-show. Slot released.`,
      variant: 'danger',
    });

    return { success: true };
  },

  moveToPriority: (entryId: string) => {
    const state = get();
    const entry = state.queue_entries.find((q) => q.id === entryId);
    if (!entry) return { success: false };

    const newPriority = entry.priority === 1 ? 2 : 1;
    const updatedQueue = state.queue_entries.map((q) =>
      q.id === entryId ? { ...q, priority: newPriority } : q
    );

    // Recompute order and ETAs
    const doc = state.doctors.find((d) => d.id === entry.doctor_id)!;
    const waiting = updatedQueue.filter((q) => q.doctor_id === entry.doctor_id && q.status === 'waiting');
    const delay = state.doctorDelays[entry.doctor_id] || 0;
    const recomputed = recomputeDoctorQueueEtas(doc, waiting, null, delay);

    const finalQueue = updatedQueue.map((q) => {
      const found = recomputed.find((r) => r.id === q.id);
      return found || q;
    });

    set({ queue_entries: finalQueue });

    useUiStore.getState().addToast({
      title: newPriority === 1 ? 'Moved to Priority' : 'Removed Priority',
      description: `Token ${entry.token} is now ${newPriority === 1 ? 'Priority (elderly/pregnant/critical)' : 'Normal priority'}.`,
      variant: 'default',
    });

    return { success: true };
  },

  emergencyInsert: ({ doctorId, departmentId, patientName, age, gender, phone, reason }) => {
    const state = get();
    const doc = state.doctors.find((d) => d.id === doctorId);
    const dept = state.departments.find((d) => d.id === departmentId);
    if (!doc || !dept) {
      return { success: false, token: '', appointmentId: '' };
    }

    const todayDateStr = getTodayDateStringIST();
    const now = new Date();
    const nowIso = now.toISOString();

    // Next token sequence
    const existingTokens = state.queue_entries.filter((q) => q.department_id === departmentId);
    const nextSeq = existingTokens.length + 1;
    const token = `${dept.token_prefix}-${nextSeq.toString().padStart(3, '0')}`;

    const aptId = `apt_em_${Date.now()}`;
    const newApt: Appointment = {
      id: aptId,
      booking_code: `EMG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      patient_id: `pat_em_${Date.now()}`,
      patient: {
        name: patientName,
        age: age || 40,
        gender: gender || 'other',
        phone: phone || '+91 99999 00000',
      },
      hospital_id: state.hospital.id,
      department_id: dept.id,
      doctor_id: doc.id,
      hospital_name: state.hospital.name,
      doctor_name: doc.name,
      department_name: dept.name,
      scheduled_start: nowIso,
      scheduled_end: new Date(now.getTime() + 15 * 60000).toISOString(),
      type: 'walk_in',
      reason: `EMERGENCY: ${reason}`,
      fee: doc.fee,
      status: 'in_queue',
      status_history: [
        { status: 'booked', at: nowIso },
        { status: 'checked_in', at: nowIso },
        { status: 'in_queue', at: nowIso, note: 'Emergency insert by front desk' },
      ],
      created_via: 'desk',
      created_at: nowIso,
      updated_at: nowIso,
      desk_confirmed: true,
    };

    const newQueueEntry: QueueEntry = {
      id: `q_${aptId}`,
      appointment_id: aptId,
      hospital_id: state.hospital.id,
      department_id: dept.id,
      doctor_id: doc.id,
      queue_date: todayDateStr,
      token,
      token_number: nextSeq,
      priority: 0, // Emergency Priority 0 (always top)
      status: 'waiting',
      sort_time: nowIso,
      call_count: 0,
      checked_in_at: nowIso,
      created_at: nowIso,
      skip_count: 0,
    };

    const updatedQueue = [...state.queue_entries, newQueueEntry];
    const waiting = updatedQueue.filter((q) => q.doctor_id === doctorId && q.status === 'waiting');
    const delay = state.doctorDelays[doctorId] || 0;
    const recomputed = recomputeDoctorQueueEtas(doc, waiting, null, delay);

    const finalQueue = updatedQueue.map((q) => {
      const match = recomputed.find((r) => r.id === q.id);
      return match || q;
    });

    set({
      appointments: [newApt, ...state.appointments],
      queue_entries: finalQueue,
    });

    useUiStore.getState().addToast({
      title: `Emergency token ${token} inserted`,
      description: `${patientName} placed at the top of ${doc.name}'s queue.`,
      variant: 'danger',
    });

    get().logAuditAction('EMERGENCY_INSERT', `Inserted emergency token ${token} for ${patientName} with ${doc.name}`);

    return { success: true, token, appointmentId: aptId };
  },

  broadcastDelay: ({ doctorId, minutes, message }) => {
    const state = get();
    const doc = state.doctors.find((d) => d.id === doctorId);
    if (!doc) return { success: false, affectedCount: 0 };

    const waitingForDoc = state.queue_entries.filter((q) => q.doctor_id === doctorId && q.status === 'waiting');
    const affectedCount = waitingForDoc.length;

    // Apply delay
    const newDelays = {
      ...state.doctorDelays,
      [doctorId]: (state.doctorDelays[doctorId] || 0) + minutes,
    };

    // Recompute ETAs
    const recomputed = recomputeDoctorQueueEtas(doc, waitingForDoc, null, newDelays[doctorId]);
    const finalQueue = state.queue_entries.map((q) => {
      const match = recomputed.find((r) => r.id === q.id);
      return match || q;
    });

    const bcastLog: BroadcastLog = {
      id: `bcast_${Date.now()}`,
      hospital_id: state.hospital.id,
      type: 'delay',
      audience_type: 'doctor',
      target_id: doctorId,
      target_name: doc.name,
      minutes_delayed: minutes,
      channels: ['in_app', 'sms'],
      message,
      recipients_count: affectedCount,
      sent_count: affectedCount,
      failed_count: 0,
      sent_at: new Date().toISOString(),
    };

    set({
      doctorDelays: newDelays,
      queue_entries: finalQueue,
      broadcasts: [bcastLog, ...state.broadcasts],
    });

    useUiStore.getState().addToast({
      title: `Broadcast sent (${minutes}m delay)`,
      description: `${affectedCount} waiting patients notified. Queue ETAs shifted by ${minutes}m.`,
      variant: 'default',
    });

    get().logAuditAction('BROADCAST_DELAY', `Sent ${minutes}m delay broadcast for ${doc.name} to ${affectedCount} patients`);

    return { success: true, affectedCount };
  },

  checkInAppointment: (appointmentId: string, createdVia?: CreatedVia) => {
    const state = get();
    const apt = state.appointments.find((a) => a.id === appointmentId);
    if (!apt) {
      return { success: false, message: 'Appointment not found.' };
    }

    if (apt.status === 'checked_in' || apt.status === 'in_queue' || apt.status === 'in_consultation' || apt.status === 'completed') {
      const existingQ = state.queue_entries.find((q) => q.appointment_id === appointmentId);
      return {
        success: true,
        token: existingQ?.token,
        position: existingQ?.position,
        etaMinutes: existingQ?.eta_minutes,
        message: `Already checked in with token ${existingQ?.token}.`,
      };
    }

    if (apt.status === 'cancelled') {
      return { success: false, message: 'Cannot check in: appointment is cancelled.' };
    }

    const doc = state.doctors.find((d) => d.id === apt.doctor_id)!;
    const dept = state.departments.find((d) => d.id === apt.department_id)!;

    const now = new Date();
    const nowIso = now.toISOString();

    // Check grace period
    const isLate = isGracePeriodExceeded(
      apt.scheduled_start,
      nowIso,
      state.hospital.settings.grace_period_minutes
    );

    // Sequence token
    const existingDeptQueue = state.queue_entries.filter((q) => q.department_id === dept.id);
    const tokenNum = existingDeptQueue.length + 1;
    const token = `${dept.token_prefix}-${tokenNum.toString().padStart(3, '0')}`;

    // Determine priority
    let priority = 2;
    if (apt.patient.age && apt.patient.age >= 65) priority = 1;

    // If late arrival, sort_time is reset to arrival time (now) so they join behind current queue
    const sortTime = isLate ? nowIso : apt.scheduled_start;

    const newQueueEntry: QueueEntry = {
      id: `q_${apt.id}`,
      appointment_id: apt.id,
      hospital_id: state.hospital.id,
      department_id: dept.id,
      doctor_id: doc.id,
      queue_date: getTodayDateStringIST(),
      token,
      token_number: tokenNum,
      priority,
      status: 'waiting',
      sort_time: sortTime,
      call_count: 0,
      checked_in_at: nowIso,
      created_at: nowIso,
      skip_count: 0,
      is_late_arrival: isLate,
    };

    const updatedQueue = [...state.queue_entries, newQueueEntry];
    const waitingForDoc = updatedQueue.filter((q) => q.doctor_id === doc.id && q.status === 'waiting');
    const delay = state.doctorDelays[doc.id] || 0;
    const recomputed = recomputeDoctorQueueEtas(doc, waitingForDoc, null, delay);

    const finalQueue = updatedQueue.map((q) => {
      const match = recomputed.find((r) => r.id === q.id);
      return match || q;
    });

    const targetQ = recomputed.find((q) => q.id === newQueueEntry.id);

    const updatedAppointments = state.appointments.map((a) => {
      if (a.id === appointmentId) {
        return {
          ...a,
          created_via: createdVia || a.created_via || 'desk',
          status: 'in_queue' as const,
          status_history: [
            ...a.status_history,
            { status: 'checked_in' as const, at: nowIso },
            { status: 'in_queue' as const, at: nowIso, note: isLate ? 'Late arrival: place reset behind queue' : undefined },
          ],
        };
      }
      return a;
    });

    set({
      queue_entries: finalQueue,
      appointments: updatedAppointments,
    });

    syncManager.broadcastSnapshot();

    get().logAuditAction('CHECK_IN', `Checked in ${apt.patient.name}, assigned token ${token}`);

    return {
      success: true,
      token,
      position: targetQ?.position,
      etaMinutes: targetQ?.eta_minutes,
      isLate,
      message: isLate ? 'Checked in with Late Arrival penalty. Position placed behind current queue.' : 'Checked in successfully.',
    };
  },

  registerWalkIn: ({ patient, departmentId, doctorId, reason, priority, created_via }) => {
    const state = get();
    const doc = state.doctors.find((d) => d.id === doctorId)!;
    const dept = state.departments.find((d) => d.id === departmentId)!;

    const now = new Date();
    const nowIso = now.toISOString();

    const existingDeptQueue = state.queue_entries.filter((q) => q.department_id === dept.id);
    const tokenNum = existingDeptQueue.length + 1;
    const token = `${dept.token_prefix}-${tokenNum.toString().padStart(3, '0')}`;

    const aptId = `apt_walk_${Date.now()}`;
    const newApt: Appointment = {
      id: aptId,
      booking_code: `WLK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      patient_id: `pat_w_${Date.now()}`,
      patient,
      hospital_id: state.hospital.id,
      department_id: dept.id,
      doctor_id: doc.id,
      hospital_name: state.hospital.name,
      doctor_name: doc.name,
      department_name: dept.name,
      scheduled_start: nowIso,
      scheduled_end: new Date(now.getTime() + 15 * 60000).toISOString(),
      type: 'walk_in',
      reason,
      fee: doc.fee,
      status: 'in_queue',
      status_history: [
        { status: 'booked', at: nowIso },
        { status: 'checked_in', at: nowIso },
        { status: 'in_queue', at: nowIso, note: 'Walk-in registered' },
      ],
      created_via: created_via || 'desk',
      created_at: nowIso,
      updated_at: nowIso,
      desk_confirmed: true,
    };

    const newQueueEntry: QueueEntry = {
      id: `q_${aptId}`,
      appointment_id: aptId,
      hospital_id: state.hospital.id,
      department_id: dept.id,
      doctor_id: doc.id,
      queue_date: getTodayDateStringIST(),
      token,
      token_number: tokenNum,
      priority,
      status: 'waiting',
      sort_time: nowIso,
      call_count: 0,
      checked_in_at: nowIso,
      created_at: nowIso,
      skip_count: 0,
    };

    const updatedQueue = [...state.queue_entries, newQueueEntry];
    const waitingForDoc = updatedQueue.filter((q) => q.doctor_id === doc.id && q.status === 'waiting');
    const delay = state.doctorDelays[doc.id] || 0;
    const recomputed = recomputeDoctorQueueEtas(doc, waitingForDoc, null, delay);

    const finalQueue = updatedQueue.map((q) => {
      const match = recomputed.find((r) => r.id === q.id);
      return match || q;
    });

    const targetQ = recomputed.find((q) => q.id === newQueueEntry.id)!;

    set({
      appointments: [newApt, ...state.appointments],
      queue_entries: finalQueue,
    });

    syncManager.broadcastSnapshot();

    get().logAuditAction('WALK_IN_REGISTRATION', `Registered walk-in ${patient.name}, assigned token ${token}`);

    return {
      success: true,
      appointment: newApt,
      queueEntry: targetQ || newQueueEntry,
    };
  },

  rescheduleAppointment: (appointmentId, newDateStr, newSlotTime, reason) => {
    const state = get();
    const nowIso = new Date().toISOString();

    const [hour, min] = newSlotTime.split(':').map(Number);
    const newStart = new Date(`${newDateStr}T00:00:00.000Z`);
    newStart.setUTCHours(hour - 5, min - 30); // Approximate IST to UTC
    const newEnd = new Date(newStart.getTime() + 15 * 60000);

    const updatedAppointments = state.appointments.map((apt) => {
      if (apt.id === appointmentId) {
        return {
          ...apt,
          scheduled_start: newStart.toISOString(),
          scheduled_end: newEnd.toISOString(),
          status: 'rescheduled' as const,
          status_history: [
            ...apt.status_history,
            {
              status: 'rescheduled' as const,
              at: nowIso,
              note: reason ? `Rescheduled: ${reason}` : 'Rescheduled by front desk',
            },
          ],
        };
      }
      return apt;
    });

    // Remove from active queue if present
    const updatedQueue = state.queue_entries.filter((q) => q.appointment_id !== appointmentId);

    set({
      appointments: updatedAppointments,
      queue_entries: updatedQueue,
    });

    useUiStore.getState().addToast({
      title: 'Appointment rescheduled',
      description: `New appointment set for ${newDateStr} at ${newSlotTime}.`,
      variant: 'default',
    });

    get().logAuditAction('RESCHEDULE', `Rescheduled appointment ${appointmentId} to ${newDateStr} ${newSlotTime}`);

    return true;
  },

  cancelAppointment: (appointmentId, reason, notifyPatient) => {
    const state = get();
    const nowIso = new Date().toISOString();

    const updatedAppointments = state.appointments.map((apt) => {
      if (apt.id === appointmentId) {
        return {
          ...apt,
          status: 'cancelled' as const,
          cancelled_reason: reason,
          status_history: [
            ...apt.status_history,
            {
              status: 'cancelled' as const,
              at: nowIso,
              note: `Cancelled: ${reason}${notifyPatient ? ' (patient notified)' : ''}`,
            },
          ],
        };
      }
      return apt;
    });

    // Remove from queue
    const updatedQueue = state.queue_entries.filter((q) => q.appointment_id !== appointmentId);

    set({
      appointments: updatedAppointments,
      queue_entries: updatedQueue,
    });

    useUiStore.getState().addToast({
      title: 'Appointment cancelled',
      description: `Reason: ${reason}`,
      variant: 'danger',
    });

    get().logAuditAction('CANCEL_APPOINTMENT', `Cancelled appointment ${appointmentId}: ${reason}`);

    return true;
  },

  confirmAppointment: (appointmentId) => {
    const state = get();
    const nowIso = new Date().toISOString();

    const updated = state.appointments.map((apt) => {
      if (apt.id === appointmentId) {
        return {
          ...apt,
          desk_confirmed: true,
          status_history: [
            ...apt.status_history,
            { status: apt.status, at: nowIso, note: 'Confirmed by front desk' },
          ],
        };
      }
      return apt;
    });

    set({ appointments: updated });

    useUiStore.getState().addToast({
      title: 'Appointment confirmed',
      description: 'Front desk confirmation logged in appointment history.',
      variant: 'success',
    });

    get().logAuditAction('CONFIRM_APPOINTMENT', `Confirmed appointment ${appointmentId}`);

    return true;
  },

  addDepartment: (dept) => {
    const state = get();
    const id = `dept_${Date.now()}`;
    const newDept: Department = {
      ...dept,
      id,
      hospital_id: state.hospital.id,
    };
    set({ departments: [...state.departments, newDept] });
    useUiStore.getState().addToast({
      title: 'Department created',
      description: `${newDept.name} (Prefix: ${newDept.token_prefix}) added.`,
      variant: 'success',
    });
    get().logAuditAction('CREATE_DEPARTMENT', `Added department ${newDept.name} (${newDept.token_prefix})`);
    return true;
  },

  updateDepartment: (dept) => {
    set((state) => ({
      departments: state.departments.map((d) => (d.id === dept.id ? dept : d)),
    }));
    useUiStore.getState().addToast({
      title: 'Department updated',
      description: `${dept.name} details saved.`,
      variant: 'default',
    });
    get().logAuditAction('UPDATE_DEPARTMENT', `Updated department ${dept.name}`);
    return true;
  },

  toggleDepartmentActive: (deptId) => {
    const state = get();
    const dept = state.departments.find((d) => d.id === deptId);
    if (!dept) return { success: false, reason: 'Department not found' };

    if (dept.is_active) {
      // Check if any active doctors exist in department
      const activeDoctors = state.doctors.filter((d) => d.department_id === deptId && d.is_active);
      if (activeDoctors.length > 0) {
        return {
          success: false,
          reason: `Cannot deactivate: ${activeDoctors.length} active doctors are assigned to this department. Deactivate doctors first.`,
        };
      }
    }

    set({
      departments: state.departments.map((d) =>
        d.id === deptId ? { ...d, is_active: !d.is_active } : d
      ),
    });

    useUiStore.getState().addToast({
      title: `Department ${dept.is_active ? 'deactivated' : 'reactivated'}`,
      variant: 'default',
    });

    get().logAuditAction('TOGGLE_DEPARTMENT', `Toggled department ${dept.name} active state`);
    return { success: true };
  },

  addDoctor: (doc) => {
    const state = get();
    const id = `doc_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newDoc: Doctor = {
      ...doc,
      id,
      hospital_id: state.hospital.id,
      rating_avg: 5.0,
      rating_count: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Default schedule for new doctor
    const newSchedule: DoctorSchedule = {
      id: `sched_${id}`,
      doctor_id: id,
      hospital_id: state.hospital.id,
      slot_minutes: 15,
      weekly: [
        { weekday: 0, start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
        { weekday: 1, start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
        { weekday: 2, start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
        { weekday: 3, start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
        { weekday: 4, start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
      ],
      updated_at: nowIso,
    };

    set({
      doctors: [...state.doctors, newDoc],
      doctor_schedules: [...state.doctor_schedules, newSchedule],
    });

    useUiStore.getState().addToast({
      title: 'Doctor added',
      description: `${newDoc.name} profile created with default schedule.`,
      variant: 'success',
    });

    get().logAuditAction('ADD_DOCTOR', `Added doctor profile for ${newDoc.name}`);
    return true;
  },

  updateDoctor: (doc) => {
    set((state) => ({
      doctors: state.doctors.map((d) => (d.id === doc.id ? doc : d)),
    }));
    useUiStore.getState().addToast({
      title: 'Doctor profile updated',
      description: `${doc.name} changes saved.`,
      variant: 'default',
    });
    get().logAuditAction('UPDATE_DOCTOR', `Updated profile for ${doc.name}`);
    return true;
  },

  toggleDoctorActive: (doctorId) => {
    const state = get();
    const doc = state.doctors.find((d) => d.id === doctorId);
    if (!doc) return { success: false, affectedCount: 0 };

    const upcomingCount = state.appointments.filter(
      (a) => a.doctor_id === doctorId && (a.status === 'booked' || a.status === 'in_queue')
    ).length;

    set({
      doctors: state.doctors.map((d) =>
        d.id === doctorId ? { ...d, is_active: !d.is_active } : d
      ),
    });

    useUiStore.getState().addToast({
      title: `Doctor ${doc.is_active ? 'deactivated' : 'reactivated'}`,
      description: doc.is_active ? `${upcomingCount} upcoming appointments affected.` : 'Doctor available for bookings.',
      variant: 'default',
    });

    get().logAuditAction('TOGGLE_DOCTOR', `Toggled active status for ${doc.name}`);
    return { success: true, affectedCount: upcomingCount };
  },

  saveDoctorSchedule: (schedule) => {
    set((state) => {
      const exists = state.doctor_schedules.some((s) => s.doctor_id === schedule.doctor_id);
      return {
        doctor_schedules: exists
          ? state.doctor_schedules.map((s) => (s.doctor_id === schedule.doctor_id ? schedule : s))
          : [...state.doctor_schedules, schedule],
      };
    });
    useUiStore.getState().addToast({
      title: 'Schedule saved',
      description: 'Weekly availability template updated successfully.',
      variant: 'success',
    });
    get().logAuditAction('SAVE_SCHEDULE', `Updated schedule for doctor ${schedule.doctor_id}`);
    return true;
  },

  addDoctorLeave: (leave) => {
    const state = get();
    const newLeave: DoctorLeave = {
      ...leave,
      id: `leave_${Date.now()}`,
      hospital_id: state.hospital.id,
    };

    const leaveStart = new Date(leave.date_from.includes('T') ? leave.date_from : `${leave.date_from}T00:00:00.000Z`).getTime();
    const leaveEnd = new Date(leave.date_to.includes('T') ? leave.date_to : `${leave.date_to}T23:59:59.999Z`).getTime();

    // Mark affected appointments with needs_reschedule
    let affected = 0;
    const updatedAppointments = state.appointments.map((a) => {
      const aptTime = new Date(a.scheduled_start).getTime();
      const inRange =
        a.doctor_id === leave.doctor_id &&
        (a.status === 'booked' || a.status === 'in_queue') &&
        aptTime >= leaveStart &&
        aptTime <= leaveEnd;

      if (inRange) {
        affected++;
        return { ...a, needs_reschedule: true };
      }
      return a;
    });

    // Check if leave covers today
    const now = new Date();
    const isTodayInLeave = now.getTime() >= leaveStart && now.getTime() <= leaveEnd;
    let updatedAvailability = state.doctor_availability;
    if (isTodayInLeave) {
      updatedAvailability = {
        ...state.doctor_availability,
        [leave.doctor_id]: {
          doctor_id: leave.doctor_id,
          status: 'on_leave',
          reason: leave.reason,
          changed_at: now.toISOString(),
        },
      };
    }

    set({
      doctor_leaves: [...state.doctor_leaves, newLeave],
      appointments: updatedAppointments,
      doctor_availability: updatedAvailability,
    });

    useUiStore.getState().addToast({
      title: 'Leave scheduled',
      description: affected > 0 ? `Leave added. ${affected} appointments flagged for rescheduling.` : 'Leave added.',
      variant: affected > 0 ? 'danger' : 'default',
    });

    get().logAuditAction('ADD_LEAVE', `Added leave for doctor ${leave.doctor_id}`);
    return { success: true, affectedCount: affected };
  },

  removeDoctorLeave: (leaveId) => {
    const state = get();
    const leave = state.doctor_leaves.find((l) => l.id === leaveId);
    if (!leave) return false;

    // Check if leave has already started (doctor is actively on leave)
    const currentStatus = state.doctor_availability[leave.doctor_id]?.status;
    const lStart = new Date(leave.date_from.includes('T') ? leave.date_from : `${leave.date_from}T00:00:00.000Z`).getTime();
    const lEnd = new Date(leave.date_to.includes('T') ? leave.date_to : `${leave.date_to}T23:59:59.999Z`).getTime();
    if (currentStatus === 'on_leave' && lStart < Date.now() && lEnd > Date.now()) {
      useUiStore.getState().addToast({
        title: 'Cannot cancel active leave',
        description: 'Leave that is currently underway cannot be cancelled without admin clearance.',
        variant: 'danger',
      });
      return false;
    }

    const remainingLeaves = state.doctor_leaves.filter((l) => l.id !== leaveId);

    // Recheck needs_reschedule flags on appointments
    const updatedAppointments = state.appointments.map((a) => {
      if (a.doctor_id !== leave.doctor_id) return a;
      const aptTime = new Date(a.scheduled_start).getTime();
      const overlapsOther = remainingLeaves.some((l) => {
        const s = new Date(l.date_from.includes('T') ? l.date_from : `${l.date_from}T00:00:00.000Z`).getTime();
        const e = new Date(l.date_to.includes('T') ? l.date_to : `${l.date_to}T23:59:59.999Z`).getTime();
        return l.doctor_id === a.doctor_id && aptTime >= s && aptTime <= e;
      });
      return { ...a, needs_reschedule: overlapsOther };
    });

    let updatedAvailability = state.doctor_availability;
    if (state.doctor_availability[leave.doctor_id]?.status === 'on_leave') {
      updatedAvailability = {
        ...state.doctor_availability,
        [leave.doctor_id]: {
          doctor_id: leave.doctor_id,
          status: 'available',
          changed_at: new Date().toISOString(),
        },
      };
    }

    set({
      doctor_leaves: remainingLeaves,
      appointments: updatedAppointments,
      doctor_availability: updatedAvailability,
    });

    useUiStore.getState().addToast({
      title: 'Leave cancelled',
      description: 'The scheduled leave has been cancelled.',
      variant: 'default',
    });
    return true;
  },

  updateHospitalSettings: (settings) => {
    set((state) => ({
      hospital: {
        ...state.hospital,
        settings,
        updated_at: new Date().toISOString(),
      },
    }));
    useUiStore.getState().addToast({
      title: 'Policies updated',
      description: 'Grace period and cancellation rules saved.',
      variant: 'success',
    });
    get().logAuditAction('UPDATE_SETTINGS', 'Updated hospital queue policies');
    return true;
  },

  updateHospitalProfile: (profile) => {
    set((state) => ({
      hospital: {
        ...state.hospital,
        ...profile,
        updated_at: new Date().toISOString(),
      },
    }));
    useUiStore.getState().addToast({
      title: 'Hospital profile updated',
      description: 'Changes published.',
      variant: 'success',
    });
    get().logAuditAction('UPDATE_PROFILE', 'Updated hospital facility and contact info');
    return true;
  },

  updateTemplate: (type, template) => {
    set((state) => ({
      templates: state.templates.map((t) => (t.type === type ? template : t)),
    }));
    useUiStore.getState().addToast({
      title: 'Template saved',
      description: `Notification template for ${template.label} updated.`,
      variant: 'default',
    });
    return true;
  },

  addStaffUser: (user) => {
    const state = get();
    const id = `user_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newUser: User = {
      ...user,
      id,
      hospital_id: state.hospital.id,
      created_at: nowIso,
      updated_at: nowIso,
      last_active: 'Never',
    };
    set({ users: [...state.users, newUser] });
    useUiStore.getState().addToast({
      title: 'Staff member added',
      description: `${newUser.name} assigned role ${newUser.role}. Invite sent.`,
      variant: 'success',
    });
    get().logAuditAction('ADD_STAFF', `Added staff user ${newUser.name} (${newUser.role})`);
    return true;
  },

  updateStaffUser: (user) => {
    set((state) => ({
      users: state.users.map((u) => (u.id === user.id ? user : u)),
    }));
    useUiStore.getState().addToast({
      title: 'Staff details updated',
      description: `${user.name} role/details saved.`,
      variant: 'default',
    });
    get().logAuditAction('UPDATE_STAFF', `Updated staff user ${user.name}`);
    return true;
  },

  toggleStaffActive: (userId) => {
    const state = get();
    const user = state.users.find((u) => u.id === userId);
    if (!user) return { success: false, reason: 'User not found' };

    // Self-deactivation guard: Cannot deactivate oneself (user_admin_1 in demo)
    if (userId === 'user_admin_1') {
      return { success: false, reason: 'You cannot deactivate your own administrative account.' };
    }

    // Last admin guard
    if (user.role === 'hospital_admin' && user.is_active) {
      const activeAdmins = state.users.filter((u) => u.role === 'hospital_admin' && u.is_active);
      if (activeAdmins.length <= 1) {
        return { success: false, reason: 'Cannot deactivate the last active Hospital Administrator.' };
      }
    }

    set({
      users: state.users.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u)),
    });

    useUiStore.getState().addToast({
      title: `Staff member ${user.is_active ? 'deactivated' : 'reactivated'}`,
      variant: 'default',
    });

    get().logAuditAction('TOGGLE_STAFF', `Toggled active status for ${user.name}`);
    return { success: true };
  },

  addPatientNote: (note) => {
    const newNote: PatientNote = {
      ...note,
      id: `note_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ patient_notes: [newNote, ...state.patient_notes] }));
    useUiStore.getState().addToast({
      title: 'Note added',
      description: 'Staff note recorded.',
      variant: 'default',
    });
    return true;
  },

  logAuditAction: (action, details) => {
    const newLog: AuditLog = {
      id: `audit_${Date.now()}`,
      actor_id: 'user_admin_1',
      actor_name: 'Suresh Narayanan',
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ audit_logs: [newLog, ...state.audit_logs] }));
  },
}));

function aptPatientName(state: HospitalState, aptId: string): string {
  const apt = state.appointments.find((a) => a.id === aptId);
  return apt ? apt.patient.name : 'Patient';
}
