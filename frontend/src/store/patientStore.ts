/**
 * Patient Store — Zustand store for the patient portal (Section 4.2, Pages 20–24).
 *
 * Holds patient-scoped data (current patient, family, appointments, reviews,
 * documents, support tickets, notification preferences) plus the two additional
 * hospitals for multi-hospital behaviour.
 *
 * File blobs are stored in a separate in-memory Map (documentBlobs), never in
 * the Zustand snapshot or cross-tab sync payloads — they are not serializable.
 */

import { create } from 'zustand';
import type {
  Hospital,
  Department,
  Doctor,
  FamilyMember,
  Appointment,
  Review,
  MedicalDocument,
  SupportTicket,
  PatientUser,
  NotificationPreferences,
} from '@/types';
import { patientPortalApi, bookingApi, discoveryApi, adminPortalApi } from '@/services/api';
import { useAuthStore } from './authStore';


// ==========================================
// Default notification preferences
// ==========================================

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  channels: {
    booking_confirmed: { in_app: true, email: true, sms: true },
    reminder: { in_app: true, email: true, sms: false },
    doctor_delayed: { in_app: true, email: false, sms: false },
    queue_update: { in_app: true, email: false, sms: false },
    you_are_next: { in_app: true, email: false, sms: true },
    cancelled: { in_app: true, email: true, sms: true },
    rescheduled: { in_app: true, email: true, sms: false },
    system: { in_app: true, email: false, sms: false },
  },
  reminder_24h: true,
  reminder_1h: true,
};

// ==========================================
// Seed: 2 additional hospitals
// ==========================================

export const PATIENT_HOSPITALS: Hospital[] = [
  {
    id: 'hosp_sunrise_02',
    name: 'Sunrise Medical Centre',
    city: 'Chennai',
    address: '118 Rajiv Gandhi Salai, Sholinganallur',
    phone: '+91 44 2812 5000',
    email: 'info@sunrisemedical.example.com',
    location: { type: 'Point', coordinates: [80.2279, 12.9010] },
    timings: 'Mon–Sat 07:00–21:00',
    facilities: ['Multi-Specialty OPD', 'X-Ray & Ultrasound', 'Pharmacy', 'Parking'],
    rating_avg: 4.3,
    rating_count: 820,
    status: 'active',
    settings: {
      grace_period_minutes: 15,
      cancel_window_hours: 4,
      slot_hold_minutes: 5,
      walk_ins_enabled: true,
    },
    created_at: '2025-03-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'hosp_apollo_03',
    name: 'Apollo Specialty Hospital',
    city: 'Madurai',
    address: '7 KK Nagar Main Road, Madurai',
    phone: '+91 452 2530 100',
    email: 'reception@apollospecialty.example.com',
    location: { type: 'Point', coordinates: [78.1198, 9.9252] },
    timings: '24x7',
    facilities: ['Emergency & Trauma', 'ICU', 'MRI & CT', 'Blood Bank', 'Ambulance 24x7', 'Cafeteria'],
    rating_avg: 4.7,
    rating_count: 2150,
    status: 'active',
    settings: {
      grace_period_minutes: 10,
      cancel_window_hours: 3,
      slot_hold_minutes: 5,
      walk_ins_enabled: true,
    },
    created_at: '2024-06-01T00:00:00.000Z',
    updated_at: '2026-09-15T00:00:00.000Z',
  },
];

export const PATIENT_DEPARTMENTS: Department[] = [
  // Sunrise Medical Centre
  { id: 'dept_sun_genm', hospital_id: 'hosp_sunrise_02', name: 'General Medicine', room: 'Room G1–G3', token_prefix: 'GENM', is_active: true },
  { id: 'dept_sun_pedi', hospital_id: 'hosp_sunrise_02', name: 'Pediatrics', room: 'Room P1–P2', token_prefix: 'PEDI', is_active: true },
  { id: 'dept_sun_gyno', hospital_id: 'hosp_sunrise_02', name: 'Gynaecology', room: 'Room GY1', token_prefix: 'GYNO', is_active: true },
  // Apollo Specialty Hospital
  { id: 'dept_apo_card', hospital_id: 'hosp_apollo_03', name: 'Cardiology', room: 'Room 201–203', token_prefix: 'CARD', is_active: true },
  { id: 'dept_apo_orth', hospital_id: 'hosp_apollo_03', name: 'Orthopedics', room: 'Room 301–302', token_prefix: 'ORTH', is_active: true },
];

