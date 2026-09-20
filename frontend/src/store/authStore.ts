import { create } from 'zustand';
import type { Role, Capability, PermissionsMatrix } from '@/types';
import { authApi, getApiErrorMessage } from '@/services/api';

export type UserRole = Role;

export interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  hospital_id?: string;
  linked_doctor_id?: string;
  is_verified: boolean;
  is_active?: boolean;
  age?: number;
  gender?: string;
  photo_url?: string;
  email_verified?: boolean;
  notification_preferences?: any;
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

const TOKEN_KEY = 'chroniq_token';
const USER_KEY = 'chroniq_user';

function loadPersistedAuth(): { user: AuthUser | null; token: string | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    if (token && userStr) {
      const user = JSON.parse(userStr);
      if (!user.id && user._id) {
        user.id = user._id;
      }
      return { user, token };
    }
  } catch (e) {
    console.error('Failed to load persisted auth', e);
  }
  return { user: null, token: null };
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  currentRole: Role;
  currentUserId: string;
  currentUserName: string;
  currentDoctorId: string;
  permissions: PermissionsMatrix;

  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  restoreSession: () => Promise<boolean>;
  setRole: (role: Role, doctorId?: string) => void;
  setDoctorId: (doctorId: string) => void;
  updatePermission: (role: Role, capability: Capability, value: boolean) => void;
  hasCapability: (capability: Capability) => boolean;
  resetPermissions: () => void;
}

const initialAuth = loadPersistedAuth();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialAuth.user,
  token: initialAuth.token,
  isAuthenticated: Boolean(initialAuth.token && initialAuth.user),

  currentRole: initialAuth.user?.role || 'patient',
  currentUserId: initialAuth.user?.id || (initialAuth.user as any)?._id || '',
  currentUserName: initialAuth.user?.name || '',
  currentDoctorId: initialAuth.user?.linked_doctor_id || initialAuth.user?.id || 'doc_card_1',
  permissions: DEFAULT_PERMISSIONS,

  setAuth: (user: AuthUser, token: string) => {
    const normalizedUser = {
      ...user,
      id: user.id || (user as any)._id || '',
    };
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    } catch (e) {
      console.error('Failed to persist auth to localStorage', e);
    }

    set({
      user: normalizedUser,
      token,
      isAuthenticated: true,
      currentRole: normalizedUser.role,
      currentUserId: normalizedUser.id,
      currentUserName: normalizedUser.name,
      currentDoctorId:
        normalizedUser.role === 'doctor'
          ? normalizedUser.linked_doctor_id || normalizedUser.id
          : get().currentDoctorId,
    });
  },

  clearAuth: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Failed to clear persisted auth', e);
    }

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      currentRole: 'patient',
      currentUserId: '',
      currentUserName: '',
      currentDoctorId: '',
    });
  },

  restoreSession: async () => {
    const token = get().token || localStorage.getItem(TOKEN_KEY);
    if (!token) {
      get().clearAuth();
      return false;
    }

    try {
      const res = await authApi.me();
      const meData = res.data;
      const normalizedUser: AuthUser = {
        ...meData,
        id: meData.id || meData._id,
      };
      get().setAuth(normalizedUser, token);
      return true;
    } catch (err) {
      console.warn('Session restoration failed:', err);
      get().clearAuth();
      return false;
    }
  },

  setDoctorId: (doctorId: string) => {
    set({ currentDoctorId: doctorId });
  },

  setRole: (role: Role, doctorId?: string) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, role };
      set({
        currentRole: role,
        currentDoctorId: doctorId || currentUser.linked_doctor_id || get().currentDoctorId,
        user: updatedUser,
      });
    } else {
      set({ currentRole: role });
    }
  },

  updatePermission: (role: Role, capability: Capability, value: boolean) => {
    if (role === 'hospital_admin' || role === 'super_admin') return;

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

// ─── Real Authentication Helpers ──────────────────────────────────────────────

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  try {
    const res = await authApi.login({ identifier, password });
    const { token, user } = res.data;
    const normalizedUser: AuthUser = {
      ...user,
      id: user.id || user._id,
    };
    useAuthStore.getState().setAuth(normalizedUser, token);
    return { user: normalizedUser, token };
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Invalid credentials. Please try again.'));
  }
}

export interface RegisterPayload {
  name: string;
  phone: string;
  email?: string;
  password?: string;
}

export interface RegisterResponse {
  user: AuthUser;
  token?: string;
  message?: string;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  try {
    const res = await authApi.register({
      name: payload.name,
      phone: payload.phone,
      email: payload.email || undefined,
      password: payload.password,
      role: 'patient',
    });
    const { user, token, message } = res.data;
    const normalizedUser: AuthUser = {
      ...user,
      id: user.id || user._id,
    };
    if (token) {
      useAuthStore.getState().setAuth(normalizedUser, token);
    }
    return { user: normalizedUser, token, message };
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Registration failed. Please check your information.'));
  }
}

export async function verifyOtp(identifier: string, code: string, purpose = 'register'): Promise<LoginResponse> {
  try {
    const res = await authApi.verifyOtp({ target: identifier, code, purpose });
    const { user, token } = res.data;
    const normalizedUser: AuthUser = user ? { ...user, id: user.id || user._id } : (useAuthStore.getState().user as AuthUser);
    if (token && normalizedUser) {
      useAuthStore.getState().setAuth(normalizedUser, token);
    }
    return { user: normalizedUser, token };
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Invalid or expired OTP code.'));
  }
}

export async function resendOtp(target: string, purpose = 'register'): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await authApi.resendOtp({ target, purpose });
    return { success: true, message: res.data?.message };
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to resend verification code.'));
  }
}

export async function requestPasswordReset(identifier: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await authApi.forgotPassword({ target: identifier });
    return { success: true, message: res.data?.message };
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Unable to request password reset for this contact.'));
  }
}

export async function resetPassword(identifier: string, code: string, newPassword: string): Promise<{ success: boolean }> {
  try {
    await authApi.resetPassword({ target: identifier, code, new_password: newPassword });
    return { success: true };
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Password reset failed. Invalid or expired code.'));
  }
}

// ── Backwards-Compatible Aliases for Existing UI Components ──
export const mockLogin = login;
export const mockRegister = register;
export const mockVerifyOtp = (identifier: string, code: string) => verifyOtp(identifier, code, 'verify-account');
export const mockRequestPasswordReset = requestPasswordReset;
export const mockResetPassword = (identifier: string, newPassword: string, code = '123456') =>
  resetPassword(identifier, code, newPassword);
