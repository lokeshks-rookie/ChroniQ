import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000';

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

// On 401, clear auth and redirect to login if not already on an auth screen
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      const isAuthPath =
        path.startsWith('/login') ||
        path.startsWith('/register') ||
        path.startsWith('/verify-otp') ||
        path.startsWith('/forgot-password') ||
        path.startsWith('/reset-password');

      if (!isAuthPath) {
        useAuthStore.getState().clearAuth();
        window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
      }
    }
    return Promise.reject(err);
  }
);

export function getApiErrorMessage(err: unknown, defaultMsg = 'Operation failed'): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
    }
    if (err.response?.data?.message) return String(err.response.data.message);
    if (err.message) return err.message;
  } else if (err instanceof Error) {
    return err.message;
  }
  return defaultMsg;
}

// ── API helpers ──────────────────────────────────────────────

// Auth
export const authApi = {
  login: (data: { identifier?: string; phone?: string; email?: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: object) => api.post('/auth/register', data),
  verifyOtp: (data: { target: string; code: string; purpose: string }) =>
    api.post('/auth/verify-otp', data),
  resendOtp: (data: { target: string; purpose: string }) =>
    api.post('/auth/resend-otp', data),
  forgotPassword: (data: { target: string }) =>
    api.post('/auth/forgot-password', data),
  resetPassword: (data: { target: string; code: string; new_password: string }) =>
    api.post('/auth/reset-password', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
  me: () => api.get('/auth/me'),
};

// Discovery
export const discoveryApi = {
  getHospitals: (params?: Record<string, unknown>) => api.get('/hospitals', { params }),
  getHospital: (id: string) => api.get(`/hospitals/${id}`),
  getHospitalDepartments: (hospitalId: string) => api.get(`/hospitals/${hospitalId}/departments`),
  getHospitalDoctors: (hospitalId: string) => api.get(`/hospitals/${hospitalId}/doctors`),
  getDoctors: (params?: Record<string, unknown>) => api.get('/doctors', { params }),
  getDoctor: (id: string) => api.get(`/doctors/${id}`),
  getSpecialties: () => api.get('/specialties'),
};

// Slots & Appointments
export const bookingApi = {
  getSlots: (doctorId: string, date: string) =>
    api.get(`/doctors/${doctorId}/slots`, { params: { date } }),
  getAvailableSlots: (doctorId: string, date?: string) =>
    api.get('/slots/available', { params: { doctor_id: doctorId, date } }),
  holdSlot: (slotId: string) => api.post(`/slots/${slotId}/hold`),
  releaseSlot: (slotId: string) => api.post(`/slots/${slotId}/release`),
  createAppointment: (data: object) => api.post('/appointments', data),
  getMyAppointments: () => api.get('/appointments/me'),
  getAppointments: (params?: Record<string, unknown>) => api.get('/appointments', { params }),
  getAppointment: (id: string) => api.get(`/appointments/${id}`),
  reschedule: (id: string, data: object) =>
    api.patch(`/appointments/${id}/reschedule`, data),
  cancel: (id: string, data?: { reason?: string }) =>
    api.post(`/appointments/${id}/cancel`, data || {}),
  registerWalkIn: (data: object) => api.post('/walk-in/register', data),
};

// Queue
export const queueApi = {
  getQueueStatus: (appointmentId: string) => api.get(`/queue/${appointmentId}`),
  getDepartmentQueue: (hospitalId: string, departmentId: string, date?: string) =>
    api.get(`/queue/${hospitalId}/${departmentId}`, { params: { date } }),
  getHospitalQueue: (hospitalId: string, date?: string) =>
    api.get('/admin/queue', { params: { hospital_id: hospitalId, date } }),
  checkIn: (data: { appointment_id?: string; booking_code?: string }) =>
    api.post('/queue/check-in', data),
  callNext: (doctorId: string, room?: string) =>
    api.post('/queue/call-next', { doctor_id: doctorId, room }),
  callAgain: (doctorId: string, room?: string) =>
    api.post('/queue/call-again', { doctor_id: doctorId, room }),
  startConsultation: (doctorId: string) =>
    api.post('/queue/start', { doctor_id: doctorId }),
  completeConsultation: (doctorId: string, durationMinutes?: number) =>
    api.post('/queue/complete', { doctor_id: doctorId, duration_minutes: durationMinutes }),
  skipQueueEntry: (entryId: string, reason?: string) =>
    api.post('/queue/skip', { entry_id: entryId, reason }),
  markNoShow: (entryId: string) =>
    api.post('/queue/no-show', { entry_id: entryId }),
  setPriority: (entryId: string, priority: number) =>
    api.post(`/queue/${entryId}/priority`, { priority }),
};

// Doctor Portal
export const doctorPortalApi = {
  getProfile: (doctorId?: string) =>
    api.get('/doctor/profile', { params: doctorId ? { doctorId } : undefined }),
  getDaySummary: (doctorId?: string) =>
    api.get('/doctor/day-summary', { params: doctorId ? { doctorId } : undefined }),
  getQueue: (doctorId?: string) =>
    api.get('/doctor/queue', { params: doctorId ? { doctorId } : undefined }),
  getSchedule: (doctorId?: string) =>
    api.get('/doctor/schedule', { params: doctorId ? { doctorId } : undefined }),
  getAvailability: (doctorId?: string) =>
    api.get('/doctor/availability', { params: doctorId ? { doctorId } : undefined }),
  updateAvailability: (data: object) =>
    api.put('/doctor/availability', data),
  getNotes: (appointmentId: string) =>
    api.get(`/doctor/notes/${appointmentId}`),
  saveNotes: (data: object) =>
    api.post('/doctor/notes', data),
  createLeave: (data: object) =>
    api.post('/doctor/leaves', data),
  deleteLeave: (leaveId: string) =>
    api.delete(`/doctor/leaves/${leaveId}`),
  getStats: () => api.get('/doctor/stats'),
};

// Admin Portal
export const adminPortalApi = {
  getDashboardStats: (hospitalId?: string) =>
    api.get('/admin/dashboard/stats', { params: hospitalId ? { hospital_id: hospitalId } : undefined }),
  getDepartments: () => api.get('/admin/departments'),
  createDepartment: (data: object) => api.post('/admin/departments', data),
  updateDepartment: (id: string, data: object) => api.put(`/admin/departments/${id}`, data),
  toggleDepartmentStatus: (id: string) => api.patch(`/admin/departments/${id}/status`),
  getDoctors: () => api.get('/admin/doctors'),
  createDoctor: (data: object) => api.post('/admin/doctors', data),
  updateDoctor: (id: string, data: object) => api.put(`/admin/doctors/${id}`, data),
  toggleDoctorStatus: (id: string) => api.patch(`/admin/doctors/${id}/status`),
  getDoctorSchedule: (doctorId: string) => api.get(`/admin/schedules/${doctorId}`),
  saveDoctorSchedule: (doctorId: string, data: object) => api.put(`/admin/schedules/${doctorId}`, data),
  addDoctorLeave: (doctorId: string, data: object) => api.post(`/admin/doctors/${doctorId}/leaves`, data),
  deleteDoctorLeave: (leaveId: string) => api.delete(`/admin/doctors/leaves/${leaveId}`),
  getStaff: () => api.get('/admin/staff'),
  createStaff: (data: object) => api.post('/admin/staff', data),
  updateStaff: (id: string, data: object) => api.put(`/admin/staff/${id}`, data),
  toggleStaffStatus: (id: string) => api.patch(`/admin/staff/${id}/status`),
  getSettings: () => api.get('/admin/settings'),
  updatePolicies: (data: object) => api.patch('/admin/settings/policies', data),
  updateProfile: (data: object) => api.patch('/admin/settings/profile', data),
  getTemplates: () => api.get('/admin/templates'),
  saveTemplate: (type: string, data: object) => api.put(`/admin/settings/templates/${type}`, data),
  broadcastDelay: (data: object) => api.post('/notifications/broadcast-delay', data),
  getAuditLogs: (limit = 50) => api.get('/audit/log', { params: { limit } }),
  logAudit: (data: object) => api.post('/audit/log', data),
};

// Patient Portal
export const patientPortalApi = {
  getProfile: () => api.get('/patients/me/profile'),
  updateProfile: (data: object) => api.patch('/users/me', data),
  verifyContact: (data: object) => api.post('/users/me/verify-contact', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.patch('/users/me/password', data),
  updateNotificationPreferences: (data: object) =>
    api.put('/users/me/notification-preferences', data),
  exportMyData: () => api.post('/users/me/export'),
  requestAccountDeletion: () => api.post('/users/me/delete-request'),
  cancelAccountDeletion: () => api.delete('/users/me/delete-request'),
  getFamilyMembers: () => api.get('/patients/me/family'),
  addFamilyMember: (data: object) => api.post('/family-members', data),
  updateFamilyMember: (id: string, data: object) => api.patch(`/family-members/${id}`, data),
  removeFamilyMember: (id: string) => api.delete(`/family-members/${id}`),
  getDocuments: () => api.get('/documents'),
  uploadDocument: (data: object) => api.post('/documents', data),
  renameDocument: (id: string, name: string) => api.patch(`/documents/${id}`, { name }),
  deleteDocument: (id: string) => api.delete(`/documents/${id}`),
  getReviews: (appointmentId?: string) =>
    appointmentId ? api.get(`/reviews/by-appointment/${appointmentId}`) : api.get('/reviews'),
  submitReview: (data: object) => api.post('/reviews', data),
  updateReview: (id: string, data: object) => api.patch(`/reviews/${id}`, data),
  getTickets: () => api.get('/support/tickets'),
  submitTicket: (data: object) => api.post('/support/tickets', data),
};

// Super Admin
export const superAdminApi = {
  getHospitals: () => api.get('/super/hospitals'),
  createHospital: (data: object) => api.post('/super/hospitals', data),
  updateHospital: (id: string, data: object) => api.patch(`/super/hospitals/${id}`, data),
  getAnalyticsOverview: () => api.get('/super/analytics/overview'),
};

// Kiosk
export const kioskApi = {
  lookupPhone: (hospitalId: string, phone: string) =>
    api.get(`/kiosk/${hospitalId}/lookup-phone`, { params: { phone } }),
  lookupCode: (hospitalId: string, code: string) =>
    api.get(`/kiosk/${hospitalId}/lookup-code`, { params: { code } }),
  checkIn: (hospitalId: string, data: object) =>
    api.post(`/kiosk/${hospitalId}/check-in`, data),
};

// Notifications
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
};