export const PATIENT_DOCTORS: Doctor[] = [
  // Sunrise Medical Centre
  {
    id: 'doc_sun_genm_1', hospital_id: 'hosp_sunrise_02', department_id: 'dept_sun_genm',
    name: 'Dr. Lalitha Subramanian', specialty: 'Senior General Physician',
    qualifications: ['MBBS', 'MD (Internal Medicine)'], experience_years: 20, fee: 400,
    languages: ['English', 'Tamil'], gender: 'female',
    bio: 'Geriatric medicine and diabetes management with over 20 years of practice.',
    avg_consult_minutes: 10, rating_avg: 4.5, rating_count: 390, is_active: true, room: 'Room G1',
    created_at: '2025-03-10T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'doc_sun_pedi_1', hospital_id: 'hosp_sunrise_02', department_id: 'dept_sun_pedi',
    name: 'Dr. Rajan Pillai', specialty: 'Consultant Pediatrician',
    qualifications: ['MBBS', 'DCH'], experience_years: 12, fee: 500,
    languages: ['English', 'Tamil', 'Malayalam'], gender: 'male',
    bio: 'Child health, immunization, and adolescent counselling.',
    avg_consult_minutes: 12, rating_avg: 4.6, rating_count: 280, is_active: true, room: 'Room P1',
    created_at: '2025-04-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'doc_sun_gyno_1', hospital_id: 'hosp_sunrise_02', department_id: 'dept_sun_gyno',
    name: 'Dr. Priya Venkatesh', specialty: 'Consultant Gynaecologist',
    qualifications: ['MBBS', 'MS (OBG)', 'DNB'], experience_years: 14, fee: 600,
    languages: ['English', 'Tamil', 'Hindi'], gender: 'female',
    bio: 'Obstetric care, PCOS management, and minimally invasive gynaecological surgery.',
    avg_consult_minutes: 15, rating_avg: 4.8, rating_count: 520, is_active: true, room: 'Room GY1',
    created_at: '2025-04-15T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
  },
  // Apollo Specialty Hospital
  {
    id: 'doc_apo_card_1', hospital_id: 'hosp_apollo_03', department_id: 'dept_apo_card',
    name: 'Dr. Senthil Murugan', specialty: 'Senior Interventional Cardiologist',
    qualifications: ['MBBS', 'MD', 'DM (Cardiology)'], experience_years: 22, fee: 900,
    languages: ['English', 'Tamil'], gender: 'male',
    bio: 'Heart failure management, angioplasty, and electrophysiology.',
    avg_consult_minutes: 14, rating_avg: 4.9, rating_count: 680, is_active: true, room: 'Room 201',
    created_at: '2024-07-01T00:00:00.000Z', updated_at: '2026-09-15T00:00:00.000Z',
  },
  {
    id: 'doc_apo_card_2', hospital_id: 'hosp_apollo_03', department_id: 'dept_apo_card',
    name: 'Dr. Nandini Iyer', specialty: 'Consultant Cardiologist',
    qualifications: ['MBBS', 'DNB (Cardiology)'], experience_years: 9, fee: 700,
    languages: ['English', 'Tamil', 'Kannada'], gender: 'female',
    bio: 'Preventive cardiology, echocardiography, and women\'s heart health.',
    avg_consult_minutes: 12, rating_avg: 4.7, rating_count: 310, is_active: true, room: 'Room 202',
    created_at: '2024-08-01T00:00:00.000Z', updated_at: '2026-09-15T00:00:00.000Z',
  },
  {
    id: 'doc_apo_orth_1', hospital_id: 'hosp_apollo_03', department_id: 'dept_apo_orth',
    name: 'Dr. Karthik Raman', specialty: 'Senior Orthopedic Surgeon',
    qualifications: ['MBBS', 'MS (Orthopedics)', 'Fellowship in Joint Replacement'], experience_years: 18, fee: 800,
    languages: ['English', 'Tamil', 'Hindi'], gender: 'male',
    bio: 'Total knee and hip replacement, sports medicine, and spinal surgery.',
    avg_consult_minutes: 15, rating_avg: 4.8, rating_count: 450, is_active: true, room: 'Room 301',
    created_at: '2024-09-01T00:00:00.000Z', updated_at: '2026-09-15T00:00:00.000Z',
  },
  {
    id: 'doc_apo_orth_2', hospital_id: 'hosp_apollo_03', department_id: 'dept_apo_orth',
    name: 'Dr. Deepa Chandran', specialty: 'Consultant Orthopedic Surgeon',
    qualifications: ['MBBS', 'D.Ortho', 'DNB'], experience_years: 7, fee: 600,
    languages: ['English', 'Tamil'], gender: 'female',
    bio: 'Fracture management, pediatric orthopedics, and arthroscopy.',
    avg_consult_minutes: 11, rating_avg: 4.5, rating_count: 190, is_active: true, room: 'Room 302',
    created_at: '2025-01-01T00:00:00.000Z', updated_at: '2026-09-15T00:00:00.000Z',
  },
];

// ==========================================
// Seed: Current patient — Arun Kumar
// ==========================================

const PATIENT_ID = 'pat_arun_01';

export const INITIAL_PATIENT: PatientUser = {
  id: PATIENT_ID,
  name: 'Arun Kumar',
  phone: '+91 98765 43210',
  email: 'arun.kumar@example.com',
  role: 'patient',
  preferred_language: 'en',
  is_verified: true,
  is_active: true,
  created_at: '2026-01-15T04:30:00.000Z',
  updated_at: '2026-09-18T10:00:00.000Z',
  age: 34,
  gender: 'male',
  email_verified: true,
  notification_preferences: DEFAULT_NOTIFICATION_PREFS,
};

// ==========================================
// Seed: Family members (3)
// ==========================================

export const INITIAL_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'fm_priya_01',
    user_id: PATIENT_ID,
    name: 'Priya Kumar',
    age: 31,
    gender: 'female',
    relation: 'spouse',
    created_at: '2026-02-10T05:00:00.000Z',
  },
  {
    id: 'fm_kamala_02',
    user_id: PATIENT_ID,
    name: 'Kamala Devi',
    age: 62,
    gender: 'female',
    relation: 'mother',
    created_at: '2026-03-05T06:00:00.000Z',
  },
  {
    id: 'fm_arjun_03',
    user_id: PATIENT_ID,
    name: 'Arjun Kumar',
    age: 9,
    gender: 'male',
    relation: 'son',
    created_at: '2026-04-12T07:00:00.000Z',
  },
];

