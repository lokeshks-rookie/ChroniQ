import { create } from 'zustand';

export type UserRole =
  | 'patient'
  | 'receptionist'
  | 'doctor'
  | 'hospital_admin'
  | 'super_admin';

export interface AuthUser {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  hospital_id?: string;
  is_verified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
}

// TODO: Decide on token persistence strategy (localStorage vs HTTP-only cookies).
// Kept in-memory for now per design decision.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) =>
    set({ user, token, isAuthenticated: true }),

  clearAuth: () =>
    set({ user: null, token: null, isAuthenticated: false }),
}));

// ─── Mock API ─────────────────────────────────────────────────────────────────

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export async function mockLogin(identifier: string, password: string): Promise<LoginResponse> {
  // Simulate network delay
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
      is_verified: true, // change this if needed to test verification
      ...(role === 'doctor' || role === 'hospital_admin' || role === 'receptionist'
        ? { hospital_id: 'hosp-001' }
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
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // In a real app we'd validate here, but the client does basic validation
  if (!payload.name || !payload.phone) {
    throw new Error('Name and phone are required.');
  }

  // Simulate an existing user check
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
      is_verified: false, // forces the OTP flow
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
