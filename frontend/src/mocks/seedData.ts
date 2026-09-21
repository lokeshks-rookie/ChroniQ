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
  ConsultationNote,
  DoctorAvailabilityState,
  AvailabilityLogEntry,
} from '@/types';
import { getTodayDateStringIST } from '@/lib/time';
import { recomputeDoctorQueueEtas } from '@/lib/queue';

export const INITIAL_HOSPITAL_ID = 'hosp_city_01';

export const INITIAL_HOSPITAL: Hospital = {
  id: INITIAL_HOSPITAL_ID,
  name: 'City Hospital',
  city: 'Chennai',
  address: '42 Anna Salai, Thousand Lights',
  phone: '+91 44 2829 0000',
  email: 'admin@cityhospital.example.com',
  location: {
    type: 'Point',
    coordinates: [80.2508, 13.0604],
  },
  timings: '24x7',
  facilities: ['Emergency & Trauma', 'ICU', 'Diagnostic Imaging', 'In-House Pharmacy', 'Ambulance 24x7', 'Blood Bank'],
  rating_avg: 4.6,
  rating_count: 1420,
  status: 'active',
  settings: {
    grace_period_minutes: 10,
    cancel_window_hours: 2,
    slot_hold_minutes: 5,
    walk_ins_enabled: true,
  },
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2026-09-20T00:00:00.000Z',
};

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept_card',
    hospital_id: INITIAL_HOSPITAL_ID,
    name: 'Cardiology',
    room: 'Room 101–103',
    token_prefix: 'CARD',
    is_active: true,
  },
  {
    id: 'dept_genm',
    hospital_id: INITIAL_HOSPITAL_ID,
    name: 'General Medicine',
    room: 'Room 104–106',
    token_prefix: 'GENM',
    is_active: true,
  },
  {
    id: 'dept_orth',
    hospital_id: INITIAL_HOSPITAL_ID,
    name: 'Orthopedics',
    room: 'Room 201–202',
    token_prefix: 'ORTH',
    is_active: true,
  },
  {
    id: 'dept_pedi',
    hospital_id: INITIAL_HOSPITAL_ID,
    name: 'Pediatrics',
    room: 'Room 203–204',
    token_prefix: 'PEDI',
    is_active: true,
  },
  {
    id: 'dept_derm',
    hospital_id: INITIAL_HOSPITAL_ID,
    name: 'Dermatology',
    room: 'Room 301–302',
    token_prefix: 'DERM',
    is_active: true,
  },
  {
    id: 'dept_ent',
    hospital_id: INITIAL_HOSPITAL_ID,
    name: 'ENT',
    room: 'Room 303–304',
    token_prefix: 'ENT',
    is_active: true,
  },
];

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc_card_1',
    user_id: 'user_doc_1',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_card',
    name: 'Dr. Anand Ramanathan',
    specialty: 'Senior Interventional Cardiologist',
    qualifications: ['MBBS', 'MD (Gen Med)', 'DM (Cardiology)', 'FACC'],
    experience_years: 18,
    fee: 800,
    languages: ['English', 'Tamil', 'Hindi'],
    gender: 'male',
    bio: 'Specialist in coronary angioplasty and preventive cardiology with over 18 years of clinical leadership.',
    avg_consult_minutes: 12,
    rating_avg: 4.9,
    rating_count: 512,
    is_active: true,
    room: 'Room 101',
    created_at: '2025-01-10T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_card_2',
    user_id: 'user_doc_2',
    hospital_id: INITIAL_HOSPITAL_ID,
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
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_genm_1',
    user_id: 'user_doc_3',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_genm',
    name: 'Dr. Rajesh Deshmukh',
    specialty: 'Senior Consultant Physician',
    qualifications: ['MBBS', 'MD (Internal Medicine)'],
    experience_years: 15,
    fee: 500,
    languages: ['English', 'Hindi', 'Marathi'],
    gender: 'male',
    bio: 'Comprehensive internal medicine, diabetes management, and chronic infectious illnesses.',
    avg_consult_minutes: 9,
    rating_avg: 4.7,
    rating_count: 640,
    is_active: true,
    room: 'Room 104',
    created_at: '2025-02-01T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_genm_2',
    user_id: 'user_doc_4',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_genm',
    name: 'Dr. Kavitha Menon',
    specialty: 'Consultant General Physician',
    qualifications: ['MBBS', 'DNB (Family Medicine)'],
    experience_years: 8,
    fee: 450,
    languages: ['English', 'Malayalam', 'Tamil'],
    gender: 'female',
    bio: 'Family healthcare, geriatric wellness, and lifestyle disease management.',
    avg_consult_minutes: 8,
    rating_avg: 4.8,
    rating_count: 410,
    is_active: true,
    room: 'Room 105',
    created_at: '2025-02-10T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_orth_1',
    user_id: 'user_doc_5',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_orth',
    name: 'Dr. Vikramaditya Seth',
    specialty: 'Senior Orthopedic & Joint Surgeon',
    qualifications: ['MBBS', 'MS (Orthopedics)', 'MCh'],
    experience_years: 16,
    fee: 750,
    languages: ['English', 'Hindi', 'Bengali'],
    gender: 'male',
    bio: 'Joint replacement specialist, complex trauma reconstruction, and arthroscopy.',
    avg_consult_minutes: 14,
    rating_avg: 4.9,
    rating_count: 480,
    is_active: true,
    room: 'Room 201',
    created_at: '2025-02-15T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_orth_2',
    user_id: 'user_doc_6',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_orth',
    name: 'Dr. Arun Kumar',
    specialty: 'Consultant Orthopedic Surgeon',
    qualifications: ['MBBS', 'D.Ortho', 'DNB (Orthopedics)'],
    experience_years: 9,
    fee: 600,
    languages: ['English', 'Tamil'],
    gender: 'male',
    bio: 'Sports injury specialist, spine biomechanics, and pediatric orthopedics.',
    avg_consult_minutes: 11,
    rating_avg: 4.6,
    rating_count: 275,
    is_active: true,
    room: 'Room 202',
    created_at: '2025-03-01T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_pedi_1',
    user_id: 'user_doc_7',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_pedi',
    name: 'Dr. Meera Nambiar',
    specialty: 'Chief Pediatrician & Neonatologist',
    qualifications: ['MBBS', 'MD (Pediatrics)', 'Fellowship in Neonatology'],
    experience_years: 14,
    fee: 650,
    languages: ['English', 'Malayalam', 'Tamil'],
    gender: 'female',
    bio: 'Newborn care, developmental milestones, pediatric allergy and asthma.',
    avg_consult_minutes: 13,
    rating_avg: 4.9,
    rating_count: 530,
    is_active: true,
    room: 'Room 203',
    created_at: '2025-03-05T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_pedi_2',
    user_id: 'user_doc_8',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_pedi',
    name: 'Dr. Suresh Balakrishnan',
    specialty: 'Consultant Pediatrician',
    qualifications: ['MBBS', 'DCH', 'DNB (Pediatrics)'],
    experience_years: 7,
    fee: 550,
    languages: ['English', 'Tamil'],
    gender: 'male',
    bio: 'General pediatric consultations, immunization programs, adolescent health.',
    avg_consult_minutes: 10,
    rating_avg: 4.7,
    rating_count: 290,
    is_active: true,
    room: 'Room 204',
    created_at: '2025-03-10T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_derm_1',
    user_id: 'user_doc_9',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_derm',
    name: 'Dr. Sunita Varma',
    specialty: 'Senior Consultant Dermatologist',
    qualifications: ['MBBS', 'MD (Dermatology, Venereology & Leprosy)'],
    experience_years: 12,
    fee: 700,
    languages: ['English', 'Hindi', 'Telugu'],
    gender: 'female',
    bio: 'Clinical dermatology, trichology, eczema, and psoriasis therapeutics.',
    avg_consult_minutes: 11,
    rating_avg: 4.8,
    rating_count: 380,
    is_active: true,
    room: 'Room 301',
    created_at: '2025-03-15T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_derm_2',
    user_id: 'user_doc_10',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_derm',
    name: 'Dr. Karthik Subramaniam',
    specialty: 'Consultant Dermatologist & Dermatosurgeon',
    qualifications: ['MBBS', 'DDVL', 'DNB'],
    experience_years: 6,
    fee: 550,
    languages: ['English', 'Tamil'],
    gender: 'male',
    bio: 'Acne scar treatment, mole excision, and pigmentary disorders.',
    avg_consult_minutes: 9,
    rating_avg: 4.7,
    rating_count: 210,
    is_active: true,
    room: 'Room 302',
    created_at: '2025-03-20T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_ent_1',
    user_id: 'user_doc_11',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_ent',
    name: 'Dr. Harish Namboodiri',
    specialty: 'Senior ENT & Head-Neck Consultant',
    qualifications: ['MBBS', 'MS (ENT)', 'DNB'],
    experience_years: 17,
    fee: 750,
    languages: ['English', 'Malayalam', 'Tamil'],
    gender: 'male',
    bio: 'Endoscopic sinus surgery, micro-ear surgery, vertigo and tinnitus clinic.',
    avg_consult_minutes: 12,
    rating_avg: 4.9,
    rating_count: 440,
    is_active: true,
    room: 'Room 303',
    created_at: '2025-04-01T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'doc_ent_2',
    user_id: 'user_doc_12',
    hospital_id: INITIAL_HOSPITAL_ID,
    department_id: 'dept_ent',
    name: 'Dr. Ananya Roy',
    specialty: 'Consultant ENT Surgeon',
    qualifications: ['MBBS', 'DLO', 'DNB (Otorhinolaryngology)'],
    experience_years: 8,
    fee: 600,
    languages: ['English', 'Bengali', 'Hindi'],
    gender: 'female',
    bio: 'Pediatric ENT, tonsillectomy, allergy treatment, and snoring evaluations.',
    avg_consult_minutes: 10,
    rating_avg: 4.7,
    rating_count: 260,
    is_active: true,
    room: 'Room 304',
    created_at: '2025-04-05T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
];