// ==========================================
// Helper to generate dates relative to today
// ==========================================

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

// ==========================================
// Seed: Appointments (14 past + 2 upcoming = 16)
// ==========================================

export const INITIAL_PATIENT_APPOINTMENTS: Appointment[] = [
  // — Past completed at City Hospital —
  {
    id: 'papt_01', booking_code: 'APT-PK1A2', patient_id: PATIENT_ID,
    patient: { name: 'Arun Kumar', age: 34, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_city_01', department_id: 'dept_card', doctor_id: 'doc_card_2',
    hospital_name: 'City Hospital', doctor_name: 'Dr. Meena Raj', department_name: 'Cardiology',
    scheduled_start: daysAgo(90), scheduled_end: daysAgo(90),
    type: 'booked', reason: 'Routine heart check-up', fee: 700, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(95) },
      { status: 'checked_in', at: daysAgo(90) },
      { status: 'in_queue', at: daysAgo(90) },
      { status: 'completed', at: daysAgo(90) },
    ],
    created_via: 'web', created_at: daysAgo(95), updated_at: daysAgo(90),
  },
  {
    id: 'papt_02', booking_code: 'APT-PK2B3', patient_id: PATIENT_ID,
    patient: { name: 'Arun Kumar', age: 34, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_city_01', department_id: 'dept_genm', doctor_id: 'doc_genm_1',
    hospital_name: 'City Hospital', doctor_name: 'Dr. Rajesh Deshmukh', department_name: 'General Medicine',
    scheduled_start: daysAgo(75), scheduled_end: daysAgo(75),
    type: 'booked', reason: 'Persistent cough and mild fever', fee: 500, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(78) },
      { status: 'checked_in', at: daysAgo(75) },
      { status: 'completed', at: daysAgo(75) },
    ],
    created_via: 'web', created_at: daysAgo(78), updated_at: daysAgo(75),
  },
  {
    id: 'papt_03', booking_code: 'APT-PK3C4', patient_id: PATIENT_ID,
    family_member_id: 'fm_arjun_03',
    patient: { name: 'Arjun Kumar', age: 9, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_city_01', department_id: 'dept_pedi', doctor_id: 'doc_pedi_1',
    hospital_name: 'City Hospital', doctor_name: 'Dr. Meera Nambiar', department_name: 'Pediatrics',
    scheduled_start: daysAgo(60), scheduled_end: daysAgo(60),
    type: 'booked', reason: 'Annual vaccination', fee: 650, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(65) },
      { status: 'checked_in', at: daysAgo(60) },
      { status: 'completed', at: daysAgo(60) },
    ],
    created_via: 'web', created_at: daysAgo(65), updated_at: daysAgo(60),
  },
  // — Past completed at Sunrise Medical Centre —
  {
    id: 'papt_04', booking_code: 'APT-PK4D5', patient_id: PATIENT_ID,
    patient: { name: 'Arun Kumar', age: 34, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_sunrise_02', department_id: 'dept_sun_genm', doctor_id: 'doc_sun_genm_1',
    hospital_name: 'Sunrise Medical Centre', doctor_name: 'Dr. Lalitha Subramanian', department_name: 'General Medicine',
    scheduled_start: daysAgo(50), scheduled_end: daysAgo(50),
    type: 'booked', reason: 'Diabetes review and HbA1c follow-up', fee: 400, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(55) },
      { status: 'checked_in', at: daysAgo(50) },
      { status: 'completed', at: daysAgo(50) },
    ],
    created_via: 'web', created_at: daysAgo(55), updated_at: daysAgo(50),
  },
  {
    id: 'papt_05', booking_code: 'APT-PK5E6', patient_id: PATIENT_ID,
    family_member_id: 'fm_kamala_02',
    patient: { name: 'Kamala Devi', age: 62, gender: 'female', phone: '+91 98765 43210' },
    hospital_id: 'hosp_sunrise_02', department_id: 'dept_sun_genm', doctor_id: 'doc_sun_genm_1',
    hospital_name: 'Sunrise Medical Centre', doctor_name: 'Dr. Lalitha Subramanian', department_name: 'General Medicine',
    scheduled_start: daysAgo(45), scheduled_end: daysAgo(45),
    type: 'booked', reason: 'Blood pressure monitoring and joint pain', fee: 400, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(48) },
      { status: 'checked_in', at: daysAgo(45) },
      { status: 'completed', at: daysAgo(45) },
    ],
    created_via: 'web', created_at: daysAgo(48), updated_at: daysAgo(45),
  },
  {
    id: 'papt_06', booking_code: 'APT-PK6F7', patient_id: PATIENT_ID,
    family_member_id: 'fm_arjun_03',
    patient: { name: 'Arjun Kumar', age: 9, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_sunrise_02', department_id: 'dept_sun_pedi', doctor_id: 'doc_sun_pedi_1',
    hospital_name: 'Sunrise Medical Centre', doctor_name: 'Dr. Rajan Pillai', department_name: 'Pediatrics',
    scheduled_start: daysAgo(35), scheduled_end: daysAgo(35),
    type: 'booked', reason: 'Recurring cold and ear pain', fee: 500, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(38) },
      { status: 'checked_in', at: daysAgo(35) },
      { status: 'completed', at: daysAgo(35) },
    ],
    created_via: 'web', created_at: daysAgo(38), updated_at: daysAgo(35),
  },
  // — Past completed at Apollo Specialty Hospital —
  {
    id: 'papt_07', booking_code: 'APT-PK7G8', patient_id: PATIENT_ID,
    patient: { name: 'Arun Kumar', age: 34, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_apollo_03', department_id: 'dept_apo_card', doctor_id: 'doc_apo_card_1',
    hospital_name: 'Apollo Specialty Hospital', doctor_name: 'Dr. Senthil Murugan', department_name: 'Cardiology',
    scheduled_start: daysAgo(30), scheduled_end: daysAgo(30),
    type: 'booked', reason: 'Chest discomfort evaluation', fee: 900, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(33) },
      { status: 'checked_in', at: daysAgo(30) },
      { status: 'completed', at: daysAgo(30) },
    ],
    created_via: 'web', created_at: daysAgo(33), updated_at: daysAgo(30),
    // FRONTEND-ONLY: follow-up suggestion
  },
  {
    id: 'papt_08', booking_code: 'APT-PK8H9', patient_id: PATIENT_ID,
    family_member_id: 'fm_priya_01',
    patient: { name: 'Priya Kumar', age: 31, gender: 'female', phone: '+91 98765 43210' },
    hospital_id: 'hosp_apollo_03', department_id: 'dept_apo_card', doctor_id: 'doc_apo_card_2',
    hospital_name: 'Apollo Specialty Hospital', doctor_name: 'Dr. Nandini Iyer', department_name: 'Cardiology',
    scheduled_start: daysAgo(25), scheduled_end: daysAgo(25),
    type: 'booked', reason: 'Routine ECG and cardiac screening', fee: 700, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(28) },
      { status: 'checked_in', at: daysAgo(25) },
      { status: 'completed', at: daysAgo(25) },
    ],
    created_via: 'web', created_at: daysAgo(28), updated_at: daysAgo(25),
  },
  {
    id: 'papt_09', booking_code: 'APT-PK9I0', patient_id: PATIENT_ID,
    family_member_id: 'fm_kamala_02',
    patient: { name: 'Kamala Devi', age: 62, gender: 'female', phone: '+91 98765 43210' },
    hospital_id: 'hosp_apollo_03', department_id: 'dept_apo_orth', doctor_id: 'doc_apo_orth_1',
    hospital_name: 'Apollo Specialty Hospital', doctor_name: 'Dr. Karthik Raman', department_name: 'Orthopedics',
    scheduled_start: daysAgo(20), scheduled_end: daysAgo(20),
    type: 'booked', reason: 'Knee pain evaluation for possible replacement', fee: 800, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(23) },
      { status: 'checked_in', at: daysAgo(20) },
      { status: 'completed', at: daysAgo(20) },
    ],
    created_via: 'web', created_at: daysAgo(23), updated_at: daysAgo(20),
  },
  // — More past at City Hospital —
  {
    id: 'papt_10', booking_code: 'APT-PKA01', patient_id: PATIENT_ID,
    patient: { name: 'Arun Kumar', age: 34, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_city_01', department_id: 'dept_derm', doctor_id: 'doc_derm_1',
    hospital_name: 'City Hospital', doctor_name: 'Dr. Sunita Varma', department_name: 'Dermatology',
    scheduled_start: daysAgo(15), scheduled_end: daysAgo(15),
    type: 'booked', reason: 'Persistent rash on forearm', fee: 700, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(18) },
      { status: 'checked_in', at: daysAgo(15) },
      { status: 'completed', at: daysAgo(15) },
    ],
    created_via: 'web', created_at: daysAgo(18), updated_at: daysAgo(15),
  },
  {
    id: 'papt_11', booking_code: 'APT-PKB02', patient_id: PATIENT_ID,
    patient: { name: 'Arun Kumar', age: 34, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_city_01', department_id: 'dept_card', doctor_id: 'doc_card_2',
    hospital_name: 'City Hospital', doctor_name: 'Dr. Meena Raj', department_name: 'Cardiology',
    scheduled_start: daysAgo(5), scheduled_end: daysAgo(5),
    type: 'booked', reason: 'Chest discomfort follow-up', fee: 700, status: 'completed',
    status_history: [
      { status: 'booked', at: daysAgo(8) },
      { status: 'checked_in', at: daysAgo(5) },
      { status: 'completed', at: daysAgo(5) },
    ],
    created_via: 'web', created_at: daysAgo(8), updated_at: daysAgo(5),
  },
  // — Cancelled —
  {
    id: 'papt_12', booking_code: 'APT-PKC03', patient_id: PATIENT_ID,
    patient: { name: 'Arun Kumar', age: 34, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_sunrise_02', department_id: 'dept_sun_genm', doctor_id: 'doc_sun_genm_1',
    hospital_name: 'Sunrise Medical Centre', doctor_name: 'Dr. Lalitha Subramanian', department_name: 'General Medicine',
    scheduled_start: daysAgo(40), scheduled_end: daysAgo(40),
    type: 'booked', reason: 'General check-up', fee: 400, status: 'cancelled',
    cancelled_reason: 'Schedule conflict with work',
    status_history: [
      { status: 'booked', at: daysAgo(43) },
      { status: 'cancelled', at: daysAgo(41) },
    ],
    created_via: 'web', created_at: daysAgo(43), updated_at: daysAgo(41),
  },
  // — No-show —
  {
    id: 'papt_13', booking_code: 'APT-PKD04', patient_id: PATIENT_ID,
    patient: { name: 'Arun Kumar', age: 34, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_city_01', department_id: 'dept_ent', doctor_id: 'doc_ent_1',
    hospital_name: 'City Hospital', doctor_name: 'Dr. Harish Namboodiri', department_name: 'ENT',
    scheduled_start: daysAgo(55), scheduled_end: daysAgo(55),
    type: 'booked', reason: 'Ear pain and mild hearing difficulty', fee: 750, status: 'no_show',
    status_history: [
      { status: 'booked', at: daysAgo(58) },
      { status: 'no_show', at: daysAgo(55) },
    ],
    created_via: 'web', created_at: daysAgo(58), updated_at: daysAgo(55),
  },
  // — Cancelled (for family member) —
  {
    id: 'papt_14', booking_code: 'APT-PKE05', patient_id: PATIENT_ID,
    family_member_id: 'fm_priya_01',
    patient: { name: 'Priya Kumar', age: 31, gender: 'female', phone: '+91 98765 43210' },
    hospital_id: 'hosp_sunrise_02', department_id: 'dept_sun_gyno', doctor_id: 'doc_sun_gyno_1',
    hospital_name: 'Sunrise Medical Centre', doctor_name: 'Dr. Priya Venkatesh', department_name: 'Gynaecology',
    scheduled_start: daysAgo(10), scheduled_end: daysAgo(10),
    type: 'booked', reason: 'Routine gynaecological check-up', fee: 600, status: 'cancelled',
    cancelled_reason: 'Rescheduled to next week',
    status_history: [
      { status: 'booked', at: daysAgo(14) },
      { status: 'cancelled', at: daysAgo(11) },
    ],
    created_via: 'web', created_at: daysAgo(14), updated_at: daysAgo(11),
  },
  // — Upcoming (2) —
  {
    id: 'papt_15', booking_code: 'APT-PKF06', patient_id: PATIENT_ID,
    patient: { name: 'Arun Kumar', age: 34, gender: 'male', phone: '+91 98765 43210' },
    hospital_id: 'hosp_apollo_03', department_id: 'dept_apo_card', doctor_id: 'doc_apo_card_1',
    hospital_name: 'Apollo Specialty Hospital', doctor_name: 'Dr. Senthil Murugan', department_name: 'Cardiology',
    scheduled_start: daysFromNow(5), scheduled_end: daysFromNow(5),
    type: 'booked', reason: 'Follow-up: stress test results', fee: 900, status: 'booked',
    status_history: [
      { status: 'booked', at: daysAgo(2) },
    ],
    created_via: 'web', created_at: daysAgo(2), updated_at: daysAgo(2),
  },
  {
    id: 'papt_16', booking_code: 'APT-PKG07', patient_id: PATIENT_ID,
    family_member_id: 'fm_kamala_02',
    patient: { name: 'Kamala Devi', age: 62, gender: 'female', phone: '+91 98765 43210' },
    hospital_id: 'hosp_city_01', department_id: 'dept_orth', doctor_id: 'doc_orth_1',
    hospital_name: 'City Hospital', doctor_name: 'Dr. Vikramaditya Seth', department_name: 'Orthopedics',
    scheduled_start: daysFromNow(12), scheduled_end: daysFromNow(12),
    type: 'booked', reason: 'Knee replacement pre-operative assessment', fee: 750, status: 'booked',
    status_history: [
      { status: 'booked', at: daysAgo(1) },
    ],
    created_via: 'web', created_at: daysAgo(1), updated_at: daysAgo(1),
  },
];

// ==========================================
// Seed: Reviews (3 existing)
// ==========================================

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev_01', appointment_id: 'papt_01', patient_id: PATIENT_ID,
    doctor_id: 'doc_card_2', hospital_id: 'hosp_city_01',
    doctor_rating: 5, hospital_rating: 4,
    comment: 'Dr. Meena Raj was very thorough and explained everything clearly. Short wait time.',
    tags: ['Listened well', 'Clear explanation', 'On time'],
    wait_as_expected: 'shorter',
    created_at: daysAgo(89), updated_at: daysAgo(89),
  },
  {
    id: 'rev_02', appointment_id: 'papt_04', patient_id: PATIENT_ID,
    doctor_id: 'doc_sun_genm_1', hospital_id: 'hosp_sunrise_02',
    doctor_rating: 4, hospital_rating: 4,
    comment: 'Good consultation. The facility was clean and staff were helpful.',
    tags: ['Kind and patient', 'Clean facilities', 'Friendly staff'],
    wait_as_expected: 'as_expected',
    created_at: daysAgo(49), updated_at: daysAgo(49),
  },
  {
    id: 'rev_03', appointment_id: 'papt_07', patient_id: PATIENT_ID,
    doctor_id: 'doc_apo_card_1', hospital_id: 'hosp_apollo_03',
    doctor_rating: 5, hospital_rating: 5,
    comment: 'Excellent cardiologist. Very professional team and modern facilities.',
    tags: ['Listened well', 'Clear explanation', 'Clean facilities', 'Easy to find'],
    wait_as_expected: 'as_expected',
    created_at: daysAgo(29), updated_at: daysAgo(29),
  },
];

