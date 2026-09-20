import { create } from 'zustand';
import type { Role, Capability, PermissionsMatrix } from '@/types';

const DEFAULT_PERMISSIONS: PermissionsMatrix = {
  hospital_admin: {
    view_dashboard: true,
    manage_appointments: true,
    queue_control: true,
    walk_in_registration: true,
    check_in: true,
    view_patients: true,
    manage_doctors: true,
    manage_schedules: true,
    manage_departments: true,
    reports_and_export: true,
    manage_staff: true,
    hospital_settings: true,
    send_broadcasts: true,
  },
  receptionist: {
    view_dashboard: true,
    manage_appointments: true,
    queue_control: true,
    walk_in_registration: true,
    check_in: true,
    view_patients: true,
    manage_doctors: false,
    manage_schedules: false,
    manage_departments: false,
    reports_and_export: false,
    manage_staff: false,
    hospital_settings: false,
    send_broadcasts: false,
  },
  doctor: {
    view_dashboard: true,
    manage_appointments: false,
    queue_control: true,
    walk_in_registration: false,
    check_in: false,
    view_patients: true,
    manage_doctors: false,
    manage_schedules: true,
    manage_departments: false,
    reports_and_export: false,
    manage_staff: false,
    hospital_settings: false,
    send_broadcasts: false,
  },
  patient: {
    view_dashboard: false,
    manage_appointments: false,
    queue_control: false,
    walk_in_registration: false,
    check_in: false,
    view_patients: false,
    manage_doctors: false,
    manage_schedules: false,
    manage_departments: false,
    reports_and_export: false,
    manage_staff: false,
    hospital_settings: false,
    send_broadcasts: false,
  },
  super_admin: {
    view_dashboard: true,
    manage_appointments: true,
    queue_control: true,
    walk_in_registration: true,
    check_in: true,
    view_patients: true,
    manage_doctors: true,
    manage_schedules: true,
    manage_departments: true,
    reports_and_export: true,
    manage_staff: true,
    hospital_settings: true,
    send_broadcasts: true,
  },
};

interface AuthState {
  currentRole: Role;
  currentUserId: string;
  currentUserName: string;
  currentDoctorId: string;
  permissions: PermissionsMatrix;
  setRole: (role: Role, doctorId?: string) => void;
  setDoctorId: (doctorId: string) => void;
  updatePermission: (role: Role, capability: Capability, value: boolean) => void;
  hasCapability: (capability: Capability) => boolean;
  resetPermissions: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentRole: 'hospital_admin',
  currentUserId: 'user_admin_1',
  currentUserName: 'Suresh Narayanan',
  currentDoctorId: 'doc_card_2', // Default: Dr. Meena Raj, Cardiology
  permissions: DEFAULT_PERMISSIONS,

  setDoctorId: (doctorId: string) => {
    set({ currentDoctorId: doctorId });
  },

  setRole: (role: Role, doctorId?: string) => {
    if (role === 'doctor') {
      const docId = doctorId || get().currentDoctorId || 'doc_card_2';
      set({
        currentRole: 'doctor',
        currentUserId: 'user_doc_2',
        currentUserName: 'Dr. Meena Raj',
        currentDoctorId: docId,
      });
    } else if (role === 'receptionist') {
      set({
        currentRole: role,
        currentUserId: 'user_rec_1',
        currentUserName: 'Deepa Krishnan',
      });
    } else if (role === 'patient') {
      set({
        currentRole: 'patient',
        currentUserId: 'pat_arun_01',
        currentUserName: 'Arun Kumar',
      });
    } else {
      set({
        currentRole: 'hospital_admin',
        currentUserId: 'user_admin_1',
        currentUserName: 'Suresh Narayanan',
      });
    }
  },

  updatePermission: (role: Role, capability: Capability, value: boolean) => {
    // Hospital admin permissions are locked on
    if (role === 'hospital_admin') return;

    set((state) => ({
      permissions: {
        ...state.permissions,
        [role]: {
          ...state.permissions[role],
          [capability]: value,
        },
      },
    }));
  },

  hasCapability: (capability: Capability) => {
    const role = get().currentRole;
    return get().permissions[role]?.[capability] ?? false;
  },

  resetPermissions: () => {
    set({ permissions: DEFAULT_PERMISSIONS });
  },
}));
