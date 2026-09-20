/**
 * Pure helper functions for the Patient Portal (Pages 20–24).
 * No side effects, no store access — all inputs are explicit.
 */

import type {
  PatientUser,
  NotificationType,
  Channel,
  Appointment,
  Review,
  FamilyMember,
  MedicalDocument,
} from '@/types';

// ==========================================
// Notification preferences
// ==========================================

/**
 * Returns the list of channels enabled for a given notification type,
 * considering both the user's preferences and verification status.
 * - In-app is always returned for types that lock it on.
 * - SMS requires phone verified (is_verified).
 * - Email requires email_verified.
 */
export function getEnabledChannels(
  user: PatientUser,
  type: NotificationType
): Channel[] {
  const pref = user.notification_preferences.channels[type];
  if (!pref) return ['in_app'];

  const channels: Channel[] = [];

  // In-app is always on
  if (pref.in_app) channels.push('in_app');

  // Email only if email is verified
  if (pref.email && user.email_verified) channels.push('email');

  // SMS only if phone is verified
  if (pref.sms && user.is_verified) channels.push('sms');

  return channels;
}

// ==========================================
// Review eligibility
// ==========================================

/** 14 days in milliseconds */
const REVIEW_EDIT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Determines whether a patient can create or edit a review for an appointment.
 * Returns: { canCreate, canEdit, readOnly, reason }
 */
export function canReview(
  appointment: Appointment,
  review: Review | undefined,
  now: Date = new Date()
): {
  canCreate: boolean;
  canEdit: boolean;
  readOnly: boolean;
  reason?: string;
} {
  // Must be completed
  if (appointment.status !== 'completed') {
    return {
      canCreate: false,
      canEdit: false,
      readOnly: false,
      reason: 'You can review after your visit.',
    };
  }

  // Find the completion date from status_history
  const completedEvent = appointment.status_history.find(
    (e) => e.status === 'completed'
  );
  const completedAt = completedEvent
    ? new Date(completedEvent.at)
    : new Date(appointment.updated_at);

  const elapsed = now.getTime() - completedAt.getTime();

  if (!review) {
    // No review yet — can create (no time limit on creation)
    return { canCreate: true, canEdit: false, readOnly: false };
  }

  // Review exists — check edit window
  if (elapsed <= REVIEW_EDIT_WINDOW_MS) {
    return { canCreate: false, canEdit: true, readOnly: false };
  }

  return {
    canCreate: false,
    canEdit: false,
    readOnly: true,
    reason: 'The 14-day edit window has passed.',
  };
}

// ==========================================
// Rating math
// ==========================================

/**
 * Recalculates the running average after a new or edited review.
 * For edits, oldRating is the previous value being replaced.
 */
export function applyReviewToRatings(
  currentAvg: number,
  currentCount: number,
  newRating: number,
  oldRating?: number
): { avg: number; count: number } {
  if (oldRating !== undefined) {
    // Edit: replace old with new, count stays the same
    if (currentCount === 0) return { avg: newRating, count: 1 };
    const totalSum = currentAvg * currentCount;
    const newAvg = (totalSum - oldRating + newRating) / currentCount;
    return {
      avg: Math.round(newAvg * 10) / 10,
      count: currentCount,
    };
  }

  // New review: add to the pool
  const newCount = currentCount + 1;
  const newAvg =
    (currentAvg * currentCount + newRating) / newCount;
  return {
    avg: Math.round(newAvg * 10) / 10,
    count: newCount,
  };
}

// ==========================================
// Document validation
// ==========================================

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_QUOTA = 50 * 1024 * 1024; // 50 MB

/**
 * Validates a file for upload. Returns null if valid, or an error string.
 */
export function validateDocument(
  file: { name: string; size: number; type: string },
  existingTotalBytes: number
): string | null {
  if (!ALLOWED_MIMES.has(file.type)) {
    return `"${file.name}" is not a supported file type. Upload a PDF, JPG or PNG.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}" is ${sizeMb} MB. Maximum file size is 10 MB.`;
  }

  if (existingTotalBytes + file.size > MAX_TOTAL_QUOTA) {
    const usedMb = (existingTotalBytes / (1024 * 1024)).toFixed(1);
    return `Adding "${file.name}" would exceed the 50 MB demo storage limit (${usedMb} MB used).`;
  }

  return null;
}

// ==========================================
// Family member removal guard
// ==========================================

/**
 * Checks whether a family member can be removed.
 * Blocked if they have upcoming appointments (booked/checked_in/in_queue).
 */