// ==========================================
// Seed: Medical documents (5)
// ==========================================

export const INITIAL_DOCUMENTS: MedicalDocument[] = [
  {
    id: 'doc_file_01', patient_id: PATIENT_ID, appointment_id: 'papt_01',
    name: 'ECG Report - Sep 2026', category: 'lab_report', mime: 'application/pdf',
    size_bytes: 245_000, uploaded_at: daysAgo(89),
  },
  {
    id: 'doc_file_02', patient_id: PATIENT_ID, appointment_id: 'papt_02',
    name: 'Blood Test Results', category: 'lab_report', mime: 'application/pdf',
    size_bytes: 180_000, uploaded_at: daysAgo(74),
  },
  {
    id: 'doc_file_03', patient_id: PATIENT_ID, appointment_id: 'papt_07',
    name: 'Cardiac Stress Test Report', category: 'lab_report', mime: 'application/pdf',
    size_bytes: 520_000, uploaded_at: daysAgo(29),
  },
  {
    id: 'doc_file_04', patient_id: PATIENT_ID, family_member_id: 'fm_kamala_02',
    appointment_id: 'papt_09',
    name: 'Knee X-Ray - Left', category: 'imaging', mime: 'image/jpeg',
    size_bytes: 1_200_000, uploaded_at: daysAgo(19),
  },
  {
    id: 'doc_file_05', patient_id: PATIENT_ID, appointment_id: 'papt_10',
    name: 'Dermatology Prescription', category: 'prescription', mime: 'application/pdf',
    size_bytes: 95_000, uploaded_at: daysAgo(14),
  },
];

