// Mirroring ChroniQ.md Section 6.4 (snake_case fields, MongoDB Atlas schema)

export type Role = 'patient' | 'receptionist' | 'doctor' | 'hospital_admin' | 'super_admin';

export type HospitalStatus = 'pending' | 'active' | 'suspended';

export type SlotStatus = 'open' | 'held' | 'booked' | 'blocked';

export type AppointmentStatus =
  | 'booked'
  | 'checked_in'
  | 'in_queue'
  | 'called'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'
  | 'expired';

export type AppointmentType = 'booked' | 'walk_in';

export type CreatedVia = 'web' | 'desk' | 'kiosk' | 'voice';

export type QueueStatus =
  | 'waiting'
  | 'called'
  | 'in_consultation'
  | 'completed'
  | 'skipped'
  | 'no_show'
  | 'cancelled';

export type Channel = 'in_app' | 'email' | 'sms';

export type NotificationType =
  | 'booking_confirmed'
  | 'reminder'
  | 'doctor_delayed'
  | 'queue_update'
  | 'you_are_next'
  | 'cancelled'
  | 'rescheduled'
  | 'system';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface HospitalSettings {
  grace_period_minutes: number; // default 10
  cancel_window_hours: number; // default 2
  slot_hold_minutes: number; // default 5
  walk_ins_enabled: boolean; // default true
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email?: string;
  location?: GeoPoint;
  timings: string;
  facilities: string[];
  rating_avg: number;
  rating_count: number;
  status: HospitalStatus;
  settings: HospitalSettings;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  hospital_id: string;
  name: string;
  room?: string;
  token_prefix: string; // e.g. "CARD"
  is_active: boolean;
}

export interface Doctor {
  id: string;
  user_id?: string;
  hospital_id: string;
  department_id: string;
  name: string;
  specialty: string;
  qualifications: string[];
  experience_years: number;
  fee: number; // INR
  languages: string[];
  gender?: 'male' | 'female' | 'other';
  bio?: string;
  photo_url?: string;
  avg_consult_minutes: number; // rolling average
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
  room?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeRange {
  start: string; // "HH:MM" (IST)
  end: string;
}

export interface WeeklyRule {
  weekday: number; // 0 = Monday ... 6 = Sunday
  start: string;
  end: string;
  breaks: TimeRange[];
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  hospital_id: string;
  slot_minutes: number;
  weekly: WeeklyRule[];
  updated_at: string;
}

export interface DoctorLeave {
  id: string;
  doctor_id: string;
  hospital_id: string;
  date_from: string; // ISO date string
  date_to: string; // ISO date string
  reason?: string;
}

export interface Slot {
  id: string;
  doctor_id: string;
  hospital_id: string;
  department_id: string;
  start: string; // ISO datetime UTC
  end: string;
  status: SlotStatus;
  held_by?: string;
  held_until?: string;
  appointment_id?: string;
}

export interface PatientSnapshot {
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  past_visits_count?: number;
  last_visit_date?: string;
}

export interface StatusEvent {
  status: AppointmentStatus;
  at: string; // ISO UTC
  by?: string;
  note?: string;
}

export interface Appointment {
  id: string;
  booking_code: string; // e.g. "APT-7K3Q9"
  patient_id: string;
  family_member_id?: string;
  patient: PatientSnapshot;
  hospital_id: string;
  department_id: string;
  doctor_id: string;
  slot_id?: string;
  hospital_name: string;
  doctor_name: string;
  department_name: string;
  scheduled_start: string; // ISO
  scheduled_end: string;
  type: AppointmentType;
  reason?: string;
  symptoms_note?: string;
  fee: number;
  status: AppointmentStatus;
  status_history: StatusEvent[];
  created_via: CreatedVia;
  rescheduled_from?: string;
  cancelled_reason?: string;
  created_at: string;
  updated_at: string;
  // Frontend flag for Section 10 open question 1
  desk_confirmed?: boolean;
  // FRONTEND-ONLY: not in ChroniQ.md 6.4 (set when a doctor leave overlaps this appointment)
  needs_reschedule?: boolean;
}

export interface QueueEntry {
  id: string;
  appointment_id: string;
  hospital_id: string;
  department_id: string;
  doctor_id: string;
  queue_date: string; // "YYYY-MM-DD" in IST
  token: string; // e.g. "CARD-014"
  token_number: number;
  priority: number; // 0 emergency, 1 priority (elderly/pregnant/critical), 2 normal
  status: QueueStatus;
  sort_time: string; // ISO date; resets on late arrival
  position?: number; // 1 = next
  eta_minutes?: number;
  call_count: number; // 2 unanswered calls -> no_show
  checked_in_at?: string;
  called_at?: string;
  started_at?: string;
  completed_at?: string;
  consult_minutes?: number;
  created_at: string;
  // Section 10 open question 2: skip count tracking
  skip_count?: number;
  is_late_arrival?: boolean;
}

export interface TokenCounter {
  id: string;
  hospital_id: string;
  department_id: string;
  date: string;
  seq: number;
  expire_at: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
  hospital_id?: string;
  preferred_language: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_active?: string;
  linked_doctor_id?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  channel: Channel;
  title: string;
  body: string;
  data: Record<string, unknown>;
  delivery_status: 'sent' | 'failed';
  sent_at: string;
  read_at?: string;
}

export interface BroadcastLog {
  id: string;
  hospital_id: string;
  type: 'delay' | 'closure' | 'custom';
  audience_type: 'doctor' | 'department' | 'all';
  target_id?: string;
  target_name?: string;
  minutes_delayed?: number;
  closure_date_start?: string;
  closure_date_end?: string;
  channels: Channel[];
  message: string;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  sent_at: string;
}

export interface NotificationTemplate {
  type: NotificationType;
  label: string;
  channels: { in_app: boolean; email: boolean; sms: boolean };
  template_text: string;
  variables: string[];
}

export interface PatientNote {
  id: string;
  patient_id: string;
  author_id: string;
  author_name: string;
  note: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  details?: string;
  timestamp: string;
}

// Capability permissions matrix for Section 35
export type Capability =
  | 'view_dashboard'
  | 'manage_appointments'
  | 'queue_control'
  | 'walk_in_registration'
  | 'check_in'
  | 'view_patients'
  | 'manage_doctors'
  | 'manage_schedules'
  | 'manage_departments'
  | 'reports_and_export'
  | 'manage_staff'
  | 'hospital_settings'
  | 'send_broadcasts';

export type PermissionsMatrix = Record<Role, Record<Capability, boolean>>;

// ==========================================
// FRONTEND-ONLY: not in ChroniQ.md 6.4
// Section 4.4 Doctor View Types
// ==========================================

export interface ConsultationNote {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  text: string;
  follow_up: 'none' | '1_week' | '2_weeks' | '1_month' | 'custom';
  follow_up_date?: string; // ISO date, only when follow_up === 'custom'
  finalized: boolean; // true after Complete
  updated_at: string;
}

export type DoctorAvailabilityStatus = 'available' | 'on_break' | 'late' | 'on_leave';

export interface DoctorAvailabilityState {
  doctor_id: string;
  status: DoctorAvailabilityStatus;
  until?: string; // ISO or HH:mm string
  delay_minutes?: number;
  reason?: string;
  changed_at: string;
}

export interface AvailabilityLogEntry {
  id: string;
  doctor_id: string;
  status: DoctorAvailabilityStatus | 'available';
  changed_at: string;
  reason?: string;
  duration_minutes?: number;
}

// ==========================================
// FRONTEND-ONLY: not in ChroniQ.md 6.4
// Section 4.6 Special Screens Types
// ==========================================

export interface CallEvent {
  id: string;
  entry_id: string;
  token: string;
  doctor_id: string;
  department_id: string;
  room: string;
  call_count: number;
  at: string; // ISO timestamp
}

// ==========================================
// FRONTEND-ONLY: not in ChroniQ.md 6.4
// Section 4.2 Patient Portal Types (Pages 20–24)
// ==========================================

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  age?: number;
  gender?: string;
  relation: 'spouse' | 'son' | 'daughter' | 'father' | 'mother' | 'brother' | 'sister' | 'grandparent' | 'other';
  created_at: string;
}