// Schedules for each doctor (Mon-Sat 09:00 - 17:00, lunch 13:00 - 14:00)
export const INITIAL_SCHEDULES: DoctorSchedule[] = INITIAL_DOCTORS.map((doc) => ({
  id: `sched_${doc.id}`,
  doctor_id: doc.id,
  hospital_id: INITIAL_HOSPITAL_ID,
  slot_minutes: 15,
  weekly: [
    { weekday: 0, start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
    { weekday: 1, start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
    { weekday: 2, start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
    { weekday: 3, start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
    { weekday: 4, start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
    { weekday: 5, start: '09:00', end: '13:00', breaks: [] },
  ],
  updated_at: '2026-09-01T00:00:00.000Z',
}));

// Leaves for sample doctors
export const INITIAL_LEAVES: DoctorLeave[] = [
  {
    id: 'leave_1',
    doctor_id: 'doc_card_2',
    hospital_id: INITIAL_HOSPITAL_ID,
    date_from: '2026-09-24T00:00:00.000Z',
    date_to: '2026-09-26T23:59:59.000Z',
    reason: 'Attending National Cardiology Summit, Mumbai',
  },
  {
    id: 'leave_2',
    doctor_id: 'doc_derm_2',
    hospital_id: INITIAL_HOSPITAL_ID,
    date_from: '2026-09-28T00:00:00.000Z',
    date_to: '2026-09-29T23:59:59.000Z',
    reason: 'Personal leave',
  },
];

// Initial Staff Users (8 users across roles)
export const INITIAL_USERS: User[] = [
  {
    id: 'user_admin_1',
    name: 'Suresh Narayanan',
    phone: '+91 98401 23456',
    email: 'admin.suresh@cityhospital.example.com',
    role: 'hospital_admin',
    hospital_id: INITIAL_HOSPITAL_ID,
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '2m ago',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_rec_1',
    name: 'Deepa Krishnan',
    phone: '+91 98402 34567',
    email: 'deepa.k@cityhospital.example.com',
    role: 'receptionist',
    hospital_id: INITIAL_HOSPITAL_ID,
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: 'just now',
    created_at: '2025-01-10T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_rec_2',
    name: 'Ganesh Moorthy',
    phone: '+91 98403 45678',
    email: 'ganesh.m@cityhospital.example.com',
    role: 'receptionist',
    hospital_id: INITIAL_HOSPITAL_ID,
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '15m ago',
    created_at: '2025-02-01T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_doc_1',
    name: 'Dr. Anand Ramanathan',
    phone: '+91 98404 56789',
    email: 'anand.r@cityhospital.example.com',
    role: 'doctor',
    hospital_id: INITIAL_HOSPITAL_ID,
    linked_doctor_id: 'doc_card_1',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '3m ago',
    created_at: '2025-01-10T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_doc_2',
    name: 'Dr. Meena Raj',
    phone: '+91 98405 67890',
    email: 'meena.r@cityhospital.example.com',
    role: 'doctor',
    hospital_id: INITIAL_HOSPITAL_ID,
    linked_doctor_id: 'doc_card_2',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: '10m ago',
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_doc_3',
    name: 'Dr. Rajesh Deshmukh',
    phone: '+91 98406 78901',
    email: 'rajesh.d@cityhospital.example.com',
    role: 'doctor',
    hospital_id: INITIAL_HOSPITAL_ID,
    linked_doctor_id: 'doc_genm_1',
    preferred_language: 'hi',
    is_verified: true,
    is_active: true,
    last_active: '1h ago',
    created_at: '2025-02-01T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_doc_5',
    name: 'Dr. Vikramaditya Seth',
    phone: '+91 98407 89012',
    email: 'vikram.s@cityhospital.example.com',
    role: 'doctor',
    hospital_id: INITIAL_HOSPITAL_ID,
    linked_doctor_id: 'doc_orth_1',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '25m ago',
    created_at: '2025-02-15T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_doc_7',
    name: 'Dr. Meera Nambiar',
    phone: '+91 98408 90123',
    email: 'meera.n@cityhospital.example.com',
    role: 'doctor',
    hospital_id: INITIAL_HOSPITAL_ID,
    linked_doctor_id: 'doc_pedi_1',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: 'just now',
    created_at: '2025-03-05T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },

  // ── Apollo Hospitals (Chennai — hosp-001) ─────────────────────────
  {
    id: 'user_apollo_admin',
    name: 'Dr. K. Harish',
    phone: '+91 98401 11222',
    email: 'admin.harish@apollo.example.com',
    role: 'hospital_admin',
    hospital_id: 'hosp-001',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '5m ago',
    created_at: '2025-01-05T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_apollo_rec1',
    name: 'Priya Sundaram',
    phone: '+91 98402 11333',
    email: 'priya.s@apollo.example.com',
    role: 'receptionist',
    hospital_id: 'hosp-001',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: '12m ago',
    created_at: '2025-01-12T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_apollo_doc1',
    name: 'Dr. Priya Nair',
    phone: '+91 98404 11555',
    email: 'priya.nair@apollo.example.com',
    role: 'doctor',
    hospital_id: 'hosp-001',
    linked_doctor_id: 'doc-001',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '1h ago',
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_apollo_doc2',
    name: 'Dr. Ramesh Kumar',
    phone: '+91 98405 11666',
    email: 'ramesh.k@apollo.example.com',
    role: 'doctor',
    hospital_id: 'hosp-001',
    linked_doctor_id: 'doc-002',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: '30m ago',
    created_at: '2025-02-01T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },

  // ── MIOT International (Chennai — hosp-002) ───────────────────────
  {
    id: 'user_miot_admin',
    name: 'Selvam Raghavan',
    phone: '+91 98401 22111',
    email: 'admin.selvam@miot.example.com',
    role: 'hospital_admin',
    hospital_id: 'hosp-002',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '18m ago',
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_miot_rec1',
    name: 'Karthika Natarajan',
    phone: '+91 98402 22222',
    email: 'karthika.n@miot.example.com',
    role: 'receptionist',
    hospital_id: 'hosp-002',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: 'just now',
    created_at: '2025-02-01T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_miot_doc1',
    name: 'Dr. Suresh Babu',
    phone: '+91 98403 22333',
    email: 'suresh.b@miot.example.com',
    role: 'doctor',
    hospital_id: 'hosp-002',
    linked_doctor_id: 'doc-006',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '45m ago',
    created_at: '2025-02-10T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },

  // ── Aravind Eye Hospital (Madurai — hosp-005) ─────────────────────
  {
    id: 'user_aravind_admin',
    name: 'M. Senthilkumar',
    phone: '+91 94431 33111',
    email: 'admin.senthil@aravind.example.com',
    role: 'hospital_admin',
    hospital_id: 'hosp-005',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: '8m ago',
    created_at: '2025-01-08T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_aravind_rec1',
    name: 'Revathi Venkataraman',
    phone: '+91 94432 33222',
    email: 'revathi.v@aravind.example.com',
    role: 'receptionist',
    hospital_id: 'hosp-005',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: '2m ago',
    created_at: '2025-01-20T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_aravind_rec2',
    name: 'S. Murugesan',
    phone: '+91 94433 33333',
    email: 'murugesan.s@aravind.example.com',
    role: 'receptionist',
    hospital_id: 'hosp-005',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '22m ago',
    created_at: '2025-02-15T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_aravind_doc1',
    name: 'Dr. Meena Krishnan',
    phone: '+91 94434 33444',
    email: 'meena.k@aravind.example.com',
    role: 'doctor',
    hospital_id: 'hosp-005',
    linked_doctor_id: 'doc-012',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: 'just now',
    created_at: '2025-02-01T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_aravind_doc2',
    name: 'Dr. Jayaraj Pillai',
    phone: '+91 94435 33555',
    email: 'jayaraj.p@aravind.example.com',
    role: 'doctor',
    hospital_id: 'hosp-005',
    linked_doctor_id: 'doc-013',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '50m ago',
    created_at: '2025-02-10T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },

  // ── Meenakshi Mission Hospital (Madurai — hosp-008) ───────────────
  {
    id: 'user_mmh_admin',
    name: 'B. Ramakrishnan',
    phone: '+91 94431 44111',
    email: 'admin.ramakrishnan@meenakshimission.example.com',
    role: 'hospital_admin',
    hospital_id: 'hosp-008',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '14m ago',
    created_at: '2025-01-18T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_mmh_rec1',
    name: 'Anitha Balakrishnan',
    phone: '+91 94432 44222',
    email: 'anitha.b@meenakshimission.example.com',
    role: 'receptionist',
    hospital_id: 'hosp-008',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: '6m ago',
    created_at: '2025-02-05T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_mmh_doc1',
    name: 'Dr. J. Ramesh',
    phone: '+91 94433 44333',
    email: 'ramesh.j@meenakshimission.example.com',
    role: 'doctor',
    hospital_id: 'hosp-008',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: '35m ago',
    created_at: '2025-02-12T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },

  // ── Kovai Medical Center (KMCH, Coimbatore — hosp-003) ────────────
  {
    id: 'user_kmch_admin',
    name: 'Dr. K. Senthil Nathan',
    phone: '+91 98422 55111',
    email: 'admin.senthil@kmch.example.com',
    role: 'hospital_admin',
    hospital_id: 'hosp-003',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '4m ago',
    created_at: '2025-01-10T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_kmch_rec1',
    name: 'Divya Murugesan',
    phone: '+91 98423 55222',
    email: 'divya.m@kmch.example.com',
    role: 'receptionist',
    hospital_id: 'hosp-003',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: 'just now',
    created_at: '2025-01-25T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_kmch_rec2',
    name: 'R. Vignesh',
    phone: '+91 98424 55333',
    email: 'vignesh.r@kmch.example.com',
    role: 'receptionist',
    hospital_id: 'hosp-003',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '28m ago',
    created_at: '2025-02-18T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_kmch_doc1',
    name: 'Dr. Murugan Selvam',
    phone: '+91 98425 55444',
    email: 'murugan.s@kmch.example.com',
    role: 'doctor',
    hospital_id: 'hosp-003',
    linked_doctor_id: 'doc-009',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: '15m ago',
    created_at: '2025-02-05T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_kmch_doc2',
    name: 'Dr. Deepa Chandran',
    phone: '+91 98426 55555',
    email: 'deepa.c@kmch.example.com',
    role: 'doctor',
    hospital_id: 'hosp-003',
    linked_doctor_id: 'doc-010',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '1h ago',
    created_at: '2025-02-15T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },

  // ── Sri Ramakrishna Hospital (Coimbatore — hosp-006) ──────────────
  {
    id: 'user_srh_admin',
    name: 'V. Sukumaran',
    phone: '+91 98421 66111',
    email: 'admin.sukumaran@ramakrishna.example.com',
    role: 'hospital_admin',
    hospital_id: 'hosp-006',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '20m ago',
    created_at: '2025-01-22T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_srh_rec1',
    name: 'Shanthi Swaminathan',
    phone: '+91 98422 66222',
    email: 'shanthi.s@ramakrishna.example.com',
    role: 'receptionist',
    hospital_id: 'hosp-006',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: '10m ago',
    created_at: '2025-02-08T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_srh_doc1',
    name: 'Dr. P. Sukumaran',
    phone: '+91 98423 66333',
    email: 'sukumaran.p@ramakrishna.example.com',
    role: 'doctor',
    hospital_id: 'hosp-006',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '40m ago',
    created_at: '2025-02-14T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },

  // ── G. Kuppuswamy Naidu Memorial Hospital (GKNM, Coimbatore — hosp-011)
  {
    id: 'user_gknm_admin',
    name: 'R. Balasubramanian',
    phone: '+91 98421 77111',
    email: 'admin.bala@gknm.example.com',
    role: 'hospital_admin',
    hospital_id: 'hosp-011',
    preferred_language: 'en',
    is_verified: true,
    is_active: true,
    last_active: '11m ago',
    created_at: '2025-01-28T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'user_gknm_rec1',
    name: 'Lakshmi Narayanan',
    phone: '+91 98422 77222',
    email: 'lakshmi.n@gknm.example.com',
    role: 'receptionist',
    hospital_id: 'hosp-011',
    preferred_language: 'ta',
    is_verified: true,
    is_active: true,
    last_active: 'just now',
    created_at: '2025-02-12T00:00:00.000Z',
    updated_at: '2026-09-20T00:00:00.000Z',
  },
];

// Sample broadcasts
export const INITIAL_BROADCASTS: BroadcastLog[] = [
  {
    id: 'bcast_01',
    hospital_id: INITIAL_HOSPITAL_ID,
    type: 'delay',
    audience_type: 'doctor',
    target_id: 'doc_card_1',
    target_name: 'Dr. Anand Ramanathan',
    minutes_delayed: 20,
    channels: ['in_app', 'sms'],
    message: 'Dr. Anand Ramanathan has an emergency procedure delay of approx. 20 minutes. Your live queue token ETA has updated accordingly.',
    recipients_count: 8,
    sent_count: 8,
    failed_count: 0,
    sent_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'bcast_02',
    hospital_id: INITIAL_HOSPITAL_ID,
    type: 'closure',
    audience_type: 'department',
    target_id: 'dept_derm',
    target_name: 'Dermatology Department',
    closure_date_start: '2026-09-28',
    closure_date_end: '2026-09-29',
    channels: ['in_app', 'email'],
    message: 'Notice: Dermatology OPD will undergo air handling sterilization on 28-29 Sep. All affected bookings have been flagged for priority rescheduling.',
    recipients_count: 14,
    sent_count: 14,
    failed_count: 0,
    sent_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'bcast_03',
    hospital_id: INITIAL_HOSPITAL_ID,
    type: 'custom',
    audience_type: 'all',
    channels: ['in_app'],
    message: 'Welcome to City Hospital. Please keep your digital booking QR code ready at the entrance kiosk for swift token validation.',
    recipients_count: 64,
    sent_count: 64,
    failed_count: 0,
    sent_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

// Patient Notes
export const INITIAL_PATIENT_NOTES: PatientNote[] = [
  {
    id: 'note_1',
    patient_id: 'pat_01',
    author_id: 'user_rec_1',
    author_name: 'Deepa Krishnan',
    note: 'Requires wheelchair assistance on arrival from parking bay.',
    created_at: '2026-09-10T10:15:00.000Z',
  },
  {
    id: 'note_2',
    patient_id: 'pat_05',
    author_id: 'user_admin_1',
    author_name: 'Suresh Narayanan',
    note: 'Preferred contact is son Vijay (+91 98409 11223) during daytime.',
    created_at: '2026-09-14T14:30:00.000Z',
  },
];

// Audit log entries
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit_01',
    actor_id: 'user_rec_1',
    actor_name: 'Deepa Krishnan',
    action: 'CHECK_IN_PATIENT',
    details: 'Checked in token CARD-004 for patient Ravi Shankar',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'audit_02',
    actor_id: 'user_admin_1',
    actor_name: 'Suresh Narayanan',
    action: 'REVEAL_PHONE',
    details: 'Viewed masked phone number for patient Lakshmi Narayanan',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'audit_03',
    actor_id: 'user_admin_1',
    actor_name: 'Suresh Narayanan',
    action: 'BROADCAST_DELAY',
    details: 'Issued 20-min delay broadcast for Dr. Anand Ramanathan',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
];

// Initial Doctor Availability States (Section 4.4)
export const INITIAL_DOCTOR_AVAILABILITY: Record<string, DoctorAvailabilityState> = {
  doc_card_1: {
    doctor_id: 'doc_card_1',
    status: 'late',
    delay_minutes: 20,
    reason: 'Traffic congestion on Mount Road',
    changed_at: new Date(Date.now() - 3600000).toISOString(),
  },
  doc_card_2: {
    doctor_id: 'doc_card_2',
    status: 'available',
    changed_at: new Date(Date.now() - 7200000).toISOString(),
  },
  doc_derm_2: {
    doctor_id: 'doc_derm_2',
    status: 'on_leave',
    reason: 'Personal leave',
    changed_at: new Date(Date.now() - 86400000).toISOString(),
  },
};

// Initial Availability Log (last 20 changes per doctor)
export const INITIAL_AVAILABILITY_LOG: AvailabilityLogEntry[] = [
  {
    id: 'avl_1',
    doctor_id: 'doc_card_2',
    status: 'available',
    changed_at: new Date(Date.now() - 14400000).toISOString(),
    reason: 'Morning OPD consultation shift started',
  },
  {
    id: 'avl_2',
    doctor_id: 'doc_card_2',
    status: 'on_break',
    duration_minutes: 15,
    changed_at: new Date(Date.now() - 7200000).toISOString(),
    reason: 'Tea break & clinical ward rounds',
  },
  {
    id: 'avl_3',
    doctor_id: 'doc_card_2',
    status: 'available',
    changed_at: new Date(Date.now() - 6300000).toISOString(),
    reason: 'Resumed OPD consultations',
  },
  {
    id: 'avl_4',
    doctor_id: 'doc_card_1',
    status: 'late',
    duration_minutes: 20,
    changed_at: new Date(Date.now() - 3600000).toISOString(),
    reason: 'Traffic delay on Mount Road',
  },
];

// Initial Consultation Notes (Section 4.4)
export const INITIAL_CONSULTATION_NOTES: ConsultationNote[] = [
  {
    id: 'cnote_card_2_1',
    appointment_id: 'apt_card_2_1',
    doctor_id: 'doc_card_2',
    patient_id: 'pat_01',
    text: 'Patient presented for chronic hypertension follow-up. Blood pressure measured at 128/82 mmHg in sitting posture. Heart sounds S1 S2 normal with no murmurs. Advised continuation of Tab Telmisartan 40mg once daily after breakfast. Restrict daily sodium intake and maintain moderate walking routine.',
    follow_up: '1_month',
    finalized: true,
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'cnote_card_2_2',
    appointment_id: 'apt_card_2_2',
    doctor_id: 'doc_card_2',
    patient_id: 'pat_02',
    text: 'Evaluation of mild post-exertional chest tightness. 12-lead ECG confirms normal sinus rhythm without acute ST-T changes. Baseline 2D Echocardiogram shows preserved LV ejection fraction of 62%. Prescribed Tab Aspirin 75mg and Atorvastatin 20mg at bedtime. Follow-up review with TMT reports.',
    follow_up: '2_weeks',
    finalized: true,
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

// Notification templates (Hospital Settings Page 36)
export const INITIAL_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    type: 'booking_confirmed',
    label: 'Booking Confirmation',
    channels: { in_app: true, email: true, sms: true },
    template_text: 'Dear {{patient_name}}, your appointment with {{doctor_name}} is confirmed for {{time}}. Token preview: {{token}}.',
    variables: ['{{patient_name}}', '{{doctor_name}}', '{{time}}', '{{token}}'],
  },
  {
    type: 'reminder',
    label: 'Appointment Reminder (24h / 1h)',
    channels: { in_app: true, email: false, sms: true },
    template_text: 'Reminder: {{patient_name}}, you have a visit with {{doctor_name}} at {{time}}. Please arrive 10 min early.',
    variables: ['{{patient_name}}', '{{doctor_name}}', '{{time}}'],
  },
  {
    type: 'doctor_delayed',
    label: 'Doctor Delay Notification',
    channels: { in_app: true, email: false, sms: true },
    template_text: 'Queue Update: {{doctor_name}} is running {{eta_minutes}} min late. Your expected consultation is at {{time}}.',
    variables: ['{{patient_name}}', '{{doctor_name}}', '{{eta_minutes}}', '{{time}}', '{{token}}'],
  },
  {
    type: 'you_are_next',
    label: 'You Are Next (Turn Alert)',
    channels: { in_app: true, email: false, sms: true },
    template_text: 'Turn Alert: Token {{token}} for {{patient_name}}, you are next! Please proceed directly to consultation room.',
    variables: ['{{token}}', '{{patient_name}}', '{{doctor_name}}'],
  },
  {
    type: 'queue_update',
    label: 'Live Queue Progress',
    channels: { in_app: true, email: false, sms: false },
    template_text: 'Token {{token}}: Estimated wait is {{eta_minutes}} minutes. 2 patients ahead.',
    variables: ['{{token}}', '{{eta_minutes}}'],
  },
  {
    type: 'cancelled',
    label: 'Cancellation Notice',
    channels: { in_app: true, email: true, sms: true },
    template_text: 'Dear {{patient_name}}, your appointment with {{doctor_name}} scheduled for {{time}} has been cancelled.',
    variables: ['{{patient_name}}', '{{doctor_name}}', '{{time}}'],
  },
  {
    type: 'rescheduled',
    label: 'Rescheduled Appointment',
    channels: { in_app: true, email: true, sms: true },
    template_text: 'Dear {{patient_name}}, your appointment has been rescheduled with {{doctor_name}} to {{time}}.',
    variables: ['{{patient_name}}', '{{doctor_name}}', '{{time}}', '{{token}}'],
  },
  {
    type: 'system',
    label: 'Hospital System Alert',
    channels: { in_app: true, email: false, sms: false },
    template_text: 'City Hospital announcement: {{message}}',
    variables: ['{{message}}'],
  },
];

// Dynamic Seed Generator for Appointments and Queue Entries
export function generateSeedAppointmentsAndQueue(): {
  appointments: Appointment[];
  queueEntries: QueueEntry[];
} {
  const appointments: Appointment[] = [];
  const queueEntries: QueueEntry[] = [];
  const todayDateStr = getTodayDateStringIST();
  const now = new Date();

  const patientNames = [
    { name: 'Ravi Shankar', age: 48, gender: 'male', phone: '+91 98410 12345', past_visits_count: 4, last_visit_date: '2026-08-12' },
    { name: 'Lakshmi Narayanan', age: 62, gender: 'female', phone: '+91 98411 23456', past_visits_count: 7, last_visit_date: '2026-07-25' },
    { name: 'Karthik Venkatesh', age: 34, gender: 'male', phone: '+91 98412 34567', past_visits_count: 2, last_visit_date: '2026-09-02' },
    { name: 'Ananya Deshmukh', age: 29, gender: 'female', phone: '+91 98413 45678', past_visits_count: 5, last_visit_date: '2026-08-30' },
    { name: 'Srinivasan Parthasarathy', age: 71, gender: 'male', phone: '+91 98414 56789', past_visits_count: 6, last_visit_date: '2026-06-18' },
    { name: 'Divya Sundar', age: 26, gender: 'female', phone: '+91 98415 67890' },
    { name: 'Vijay Chidambaram', age: 42, gender: 'male', phone: '+91 98416 78901' },
    { name: 'Meenakshi Sundaram', age: 55, gender: 'female', phone: '+91 98417 89012' },
    { name: 'Aarav Nair', age: 6, gender: 'male', phone: '+91 98418 90123' },
    { name: 'Nandhini Krishnan', age: 38, gender: 'female', phone: '+91 98419 01234' },
    { name: 'Mohamed Farooq', age: 45, gender: 'male', phone: '+91 98420 12345' },
    { name: 'Shreya Banerji', age: 31, gender: 'female', phone: '+91 98421 23456' },
    { name: 'Gopalan Venkat', age: 67, gender: 'male', phone: '+91 98422 34567' },
    { name: 'Saritha Namboodiri', age: 50, gender: 'female', phone: '+91 98423 45678' },
    { name: 'Kavita Sengupta', age: 24, gender: 'female', phone: '+91 98424 56789' },
    { name: 'Harish Ranganathan', age: 39, gender: 'male', phone: '+91 98425 67890' },
    { name: 'Subramanian Swaminathan', age: 74, gender: 'male', phone: '+91 98426 78901' },
    { name: 'Preeti Sharma', age: 33, gender: 'female', phone: '+91 98427 89012' },
    { name: 'Aditya Bhatt', age: 12, gender: 'male', phone: '+91 98428 90123' },
    { name: 'Radhika Murthy', age: 59, gender: 'female', phone: '+91 98429 01234' },
    { name: 'Balaji Natarajan', age: 44, gender: 'male', phone: '+91 98430 12345' },
    { name: 'Sumitra Ramaswamy', age: 66, gender: 'female', phone: '+91 98431 23456' },
    { name: 'Rohan Joshi', age: 28, gender: 'male', phone: '+91 98432 34567' },
    { name: 'Gayathri Menon', age: 36, gender: 'female', phone: '+91 98433 45678' },
    { name: 'Manoj Pillai', age: 52, gender: 'male', phone: '+91 98434 56789' },
    { name: 'Deepak Vohra', age: 41, gender: 'male', phone: '+91 98435 67890' },
    { name: 'Sadhana Iyer', age: 60, gender: 'female', phone: '+91 98436 78901' },
    { name: 'Vimal Raj', age: 22, gender: 'male', phone: '+91 98437 89012' },
    { name: 'Archana Patil', age: 35, gender: 'female', phone: '+91 98438 90123' },
    { name: 'Sanjay Malhotra', age: 49, gender: 'male', phone: '+91 98439 01234' },
    { name: 'Bhavani Shankar', age: 58, gender: 'female', phone: '+91 98440 12345' },
    { name: 'Praveen Chandran', age: 37, gender: 'male', phone: '+91 98441 23456' },
    { name: 'Tara George', age: 8, gender: 'female', phone: '+91 98442 34567' },
    { name: 'Ashok Ganguly', age: 63, gender: 'male', phone: '+91 98443 45678' },
    { name: 'Padma Vasudevan', age: 70, gender: 'female', phone: '+91 98444 56789' },
  ];

  const reasons = [
    'Routine follow-up',
    'Chest discomfort and fatigue',
    'Knee joint pain after morning walks',
    'Skin rash and persistent itching',
    'Severe sore throat and difficulty swallowing',
    'High fever and chills for 2 days',
    'Persistent dry cough and mild wheezing',
    'Hypertension review and prescription renewal',
    'Chronic migraine headaches',
    'Ear fullness and muffled hearing',
    'Sports sprain in right ankle',
    'Pediatric routine vaccination review',
  ];

  // Token counter per department for today
  const deptCounters: Record<string, number> = {
    dept_card: 0,
    dept_genm: 0,
    dept_orth: 0,
    dept_pedi: 0,
    dept_derm: 0,
    dept_ent: 0,
  };

  let aptSeq = 100;

  // Generate appointments across 12 doctors
  INITIAL_DOCTORS.forEach((doc, docIdx) => {
    const dept = INITIAL_DEPARTMENTS.find((d) => d.id === doc.department_id)!;
    // Default doctor doc_card_2 gets 12 appointments for rich doctor-view demo
    const numSlots = doc.id === 'doc_card_2' ? 12 : 6;

    for (let slotIdx = 0; slotIdx < numSlots; slotIdx++) {
      aptSeq++;
      deptCounters[dept.id]++;
      const tokenNum = deptCounters[dept.id];
      const tokenStr = `${dept.token_prefix}-${tokenNum.toString().padStart(3, '0')}`;

      const pat = patientNames[(docIdx * 6 + slotIdx) % patientNames.length];
      const startHour = 9 + Math.floor((slotIdx * 35) / 60);
      const startMin = (slotIdx * 35) % 60;
      const scheduledStart = new Date(now);
      scheduledStart.setHours(startHour, startMin, 0, 0);

      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + (doc.id === 'doc_card_2' ? 15 : 15));

      const bookingCode = `APT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      let status: Appointment['status'] = 'booked';
      let qStatus: QueueEntry['status'] | null = null;
      let priority = 2; // normal
      let isWalkin = false;
      let isLateArrival = false;

      if (pat.age && pat.age >= 65) priority = 1; // Priority for elderly

      if (doc.id === 'doc_card_2') {
        // Precise distribution for Section 4.4 requirements:
        if (slotIdx === 0) {
          status = 'completed';
          qStatus = 'completed';
        } else if (slotIdx === 1) {
          status = 'completed';
          qStatus = 'completed';
        } else if (slotIdx === 2) {
          status = 'in_consultation';
          qStatus = 'in_consultation';
        } else if (slotIdx === 3) {
          status = 'in_queue';
          qStatus = 'waiting';
          priority = 1; // Priority elderly patient
        } else if (slotIdx === 4) {
          status = 'in_queue';
          qStatus = 'waiting';
          priority = 2;
        } else if (slotIdx === 5) {
          status = 'in_queue';
          qStatus = 'waiting';
          isWalkin = true;
          priority = 2;
        } else if (slotIdx === 6) {
          status = 'in_queue';
          qStatus = 'waiting';
          isLateArrival = true;
          priority = 2;
        } else if (slotIdx === 7) {
          status = 'in_queue';
          qStatus = 'waiting';
          priority = 2;
        } else if (slotIdx === 8 || slotIdx === 9) {
          status = 'booked';
        } else if (slotIdx === 10) {
          status = 'no_show';
        } else if (slotIdx === 11) {
          status = 'cancelled';
        }
      } else {
        // Distribution for other doctors
        if (slotIdx === 0) {
          status = 'completed';
          qStatus = 'completed';
        } else if (slotIdx === 1) {
          status = 'in_consultation';
          qStatus = 'in_consultation';
        } else if (slotIdx === 2) {
          status = 'in_queue';
          qStatus = 'waiting';
        } else if (slotIdx === 3) {
          status = 'in_queue';
          qStatus = 'waiting';
        } else if (slotIdx === 4) {
          status = 'booked';
        } else if (slotIdx === 5) {
          if (docIdx % 4 === 0) {
            status = 'no_show';
          } else if (docIdx % 4 === 1) {
            status = 'cancelled';
          } else {
            status = 'booked';
          }
        }
        isWalkin = slotIdx === 3 && docIdx % 2 === 1;
      }

      // One special emergency walk-in for General Medicine
      const isEmergencyWalkin = doc.id === 'doc_genm_1' && slotIdx === 3;
      if (isEmergencyWalkin) {
        priority = 0; // Emergency
      }

      let aptId = `apt_${aptSeq}`;
      if (doc.id === 'doc_card_2') {
        if (slotIdx === 0) aptId = 'apt_card_2_1';
        if (slotIdx === 1) aptId = 'apt_card_2_2';
      }

      const apt: Appointment = {
        id: aptId,
        booking_code: bookingCode,
        patient_id: `pat_${(docIdx * 6 + slotIdx) % patientNames.length + 1}`,
        patient: {
          name: pat.name,
          age: pat.age,
          gender: pat.gender,
          phone: pat.phone,
          past_visits_count: pat.past_visits_count,
          last_visit_date: pat.last_visit_date,
        },
        hospital_id: INITIAL_HOSPITAL_ID,
        department_id: dept.id,
        doctor_id: doc.id,
        hospital_name: 'City Hospital',
        doctor_name: doc.name,
        department_name: dept.name,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        type: isWalkin || isEmergencyWalkin ? 'walk_in' : 'booked',
        reason: reasons[(docIdx + slotIdx) % reasons.length],
        symptoms_note: 'Patient reported mild symptoms over the past 3 days.',
        fee: doc.fee,
        status,
        status_history: [
          { status: 'booked', at: new Date(scheduledStart.getTime() - 86400000).toISOString() },
        ],
        created_via: isWalkin ? 'desk' : 'web',
        created_at: new Date(scheduledStart.getTime() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        desk_confirmed: slotIdx < 3,
      };

      if (status === 'completed') {
        apt.status_history.push(
          { status: 'checked_in', at: new Date(scheduledStart.getTime() - 1800000).toISOString() },
          { status: 'in_queue', at: new Date(scheduledStart.getTime() - 1700000).toISOString() },
          { status: 'called', at: new Date(scheduledStart.getTime() - 1200000).toISOString() },
          { status: 'in_consultation', at: new Date(scheduledStart.getTime() - 1100000).toISOString() },
          { status: 'completed', at: new Date(scheduledStart.getTime() - 200000).toISOString() }
        );
      } else if (status === 'in_consultation') {
        apt.status_history.push(
          { status: 'checked_in', at: new Date(now.getTime() - 1500000).toISOString() },
          { status: 'in_queue', at: new Date(now.getTime() - 1400000).toISOString() },
          { status: 'called', at: new Date(now.getTime() - 600000).toISOString() },
          { status: 'in_consultation', at: new Date(now.getTime() - 420000).toISOString() }
        );
      } else if (status === 'in_queue') {
        apt.status_history.push(
          { status: 'checked_in', at: new Date(now.getTime() - 600000).toISOString() },
          { status: 'in_queue', at: new Date(now.getTime() - 500000).toISOString() }
        );
      } else if (status === 'cancelled') {
        apt.cancelled_reason = 'Patient requested cancellation due to scheduling conflict';
      }

      appointments.push(apt);

      // Create queue entry for active states
      if (qStatus) {
        const qEntry: QueueEntry = {
          id: `q_${apt.id}`,
          appointment_id: apt.id,
          hospital_id: INITIAL_HOSPITAL_ID,
          department_id: dept.id,
          doctor_id: doc.id,
          queue_date: todayDateStr,
          token: tokenStr,
          token_number: tokenNum,
          priority,
          status: qStatus,
          sort_time: isLateArrival
            ? new Date(now.getTime() - 100000).toISOString() // Reset to arrival time behind queue
            : scheduledStart.toISOString(),
          call_count: 0,
          checked_in_at: new Date(now.getTime() - 600000).toISOString(),
          started_at: status === 'in_consultation' ? new Date(now.getTime() - 420000).toISOString() : undefined,
          completed_at: status === 'completed' ? new Date(now.getTime() - 200000).toISOString() : undefined,
          consult_minutes: status === 'completed' ? doc.avg_consult_minutes : undefined,
          created_at: new Date(now.getTime() - 1800000).toISOString(),
          skip_count: 0,
          is_late_arrival: isLateArrival,
        };

        queueEntries.push(qEntry);
      }
    }
  });

  // Seed 4 booked appointments for tomorrow for default doctor (doc_card_2)
  // This supports the 7-day strip and QA test scenario 7 (leave rescheduling)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const meenaDoc = INITIAL_DOCTORS.find((d) => d.id === 'doc_card_2')!;
  const cardDept = INITIAL_DEPARTMENTS.find((d) => d.id === 'dept_card')!;

  for (let tmSlot = 0; tmSlot < 4; tmSlot++) {
    aptSeq++;
    const tStart = new Date(tomorrow);
    tStart.setHours(10 + tmSlot, 0, 0, 0);
    const tEnd = new Date(tStart);
    tEnd.setMinutes(tEnd.getMinutes() + 15);
    const pat = patientNames[(tmSlot + 8) % patientNames.length];

    appointments.push({
      id: `apt_tm_${tmSlot + 1}`,
      booking_code: `APT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      patient_id: `pat_tm_${tmSlot + 1}`,
      patient: {
        name: pat.name,
        age: pat.age,
        gender: pat.gender,
        phone: pat.phone,
        past_visits_count: 2,
        last_visit_date: '2026-08-15',
      },
      hospital_id: INITIAL_HOSPITAL_ID,
      department_id: cardDept.id,
      doctor_id: meenaDoc.id,
      hospital_name: 'City Care Hospital',
      doctor_name: meenaDoc.name,
      department_name: cardDept.name,
      scheduled_start: tStart.toISOString(),
      scheduled_end: tEnd.toISOString(),
      type: 'booked',
      created_via: 'web',
      fee: meenaDoc.fee,
      status: 'booked',
      reason: 'Follow-up cardiology consultation',
      symptoms_note: 'Routine post-procedure checkup',
      status_history: [
        { status: 'booked', at: new Date(now.getTime() - 86400000).toISOString() },
      ],
      created_at: new Date(now.getTime() - 86400000).toISOString(),
      updated_at: new Date(now.getTime() - 86400000).toISOString(),
    });
  }

  // Calculate initial position and ETAs for all waiting queue entries
  INITIAL_DOCTORS.forEach((doc) => {
    const docWaiting = queueEntries.filter((q) => q.doctor_id === doc.id && q.status === 'waiting');
    const inConsult = queueEntries.find((q) => q.doctor_id === doc.id && q.status === 'in_consultation');
    const recomputed = recomputeDoctorQueueEtas(doc, docWaiting, inConsult);
    recomputed.forEach((re) => {
      const idx = queueEntries.findIndex((q) => q.id === re.id);
      if (idx !== -1) {
        queueEntries[idx] = re;
      }
    });
  });

  return { appointments, queueEntries };
}