// ==========================================
// Seed: Support tickets (2)
// ==========================================

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tck_01', reference: 'TCK-4F7K2', patient_id: PATIENT_ID,
    category: 'booking_problem',
    appointment_id: 'papt_12', hospital_id: 'hosp_sunrise_02',
    description: 'I cancelled my appointment but the cancellation did not reflect for over an hour. Had to call the hospital directly.',
    contact_preference: 'in_app',
    status: 'resolved',
    created_at: daysAgo(39),
  },
  {
    id: 'tck_02', reference: 'TCK-8M2N5', patient_id: PATIENT_ID,
    category: 'queue_or_waiting',
    hospital_id: 'hosp_city_01',
    description: 'The estimated waiting time showed 15 minutes but I waited for over 40 minutes. The queue tracker did not update.',
    contact_preference: 'email',
    status: 'in_review',
    created_at: daysAgo(4),
  },
];

// ==========================================
// Follow-up data (frontend-only)
// ==========================================
// papt_07 has a follow-up suggestion (from Dr. Senthil Murugan at Apollo)
export const FOLLOW_UP_SUGGESTIONS: Record<string, { follow_up: string; follow_up_date?: string }> = {
  papt_07: { follow_up: '2_weeks' },
};

// ==========================================
// Document blob map (in-memory only, never serialized)
// ==========================================

