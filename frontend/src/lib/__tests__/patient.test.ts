import { describe, it, expect } from 'vitest';
import {
  getEnabledChannels,
  canReview,
  applyReviewToRatings,
  validateDocument,
  canRemoveFamilyMember,
  passwordStrength,
  searchFaq,
  buildDataExport,
  type FaqItem,
} from '../patient';
import type { PatientUser, Appointment, Review, FamilyMember, MedicalDocument } from '@/types';

describe('Patient Portal Helper Suite (lib/patient.ts)', () => {
  const mockPatient: PatientUser = {
    id: 'pat_arun_01',
    name: 'Arun Kumar',
    phone: '+91 98765 43210',
    email: 'arun.kumar@example.com',
    age: 34,
    gender: 'male',
    preferred_language: 'en',
    is_verified: true,
    email_verified: true,
    created_at: '2026-01-01T00:00:00Z',
    notification_preferences: {
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
    },
  };

  describe('getEnabledChannels', () => {
    it('returns all enabled channels when patient has verified phone and email', () => {
      const channels = getEnabledChannels(mockPatient, 'booking_confirmed');
      expect(channels).toContain('in_app');
      expect(channels).toContain('email');
      expect(channels).toContain('sms');
    });

    it('suppresses email if email is not verified', () => {
      const unverified = { ...mockPatient, email_verified: false };
      const channels = getEnabledChannels(unverified, 'booking_confirmed');
      expect(channels).toContain('in_app');
      expect(channels).toContain('sms');
      expect(channels).not.toContain('email');
    });

    it('suppresses sms if phone is not verified', () => {
      const unverified = { ...mockPatient, is_verified: false };
      const channels = getEnabledChannels(unverified, 'booking_confirmed');
      expect(channels).toContain('in_app');
      expect(channels).not.toContain('sms');
      expect(channels).toContain('email');
    });
  });

  describe('canReview', () => {
    const baseAppt: Appointment = {
      id: 'appt_1',
      hospital_id: 'hosp_city_01',
      department_id: 'dept_cardio',
      doctor_id: 'doc_card_1',
      patient_id: 'pat_arun_01',
      patient_name: 'Arun Kumar',
      patient_phone: '+91 98765 43210',
      token_number: 'C-01',
      scheduled_start: '2026-09-01T09:00:00Z',
      scheduled_end: '2026-09-01T09:15:00Z',
      estimated_start: '2026-09-01T09:00:00Z',
      type: 'scheduled',
      status: 'completed',
      source: 'patient_portal',
      created_at: '2026-09-01T08:00:00Z',
      updated_at: '2026-09-01T10:00:00Z',
      status_history: [
        { status: 'completed', at: '2026-09-01T10:00:00Z' },
      ],
    };

    it('blocks review creation for non-completed appointment', () => {
      const pending = { ...baseAppt, status: 'booked' as const };
      const result = canReview(pending, undefined);
      expect(result.canCreate).toBe(false);
      expect(result.reason).toMatch(/after your visit/i);
    });

    it('allows creation when completed and no review exists', () => {
      const result = canReview(baseAppt, undefined);
      expect(result.canCreate).toBe(true);
      expect(result.canEdit).toBe(false);
      expect(result.readOnly).toBe(false);
    });

    it('allows edit within 14-day window', () => {
      const review: Review = {
        id: 'rev_1',
        appointment_id: 'appt_1',
        patient_id: 'pat_arun_01',
        doctor_id: 'doc_card_1',
        hospital_id: 'hosp_city_01',
        overall_rating: 5,
        created_at: '2026-09-01T11:00:00Z',
        updated_at: '2026-09-01T11:00:00Z',
      };
      // 5 days later
      const now = new Date('2026-09-06T10:00:00Z');
      const result = canReview(baseAppt, review, now);
      expect(result.canEdit).toBe(true);
      expect(result.readOnly).toBe(false);
    });

    it('locks review to read-only after 14-day window passes', () => {
      const review: Review = {
        id: 'rev_1',
        appointment_id: 'appt_1',
        patient_id: 'pat_arun_01',
        doctor_id: 'doc_card_1',
        hospital_id: 'hosp_city_01',
        overall_rating: 5,
        created_at: '2026-09-01T11:00:00Z',
        updated_at: '2026-09-01T11:00:00Z',
      };
      // 20 days later
      const now = new Date('2026-09-21T10:00:00Z');
      const result = canReview(baseAppt, review, now);
      expect(result.canEdit).toBe(false);
      expect(result.readOnly).toBe(true);
      expect(result.reason).toMatch(/14-day edit window has passed/i);
    });
  });

  describe('applyReviewToRatings', () => {
    it('accurately adds a new review rating to the average', () => {
      // 4.0 avg with 4 reviews = sum of 16. New rating = 5. Total = 21 / 5 = 4.2
      const res = applyReviewToRatings(4.0, 4, 5);
      expect(res.count).toBe(5);
      expect(res.avg).toBe(4.2);
    });

    it('accurately recalculates when editing an existing review', () => {
      // 4.2 avg with 5 reviews = sum 21. Replace 5 with 3. Total = 19 / 5 = 3.8
      const res = applyReviewToRatings(4.2, 5, 3, 5);
      expect(res.count).toBe(5);
      expect(res.avg).toBe(3.8);
    });
  });

  describe('validateDocument', () => {
    it('accepts valid PDF within size and quota limits', () => {
      const file = { name: 'report.pdf', size: 2 * 1024 * 1024, type: 'application/pdf' };
      const err = validateDocument(file, 5 * 1024 * 1024);
      expect(err).toBeNull();
    });

    it('rejects unsupported file type', () => {
      const file = { name: 'records.docx', size: 1024 * 1024, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      const err = validateDocument(file, 0);
      expect(err).toMatch(/not a supported file type/i);
    });

    it('rejects file larger than 10MB', () => {
      const file = { name: 'huge_scan.pdf', size: 12 * 1024 * 1024, type: 'application/pdf' };
      const err = validateDocument(file, 0);
      expect(err).toMatch(/Maximum file size is 10 MB/i);
    });

    it('rejects file exceeding total 50MB quota', () => {
      const file = { name: 'scan.pdf', size: 4 * 1024 * 1024, type: 'application/pdf' };
      const err = validateDocument(file, 48 * 1024 * 1024); // 48MB already used
      expect(err).toMatch(/exceed the 50 MB demo storage limit/i);
    });
  });

  describe('canRemoveFamilyMember', () => {
    const member: FamilyMember = {
      id: 'fm_priya',
      user_id: 'pat_arun_01',
      name: 'Priya Kumar',
      relation: 'spouse',
      gender: 'female',
      age: 32,
      created_at: '2026-01-01T00:00:00Z',
    };

    it('blocks removal if family member has active booked appointment', () => {
      const appts: Appointment[] = [
        {
          id: 'appt_fm_1',
          hospital_id: 'hosp_city_01',
          department_id: 'dept_cardio',
          doctor_id: 'doc_card_1',
          patient_id: 'pat_arun_01',
          family_member_id: 'fm_priya',
          patient_name: 'Priya Kumar',
          patient_phone: '+91 98765 43210',
          token_number: 'C-09',
          scheduled_start: '2026-09-25T10:00:00Z',
          scheduled_end: '2026-09-25T10:15:00Z',
          estimated_start: '2026-09-25T10:00:00Z',
          type: 'scheduled',
          status: 'booked',
          source: 'patient_portal',
          created_at: '2026-09-20T00:00:00Z',
          updated_at: '2026-09-20T00:00:00Z',
          status_history: [],
        },
      ];

      const res = canRemoveFamilyMember(member, appts);
      expect(res.allowed).toBe(false);
      expect(res.upcomingIds).toContain('appt_fm_1');
      expect(res.reason).toMatch(/upcoming appointment/i);
    });

    it('allows removal if all appointments are completed or cancelled', () => {
      const appts: Appointment[] = [
        {
          id: 'appt_fm_done',
          hospital_id: 'hosp_city_01',
          department_id: 'dept_cardio',
          doctor_id: 'doc_card_1',
          patient_id: 'pat_arun_01',
          family_member_id: 'fm_priya',
          patient_name: 'Priya Kumar',
          patient_phone: '+91 98765 43210',
          token_number: 'C-09',
          scheduled_start: '2026-09-01T10:00:00Z',
          scheduled_end: '2026-09-01T10:15:00Z',
          estimated_start: '2026-09-01T10:00:00Z',
          type: 'scheduled',
          status: 'completed',
          source: 'patient_portal',
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
          status_history: [],
        },
      ];

      const res = canRemoveFamilyMember(member, appts);
      expect(res.allowed).toBe(true);
      expect(res.upcomingIds).toHaveLength(0);
    });
  });

  describe('passwordStrength', () => {
    it('rates short passwords as weak', () => {
      const res = passwordStrength('abc');
      expect(res.level).toBe('weak');
      expect(res.checks.minLength).toBe(false);
    });

    it('rates password with length, letters, and numbers as good/strong', () => {
      const good = passwordStrength('Secret123');
      expect(['good', 'strong']).toContain(good.level);
      expect(good.checks.hasLetter).toBe(true);
      expect(good.checks.hasNumber).toBe(true);

      const strong = passwordStrength('S3cur3!P@ss');
      expect(strong.level).toBe('strong');
      expect(strong.checks.hasSpecial).toBe(true);
    });
  });

  describe('searchFaq', () => {
    const faqData: FaqItem[] = [
      {
        id: 'faq_1',
        category: 'Queue & Token',
        question: 'How does the digital queue work?',
        answer: 'You can check your position in real time on the live display.',
      },
      {
        id: 'faq_2',
        category: 'Appointments',
        question: 'How do I cancel or reschedule my appointment?',
        answer: 'Navigate to your records and select the appointment to manage.',
      },
      {
        id: 'faq_3',
        category: 'Family',
        question: 'How many family members can I add?',
        answer: 'You can add up to 6 family members to manage bookings together.',
      },
    ];

    it('returns highlighted matches with <mark> tags', () => {
      const results = searchFaq('queue', faqData);
      expect(results).toHaveLength(1);
      expect(results[0].questionMatch).toBe(true);
      expect(results[0].highlightedQuestion).toContain('<mark>queue</mark>');
    });

    it('prioritizes question matches over answer-only matches', () => {
      const results = searchFaq('appointment', faqData);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].item.id).toBe('faq_2');
    });

    it('returns empty array when query is whitespace', () => {
      expect(searchFaq('   ', faqData)).toEqual([]);
    });
  });

  describe('buildDataExport', () => {
    it('creates compliant export bundle without blobs', () => {
      const docs: MedicalDocument[] = [
        {
          id: 'doc_1',
          patient_id: 'pat_arun_01',
          name: 'Echo_Report.pdf',
          category: 'lab_report',
          mime: 'application/pdf',
          size_bytes: 1024,
          uploaded_at: '2026-09-01T00:00:00Z',
        },
      ];

      const exported = buildDataExport(mockPatient, [], [], [], docs);
      expect(exported.exported_at).toBeDefined();
      expect(exported.profile).toBeDefined();
      expect(exported.document_count).toBe(1);
      expect((exported.documents_metadata as any)[0].name).toBe('Echo_Report.pdf');
    });
  });
});
