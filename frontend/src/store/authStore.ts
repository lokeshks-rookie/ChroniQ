import { create } from 'zustand';
import type { Role, Capability, PermissionsMatrix } from '@/types';

export type UserRole = Role;

export interface AuthUser {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  hospital_id?: string;
  is_verified: boolean;
}

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
  // Friend's auth fields
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;

  // RBAC & role switching fields
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

const defaultAdminUser: AuthUser = {
  _id: 'user_admin_1',
  name: 'Suresh Narayanan',
  phone: '+919876543210',
  email: 'admin@cityhospital.com',
  role: 'hospital_admin',
  hospital_id: 'hosp_city_01',
  is_verified: true,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  // Default state initialized as logged-in hospital_admin for demo dashboard access
  user: defaultAdminUser,
  token: 'mock-initial-token',
  isAuthenticated: true,

  currentRole: 'hospital_admin',
  currentUserId: 'user_admin_1',
  currentUserName: 'Suresh Narayanan',
  currentDoctorId: 'doc_card_2', // Default: Dr. Meena Raj, Cardiology
  permissions: DEFAULT_PERMISSIONS,

  setAuth: (user: AuthUser, token: string) => {
    set({
      user,
      token,
      isAuthenticated: true,
      currentRole: user.role,
      currentUserId: user._id,
      currentUserName: user.name,
      currentDoctorId: user.role === 'doctor' ? (user._id || 'doc_card_2') : get().currentDoctorId,
    });
  },

  clearAuth: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      currentRole: 'patient',
      currentUserId: '',
      currentUserName: '',
    });
  },

  setDoctorId: (doctorId: string) => {
    set({ currentDoctorId: doctorId });
  },

  setRole: (role: Role, doctorId?: string) => {
    if (role === 'doctor') {
      const docId = doctorId || get().currentDoctorId || 'doc_card_2';
      const user: AuthUser = {
        _id: 'user_doc_2',
        name: 'Dr. Meena Raj',
        phone: '+919876543211',
        email: 'meena.raj@cityhospital.com',
        role: 'doctor',
        hospital_id: 'hosp_city_01',
        is_verified: true,
      };
      set({
        currentRole: 'doctor',
        currentUserId: user._id,
        currentUserName: user.name,
        currentDoctorId: docId,
        user,
        isAuthenticated: true,
      });
    } else if (role === 'receptionist') {
      const user: AuthUser = {
        _id: 'user_rec_1',
        name: 'Deepa Krishnan',
        phone: '+919876543212',
        email: 'deepa@cityhospital.com',
        role: 'receptionist',
        hospital_id: 'hosp_city_01',
        is_verified: true,
      };
      set({
        currentRole: role,
        currentUserId: user._id,
        currentUserName: user.name,
        user,
        isAuthenticated: true,
      });
    } else if (role === 'patient') {
      const user: AuthUser = {
        _id: 'pat_arun_01',
        name: 'Arun Kumar',
        phone: '+919876543213',
        email: 'arun.kumar@gmail.com',
        role: 'patient',
        is_verified: true,
      };
      set({
        currentRole: 'patient',
        currentUserId: user._id,
        currentUserName: user.name,
        user,
        isAuthenticated: true,
      });
    } else if (role === 'super_admin') {
      const user: AuthUser = {
        _id: 'user_super_1',
        name: 'Super Admin',
        phone: '+919876543214',
        email: 'superadmin@chroniq.com',
        role: 'super_admin',
        is_verified: true,
      };
      set({
        currentRole: 'super_admin',
        currentUserId: user._id,
        currentUserName: user.name,
        user,
        isAuthenticated: true,
      });
    } else {
      const user: AuthUser = {
        _id: 'user_admin_1',
        name: 'Suresh Narayanan',
        phone: '+919876543210',
        email: 'admin@cityhospital.com',
        role: 'hospital_admin',
        hospital_id: 'hosp_city_01',
        is_verified: true,
      };
      set({
        currentRole: 'hospital_admin',
        currentUserId: user._id,
        currentUserName: user.name,
        user,
        isAuthenticated: true,
      });
    }
  },

  updatePermission: (role: Role, capability: Capability, value: boolean) => {
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

// ─── Mock API ─────────────────────────────────────────────────────────────────

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export async function mockLogin(identifier: string, password: string): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (password !== 'password') {
    throw new Error('Invalid credentials. Use "password" to login.');
  }

  const roleLower = identifier.toLowerCase();
  
  let role: UserRole = 'patient';
  if (roleLower.includes('doctor')) role = 'doctor';
  else if (roleLower.includes('receptionist')) role = 'receptionist';
  else if (roleLower.includes('admin') && !roleLower.includes('super')) role = 'hospital_admin';
  else if (roleLower.includes('super')) role = 'super_admin';

  return {
    user: {
      _id: 'usr-mock-' + Date.now(),
      name: role === 'patient' ? 'Test Patient' : 'Test ' + role,
      phone: '+919876543210',
      email: identifier.includes('@') ? identifier : 'test@chroniq.com',
      role,
      is_verified: true,
      ...(role === 'doctor' || role === 'hospital_admin' || role === 'receptionist'
        ? { hospital_id: 'hosp_city_01' }
        : {}),
    },
    token: 'mock-jwt-token-1234567890',
  };
}

export interface RegisterPayload {
  name: string;
  phone: string;
  email?: string;
  password?: string;
}

export interface RegisterResponse {
  user: AuthUser;
}

export async function mockRegister(payload: RegisterPayload): Promise<RegisterResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (!payload.name || !payload.phone) {
    throw new Error('Name and phone are required.');
  }

  if (payload.phone === '9999999999') {
    throw new Error('An account with this phone number already exists.');
  }

  return {
    user: {
      _id: 'usr-mock-' + Date.now(),
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      role: 'patient',
      is_verified: false,
    }
  };
}

export async function mockVerifyOtp(identifier: string, code: string): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (code !== '123456') {
    throw new Error('Invalid or expired OTP code.');
  }

  return {
    user: {
      _id: 'usr-mock-' + Date.now(),
      name: 'Verified User',
      phone: identifier,
      role: 'patient',
      is_verified: true,
    },
    token: 'mock-jwt-token-verified-123456',
  };
}

export async function mockRequestPasswordReset(identifier: string): Promise<{ success: true }> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (!identifier.trim()) throw new Error('Please enter your phone or email.');
  return { success: true };
}

export async function mockResetPassword(_identifier: string, newPassword: string): Promise<{ success: true }> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
  return { success: true };
}