export const documentBlobs = new Map<string, Blob>();

// ==========================================
// Patient Store
// ==========================================

interface PatientState {
  patient: PatientUser;
  familyMembers: FamilyMember[];
  appointments: Appointment[];
  reviews: Review[];
  documents: MedicalDocument[];
  tickets: SupportTicket[];
  hospitals: Hospital[];
  departments: Department[];
  doctors: Doctor[];
  followUpSuggestions: Record<string, { follow_up: string; follow_up_date?: string }>;

  // Patient profile actions
  updateProfile: (updates: Partial<PatientUser>) => void;
  setPatientPassword: (newPasswordHash: string) => void;
  requestDeletion: () => void;
  cancelDeletion: () => void;
  updateNotificationPreferences: (prefs: NotificationPreferences) => void;

  // Family actions
  addFamilyMember: (member: Omit<FamilyMember, 'id' | 'user_id' | 'created_at'>) => FamilyMember | null;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => boolean;
  removeFamilyMember: (id: string) => boolean;

  // Review actions
  submitReview: (review: Omit<Review, 'id' | 'created_at' | 'updated_at'>) => Review;
  updateReview: (id: string, updates: Partial<Review>) => boolean;

  // Document actions
  addDocument: (doc: Omit<MedicalDocument, 'id' | 'uploaded_at'>, blob?: Blob) => MedicalDocument;
  renameDocument: (id: string, name: string) => boolean;
  deleteDocument: (id: string) => boolean;

  // Ticket actions
  submitTicket: (ticket: Omit<SupportTicket, 'id' | 'reference' | 'created_at' | 'status'>) => SupportTicket;

  // Helpers
  getHospitalById: (id: string) => Hospital | undefined;
  getDoctorById: (id: string) => Doctor | undefined;
  getDepartmentById: (id: string) => Department | undefined;
  getReviewByAppointmentId: (appointmentId: string) => Review | undefined;
  getTotalDocumentBytes: () => number;
  isLoadingBackend: boolean;
  fetchPatientData: () => Promise<void>;
  syncWithAuthUser: (authUser: Partial<PatientUser> | null) => void;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function generateReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'TCK-';
  for (let i = 0; i < 5; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length));
  return ref;
}

function getInitialPatient(): PatientUser {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('chroniq_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && (u.name || u.email || u.phone || u.id || u._id)) {
          const cleanName = u.name || (u.email ? u.email.split('@')[0] : (u.phone || 'Patient'));
          return {
            ...INITIAL_PATIENT,
            id: u.id || u._id || PATIENT_ID,
            name: cleanName,
            phone: u.phone !== undefined && u.phone !== null ? u.phone : '',
            email: u.email !== undefined && u.email !== null ? u.email : '',
            role: u.role || 'patient',
            preferred_language: u.preferred_language || 'en',
            is_verified: Boolean(u.is_verified),
            is_active: u.is_active ?? true,
            created_at: u.created_at || new Date().toISOString(),
            updated_at: u.updated_at || new Date().toISOString(),
            age: u.age !== undefined ? u.age : undefined,
            gender: u.gender !== undefined ? u.gender : undefined,
            photo_url: u.photo_url || undefined,
            email_verified: Boolean(u.email_verified),
            notification_preferences: u.notification_preferences || DEFAULT_NOTIFICATION_PREFS,
          };
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse persisted user for patient store', e);
  }
  return INITIAL_PATIENT;
}


