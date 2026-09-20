import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear auth and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── API helpers ──────────────────────────────────────────────

// Auth
export const authApi = {
  login: (data: { phone: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: object) => api.post('/auth/register', data),
  verifyOtp: (data: { target: string; code: string; purpose: string }) =>
    api.post('/auth/verify-otp', data),
  forgotPassword: (data: { target: string }) =>
    api.post('/auth/forgot-password', data),
  me: () => api.get('/auth/me'),
};

// Discovery
export const discoveryApi = {
  getHospitals: (params?: object) => api.get('/hospitals', { params }),
  getHospital: (id: string) => api.get(`/hospitals/${id}`),
  getDoctors: (params?: object) => api.get('/doctors', { params }),
  getDoctor: (id: string) => api.get(`/doctors/${id}`),
  getSpecialties: () => api.get('/specialties'),
};

// Slots & Appointments
export const bookingApi = {
  getSlots: (doctorId: string, date: string) =>
    api.get(`/doctors/${doctorId}/slots`, { params: { date } }),
  holdSlot: (slotId: string) => api.post(`/slots/${slotId}/hold`),
  createAppointment: (data: object) => api.post('/appointments', data),
  getMyAppointments: () => api.get('/appointments/me'),
  getAppointment: (id: string) => api.get(`/appointments/${id}`),
  reschedule: (id: string, data: object) =>
    api.patch(`/appointments/${id}/reschedule`, data),
  cancel: (id: string) => api.delete(`/appointments/${id}`),
};

// Queue
export const queueApi = {
  getQueueStatus: (appointmentId: string) =>
    api.get(`/queue/${appointmentId}`),
  checkIn: (data: object) => api.post('/queue/check-in', data),
};

// Notifications
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
};