export type DocumentCategory = 'lab_report' | 'prescription' | 'imaging' | 'discharge_summary' | 'other';

export interface MedicalDocument {
  id: string;
  patient_id: string;
  family_member_id?: string;
  appointment_id?: string;
  name: string;
  category: DocumentCategory;
  mime: string;
  size_bytes: number;
  uploaded_at: string;
}

// FRONTEND-ONLY: tags, wait_as_expected, updated_at not in ChroniQ.md 6.4
export interface Review {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  doctor_rating: number; // 1-5
  hospital_rating: number; // 1-5
  comment?: string;
  tags: string[]; // FRONTEND-ONLY: not in ChroniQ.md 6.4
  wait_as_expected?: 'shorter' | 'as_expected' | 'longer'; // FRONTEND-ONLY: not in ChroniQ.md 6.4
  created_at: string;
  updated_at: string; // FRONTEND-ONLY: not in ChroniQ.md 6.4
}

export type SupportTicketStatus = 'open' | 'in_review' | 'resolved';

export type SupportCategory =
  | 'booking_problem'
  | 'queue_or_waiting'
  | 'fee_or_payment'
  | 'app_problem'
  | 'privacy_concern'
  | 'other';

export interface SupportTicket {
  id: string;
  reference: string; // e.g. "TCK-4F7K2"
  patient_id: string;
  category: SupportCategory;
  appointment_id?: string;
  hospital_id?: string;
  description: string;
  contact_preference: Channel;
  status: SupportTicketStatus;
  created_at: string;
}

// FRONTEND-ONLY: not in ChroniQ.md 6.4
export interface NotificationChannelPreference {
  in_app: boolean; // always true for most types
  email: boolean;
  sms: boolean;
}

// FRONTEND-ONLY: not in ChroniQ.md 6.4
export interface NotificationPreferences {
  channels: Record<NotificationType, NotificationChannelPreference>;
  reminder_24h: boolean;
  reminder_1h: boolean;
}

// Extended User fields for patient portal (FRONTEND-ONLY additions)
export interface PatientUser extends User {
  age?: number; // FRONTEND-ONLY: not in ChroniQ.md 6.4
  gender?: string; // FRONTEND-ONLY: not in ChroniQ.md 6.4
  photo_url?: string; // FRONTEND-ONLY: not in ChroniQ.md 6.4
  email_verified: boolean; // FRONTEND-ONLY: not in ChroniQ.md 6.4
  deletion_requested_at?: string; // FRONTEND-ONLY: not in ChroniQ.md 6.4
  notification_preferences: NotificationPreferences; // FRONTEND-ONLY: not in ChroniQ.md 6.4
}