function hasPersistedUser(): boolean {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return Boolean(localStorage.getItem('chroniq_user'));
    }
  } catch {}
  return false;
}

export const usePatientStore = create<PatientState>((set, get) => {
  const isAuth = hasPersistedUser();
  return {
    patient: getInitialPatient(),
    familyMembers: isAuth ? [] : [...INITIAL_FAMILY_MEMBERS],
    appointments: isAuth ? [] : [...INITIAL_PATIENT_APPOINTMENTS],
    reviews: isAuth ? [] : [...INITIAL_REVIEWS],
    documents: isAuth ? [] : [...INITIAL_DOCUMENTS],
    tickets: isAuth ? [] : [...INITIAL_TICKETS],
    hospitals: [...PATIENT_HOSPITALS],
    departments: [...PATIENT_DEPARTMENTS],
    doctors: [...PATIENT_DOCTORS],
    followUpSuggestions: isAuth ? {} : { ...FOLLOW_UP_SUGGESTIONS },
    isLoadingBackend: false,

    syncWithAuthUser: (authUser) => {
      if (!authUser) {
        set({
          patient: INITIAL_PATIENT,
          familyMembers: [...INITIAL_FAMILY_MEMBERS],
          appointments: [...INITIAL_PATIENT_APPOINTMENTS],
          reviews: [...INITIAL_REVIEWS],
          documents: [...INITIAL_DOCUMENTS],
          tickets: [...INITIAL_TICKETS],
          followUpSuggestions: { ...FOLLOW_UP_SUGGESTIONS },
        });
        return;
      }
      set((state) => ({
        patient: {
          ...state.patient,
          ...authUser,
          id: authUser.id || (authUser as any)._id || state.patient.id,
          name: authUser.name !== undefined ? authUser.name : state.patient.name,
          email: authUser.email !== undefined ? authUser.email : state.patient.email,
          phone: authUser.phone !== undefined ? authUser.phone : state.patient.phone,
          photo_url: authUser.photo_url !== undefined ? authUser.photo_url : state.patient.photo_url,
          age: authUser.age !== undefined ? authUser.age : undefined,
          gender: authUser.gender !== undefined ? authUser.gender : undefined,
        },
        familyMembers: [],
        appointments: [],
        reviews: [],
        documents: [],
        tickets: [],
        followUpSuggestions: {},
      }));
      get().fetchPatientData();
    },

    fetchPatientData: async () => {
      if (get().isLoadingBackend) return;
      set({ isLoadingBackend: true });
      try {
        const [profileRes, familyRes, apptsRes, docsRes, revsRes, tcksRes, hospsRes, deptsRes, docsListRes] = await Promise.allSettled([
          patientPortalApi.getProfile(),
          patientPortalApi.getFamilyMembers(),
          bookingApi.getMyAppointments(),
          patientPortalApi.getDocuments(),
          patientPortalApi.getReviews(),
          patientPortalApi.getTickets(),
          discoveryApi.getHospitals(),
          adminPortalApi.getDepartments(),
          discoveryApi.getDoctors(),
        ]);

        const updates: Partial<PatientState> = {};

        if (profileRes.status === 'fulfilled' && profileRes.value.data) {
          const pData = profileRes.value.data;
          const mergedPatient: PatientUser = {
            ...get().patient,
            ...pData,
            id: pData.id || pData._id || get().patient.id,
          };
          updates.patient = mergedPatient;

          // Keep authStore in sync so TopBar & sidebars reflect latest updates only if values differ
          try {
            const auth = useAuthStore.getState();
            if (auth.user) {
              const hasDiff =
                (pData.name !== undefined && pData.name !== auth.user.name) ||
                (pData.email !== undefined && pData.email !== auth.user.email) ||
                (pData.phone !== undefined && pData.phone !== auth.user.phone) ||
                (pData.photo_url !== undefined && pData.photo_url !== auth.user.photo_url);
              if (hasDiff) {
                auth.setAuth(
                  {
                    ...auth.user,
                    ...pData,
                    id: pData.id || pData._id || auth.user.id,
                  },
                  auth.token || ''
                );
              }
            }
          } catch {}
        }
        if (familyRes.status === 'fulfilled' && Array.isArray(familyRes.value.data)) {
          updates.familyMembers = familyRes.value.data;
        } else {
          updates.familyMembers = [];
        }
        if (apptsRes.status === 'fulfilled' && Array.isArray(apptsRes.value.data)) {
          updates.appointments = apptsRes.value.data;
        } else {
          updates.appointments = [];
        }
        if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value.data)) {
          updates.documents = docsRes.value.data;
        } else {
          updates.documents = [];
        }
        if (revsRes.status === 'fulfilled' && Array.isArray(revsRes.value.data)) {
          updates.reviews = revsRes.value.data;
        } else {
          updates.reviews = [];
        }
        if (tcksRes.status === 'fulfilled' && Array.isArray(tcksRes.value.data)) {
          updates.tickets = tcksRes.value.data;
        } else {
          updates.tickets = [];
        }
        if (hospsRes.status === 'fulfilled' && Array.isArray(hospsRes.value.data) && hospsRes.value.data.length > 0) {
          updates.hospitals = hospsRes.value.data;
        }
        if (deptsRes.status === 'fulfilled' && Array.isArray(deptsRes.value.data) && deptsRes.value.data.length > 0) {
          updates.departments = deptsRes.value.data;
        }

      if (docsListRes.status === 'fulfilled' && Array.isArray(docsListRes.value.data) && docsListRes.value.data.length > 0) {
        updates.doctors = docsListRes.value.data;
      }

      set(updates);
    } catch (err) {
      console.error('Failed to fetch patient data from backend:', err);
    } finally {
      set({ isLoadingBackend: false });
    }
  },


  // Profile
  updateProfile: (updates) => {
    set((state) => ({
      patient: { ...state.patient, ...updates, updated_at: new Date().toISOString() },
    }));
  },

  setPatientPassword: (_newPasswordHash) => {
    // Mock: just update timestamp
    set((state) => ({
      patient: { ...state.patient, updated_at: new Date().toISOString() },
    }));
  },

  requestDeletion: () => {
    set((state) => ({
      patient: {
        ...state.patient,
        deletion_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }));
  },

  cancelDeletion: () => {
    set((state) => ({
      patient: {
        ...state.patient,
        deletion_requested_at: undefined,
        updated_at: new Date().toISOString(),
      },
    }));
  },

  updateNotificationPreferences: (prefs) => {
    set((state) => ({
      patient: {
        ...state.patient,
        notification_preferences: prefs,
        updated_at: new Date().toISOString(),
      },
    }));
  },

  // Family
  addFamilyMember: (member) => {
    const state = get();
    if (state.familyMembers.filter((fm) => fm.user_id === state.patient.id).length >= 6) {
      return null; // Max 6 dependents
    }
    const newMember: FamilyMember = {
      ...member,
      id: generateId('fm'),
      user_id: state.patient.id,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ familyMembers: [...s.familyMembers, newMember] }));
    return newMember;
  },

  updateFamilyMember: (id, updates) => {
    const state = get();
    const idx = state.familyMembers.findIndex((fm) => fm.id === id && fm.user_id === state.patient.id);
    if (idx === -1) return false;
    set((s) => ({
      familyMembers: s.familyMembers.map((fm) =>
        fm.id === id ? { ...fm, ...updates } : fm
      ),
    }));
    return true;
  },

  removeFamilyMember: (id) => {
    const state = get();
    const member = state.familyMembers.find((fm) => fm.id === id && fm.user_id === state.patient.id);
    if (!member) return false;
    set((s) => ({
      familyMembers: s.familyMembers.filter((fm) => fm.id !== id),
    }));
    return true;
  },

  // Reviews
  submitReview: (review) => {
    const now = new Date().toISOString();
    const newReview: Review = {
      ...review,
      id: generateId('rev'),
      created_at: now,
      updated_at: now,
    };
    set((s) => ({ reviews: [...s.reviews, newReview] }));
    return newReview;
  },

  updateReview: (id, updates) => {
    set((s) => ({
      reviews: s.reviews.map((r) =>
        r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
      ),
    }));
    return true;
  },

  // Documents
  addDocument: (doc, blob) => {
    const newDoc: MedicalDocument = {
      ...doc,
      id: generateId('docf'),
      uploaded_at: new Date().toISOString(),
    };
    if (blob) {
      documentBlobs.set(newDoc.id, blob);
    }
    set((s) => ({ documents: [...s.documents, newDoc] }));
    return newDoc;
  },

  renameDocument: (id, name) => {
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id && d.patient_id === get().patient.id ? { ...d, name } : d
      ),
    }));
    return true;
  },

  deleteDocument: (id) => {
    documentBlobs.delete(id);
    set((s) => ({
      documents: s.documents.filter((d) => d.id !== id),
    }));
    return true;
  },

  // Tickets
  submitTicket: (ticket) => {
    const newTicket: SupportTicket = {
      ...ticket,
      id: generateId('tck'),
      reference: generateReference(),
      status: 'open',
      created_at: new Date().toISOString(),
    };
    set((s) => ({ tickets: [...s.tickets, newTicket] }));
    return newTicket;
  },

  // Helpers
  getHospitalById: (id) => {
    // Check both patient hospitals and the admin hospital store
    return get().hospitals.find((h) => h.id === id);
  },

  getDoctorById: (id) => {
    return get().doctors.find((d) => d.id === id);
  },

  getDepartmentById: (id) => {
    return get().departments.find((d) => d.id === id);
  },

  getReviewByAppointmentId: (appointmentId) => {
    return get().reviews.find((r) => r.appointment_id === appointmentId);
  },

  getTotalDocumentBytes: () => {
    return get().documents
      .filter((d) => d.patient_id === get().patient.id)
      .reduce((sum, d) => sum + d.size_bytes, 0);
  },
};
});


// Subscribe to auth state changes so patient profile is always synchronized
useAuthStore.subscribe((state, prevState) => {
  const currentId = state.user?.id || (state.user as any)?._id;
  const prevId = prevState?.user?.id || (prevState?.user as any)?._id;
  if (currentId !== prevId) {
    usePatientStore.getState().syncWithAuthUser(state.user as any);
  }
});