export function canRemoveFamilyMember(
  member: FamilyMember,
  appointments: Appointment[]
): { allowed: boolean; reason?: string; upcomingIds: string[] } {
  const upcoming = appointments.filter(
    (a) =>
      a.family_member_id === member.id &&
      ['booked', 'checked_in', 'in_queue'].includes(a.status)
  );

  if (upcoming.length > 0) {
    return {
      allowed: false,
      reason: `${member.name} has ${upcoming.length} upcoming appointment${upcoming.length > 1 ? 's' : ''}. Cancel or complete them first.`,
      upcomingIds: upcoming.map((a) => a.id),
    };
  }

  return { allowed: true, upcomingIds: [] };
}

// ==========================================
// Password strength
// ==========================================

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  label: string;
  score: number; // 0-4
  checks: {
    length: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    minLength: boolean;
  };
}

/**
 * Evaluates password strength. Minimum requirements: 8+ chars, at least
 * one letter and one number.
 */
export function passwordStrength(pw: string): PasswordStrengthResult {
  const checks = {
    length: pw.length >= 8,
    minLength: pw.length >= 8,
    hasLetter: /[a-zA-Z]/.test(pw),
    hasNumber: /\d/.test(pw),
    hasSpecial: /[^a-zA-Z0-9]/.test(pw),
  };

  let score = 0;
  if (checks.length) score++;
  if (checks.hasLetter) score++;
  if (checks.hasNumber) score++;
  if (checks.hasSpecial) score++;

  const levels: [PasswordStrengthLevel, string][] = [
    ['weak', 'Weak'],
    ['weak', 'Weak'],
    ['fair', 'Fair'],
    ['good', 'Good'],
    ['strong', 'Strong'],
  ];

  const [level, label] = levels[score];

  return { level, label, score, checks };
}

// ==========================================
// Data export
// ==========================================

/**
 * Builds a JSON-serializable data export for a patient. Contains profile,
 * family members, appointments (own and dependents), reviews, and document
 * metadata (no file blobs).
 */
export function buildDataExport(
  patient: PatientUser,
  familyMembers: FamilyMember[],
  appointments: Appointment[],
  reviews: Review[],
  documents: MedicalDocument[]
): Record<string, unknown> {
  const myFamilyIds = new Set(
    familyMembers
      .filter((fm) => fm.user_id === patient.id)
      .map((fm) => fm.id)
  );

  const myAppointments = appointments.filter(
    (a) =>
      a.patient_id === patient.id ||
      (a.family_member_id && myFamilyIds.has(a.family_member_id))
  );

  const myAppointmentIds = new Set(myAppointments.map((a) => a.id));

  const myReviews = reviews.filter(
    (r) => r.patient_id === patient.id
  );

  const myDocuments = documents
    .filter((d) => d.patient_id === patient.id)
    .map(({ id, name, category, mime, size_bytes, uploaded_at, appointment_id, family_member_id }) => ({
      id,
      name,
      category,
      mime,
      size_bytes,
      uploaded_at,
      appointment_id,
      family_member_id,
    }));

  return {
    exported_at: new Date().toISOString(),
    profile: {
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      age: patient.age,
      gender: patient.gender,
      preferred_language: patient.preferred_language,
      is_verified: patient.is_verified,
      email_verified: patient.email_verified,
      created_at: patient.created_at,
    },
    family_members: familyMembers.filter((fm) => fm.user_id === patient.id),
    appointments: myAppointments.map((a) => ({
      ...a,
      // Exclude internal fields
    })),
    reviews: myReviews,
    documents_metadata: myDocuments,
    appointment_count: myAppointmentIds.size,
    review_count: myReviews.length,
    document_count: myDocuments.length,
  };
}

// ==========================================
// FAQ search
// ==========================================

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface FaqSearchResult {
  item: FaqItem;
  questionMatch: boolean;
  answerMatch: boolean;
  highlightedQuestion: string;
  highlightedAnswer: string;
}

/**
 * Client-side FAQ search. Matches in question are ranked first, then
 * answer-only matches. Highlights matching segments with <mark> tags.
 */
export function searchFaq(
  query: string,
  items: FaqItem[]
): FaqSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: FaqSearchResult[] = [];

  for (const item of items) {
    const questionLower = item.question.toLowerCase();
    const answerLower = item.answer.toLowerCase();
    const questionMatch = questionLower.includes(q);
    const answerMatch = answerLower.includes(q);

    if (questionMatch || answerMatch) {
      results.push({
        item,
        questionMatch,
        answerMatch,
        highlightedQuestion: highlightText(item.question, q),
        highlightedAnswer: highlightText(item.answer, q),
      });
    }
  }

  // Sort: question matches first
  results.sort((a, b) => {
    if (a.questionMatch && !b.questionMatch) return -1;
    if (!a.questionMatch && b.questionMatch) return 1;
    return 0;
  });

  return results;
}

function highlightText(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
