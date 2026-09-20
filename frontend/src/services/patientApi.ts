/**
 * Patient API Service — async functions with simulated latency for the
 * patient portal (Section 4.2, Pages 20–24).
 *
 * Every function is scoped to the current patient and their dependents.
 * It must be impossible to read or write another patient's data through
 * this file.
 */

import { usePatientStore } from '@/store/patientStore';
import { useHospitalStore } from '@/store/hospitalStore';
import type {
  PatientUser,
  FamilyMember,
  Appointment,
  Review,
  MedicalDocument,
  SupportTicket,
  Hospital,
  NotificationPreferences,
  DocumentCategory,
} from '@/types';

// Simulated latency (250–600ms)
function delay(minMs = 250, maxMs = 600): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Dev flag to force errors
let shouldForceError = false;

export function setForcePatientApiError(force: boolean): void {
  shouldForceError = force;
}

function checkSimulatedError(): void {
  if (shouldForceError) {
    throw new Error('Simulated API Failure: server responded with status 500.');
  }
}

function getCurrentPatientId(): string {
  return usePatientStore.getState().patient.id;
}

function assertOwnership(appointment: Appointment | undefined): Appointment {
  if (!appointment || appointment.patient_id !== getCurrentPatientId()) {
    throw new Error('Access denied: appointment not found or not yours.');
  }
  return appointment;
}

// ==========================================
// Profile
// ==========================================

/**
 * @endpoint PATCH /users/me
 * Update the current patient's profile (name, age, gender, language, etc.)
 */
export async function updateProfile(
  updates: Partial<Pick<PatientUser, 'name' | 'age' | 'gender' | 'preferred_language' | 'photo_url'>>
): Promise<PatientUser> {
  await delay();
  checkSimulatedError();
  usePatientStore.getState().updateProfile(updates);
  return usePatientStore.getState().patient;
}

/**
 * @endpoint POST /users/me/verify-contact
 * Mock OTP verification for phone or email change.
 * Returns true if code matches '123456'.
 */
export async function verifyContact(
  type: 'phone' | 'email',
  newValue: string,
  code: string
): Promise<{ success: boolean; message?: string }> {
  await delay(400, 800);
  checkSimulatedError();

  if (code !== '123456') {
    return { success: false, message: 'Invalid code. Please try again.' };
  }

  const updates: Partial<PatientUser> = {};
  if (type === 'phone') {
    updates.phone = newValue;
    updates.is_verified = true;
  } else {
    updates.email = newValue;
    (updates as Record<string, unknown>).email_verified = true;
  }
  usePatientStore.getState().updateProfile(updates);
  return { success: true };
}

/**
 * @endpoint PATCH /users/me/password
 * Change the current patient's password (mock).
 */
export async function changePassword(
  _currentPassword: string,
  _newPassword: string
): Promise<{ success: boolean }> {
  await delay(300, 700);
  checkSimulatedError();
  usePatientStore.getState().setPatientPassword('mock_hash');
  return { success: true };
}

/**
 * @endpoint PUT /users/me/notification-preferences
 */
export async function updateNotificationPreferences(
  prefs: NotificationPreferences
): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  usePatientStore.getState().updateNotificationPreferences(prefs);
  return { success: true };
}

/**
 * @endpoint POST /users/me/export
 * Returns a JSON blob representing the patient's data export.
 */
export async function exportMyData(): Promise<Record<string, unknown>> {
  await delay(500, 1000);
  checkSimulatedError();
  const { patient, familyMembers, appointments, reviews, documents } =
    usePatientStore.getState();
  const { buildDataExport } = await import('@/lib/patient');
  return buildDataExport(patient, familyMembers, appointments, reviews, documents);
}

/**
 * @endpoint POST /users/me/delete-request
 */
export async function requestAccountDeletion(): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  usePatientStore.getState().requestDeletion();
  return { success: true };
}

/**
 * @endpoint DELETE /users/me/delete-request (cancel)
 */
export async function cancelAccountDeletion(): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  usePatientStore.getState().cancelDeletion();
  return { success: true };
}

// ==========================================
// Family Members
// ==========================================

/**
 * @endpoint GET /family-members
 */
export async function getFamilyMembers(): Promise<FamilyMember[]> {
  await delay();
  checkSimulatedError();
  const patientId = getCurrentPatientId();
  return usePatientStore
    .getState()
    .familyMembers.filter((fm) => fm.user_id === patientId);
}

/**
 * @endpoint POST /family-members
 */
export async function addFamilyMember(
  member: Omit<FamilyMember, 'id' | 'user_id' | 'created_at'>
): Promise<{ success: boolean; member?: FamilyMember; message?: string }> {
  await delay();
  checkSimulatedError();
  const result = usePatientStore.getState().addFamilyMember(member);
  if (!result) {
    return { success: false, message: 'Maximum of 6 family members reached.' };
  }
  return { success: true, member: result };
}

/**
 * @endpoint PATCH /family-members/:id
 */
export async function updateFamilyMember(
  id: string,
  updates: Partial<FamilyMember>
): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  const ok = usePatientStore.getState().updateFamilyMember(id, updates);
  return { success: ok };
}

/**
 * @endpoint DELETE /family-members/:id
 */
export async function removeFamilyMember(id: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  const ok = usePatientStore.getState().removeFamilyMember(id);
  return { success: ok };
}

// ==========================================
// Appointments
// ==========================================

/**
 * @endpoint GET /appointments/me
 */
export async function getMyAppointments(): Promise<Appointment[]> {
  await delay();
  checkSimulatedError();
  const patientId = getCurrentPatientId();

  // Combine patient store and hospital store appointments
  const patientAppts = usePatientStore.getState().appointments.filter(
    (a) => a.patient_id === patientId
  );

  // Also check hospital store for any appointments belonging to this patient
  const hospitalAppts = useHospitalStore.getState().appointments.filter(
    (a) => a.patient_id === patientId
  );

  // Merge, deduplicating by id
  const seen = new Set<string>();
  const merged: Appointment[] = [];
  for (const a of [...patientAppts, ...hospitalAppts]) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      merged.push(a);
    }
  }

  return merged;
}

// ==========================================
// Documents
// ==========================================

/**
 * @endpoint GET /documents
 */
export async function getDocuments(): Promise<MedicalDocument[]> {
  await delay();
  checkSimulatedError();
  const patientId = getCurrentPatientId();
  return usePatientStore.getState().documents.filter((d) => d.patient_id === patientId);
}

/**
 * @endpoint POST /documents
 */
export async function uploadDocument(
  doc: {
    name: string;
    category: DocumentCategory;
    family_member_id?: string;
    appointment_id?: string;
    mime: string;
    size_bytes: number;
  },
  blob?: Blob
): Promise<MedicalDocument> {
  await delay(400, 800);
  checkSimulatedError();
  return usePatientStore.getState().addDocument(
    { ...doc, patient_id: getCurrentPatientId() },
    blob
  );
}

/**
 * @endpoint PATCH /documents/:id
 */
export async function renameDocument(
  id: string,
  name: string
): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  const ok = usePatientStore.getState().renameDocument(id, name);
  return { success: ok };
}

/**
 * @endpoint DELETE /documents/:id
 */
export async function deleteDocument(id: string): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  const ok = usePatientStore.getState().deleteDocument(id);
  return { success: ok };
}

// ==========================================
// Reviews
// ==========================================

/**
 * @endpoint POST /reviews
 */
export async function submitReview(
  review: Omit<Review, 'id' | 'created_at' | 'updated_at'>
): Promise<Review> {
  await delay();
  checkSimulatedError();
  // Verify ownership
  const appt = usePatientStore
    .getState()
    .appointments.find((a) => a.id === review.appointment_id);
  assertOwnership(appt);
  return usePatientStore.getState().submitReview(review);
}

/**
 * @endpoint PATCH /reviews/:id
 */
export async function updateReview(
  id: string,
  updates: Partial<Pick<Review, 'doctor_rating' | 'hospital_rating' | 'comment' | 'tags' | 'wait_as_expected'>>
): Promise<{ success: boolean }> {
  await delay();
  checkSimulatedError();
  const ok = usePatientStore.getState().updateReview(id, updates);
  return { success: ok };
}

/**
 * @endpoint GET /reviews/by-appointment/:id
 */
export async function getReviewByAppointment(
  appointmentId: string
): Promise<Review | null> {
  await delay();
  checkSimulatedError();
  const review = usePatientStore.getState().getReviewByAppointmentId(appointmentId);
  return review ?? null;
}

// ==========================================
// Hospitals (read-only, for Help page etc.)
// ==========================================

/**
 * @endpoint GET /hospitals/:id
 */
export async function getHospital(id: string): Promise<{
  hospital?: Hospital;
  found: boolean;
}> {
  await delay(200, 400);
  checkSimulatedError();
  // Check patient hospitals first, then admin hospital
  const patientHosp = usePatientStore.getState().hospitals.find((h) => h.id === id);
  if (patientHosp) return { hospital: patientHosp, found: true };

  const adminHosp = useHospitalStore.getState().hospital;
  if (adminHosp.id === id) return { hospital: adminHosp, found: true };

  return { found: false };
}

// ==========================================
// Support Tickets
// ==========================================

/**
 * @endpoint POST /support/tickets
 */
export async function submitSupportTicket(
  ticket: Omit<SupportTicket, 'id' | 'reference' | 'created_at' | 'status' | 'patient_id'>
): Promise<SupportTicket> {
  await delay();
  checkSimulatedError();
  return usePatientStore.getState().submitTicket({
    ...ticket,
    patient_id: getCurrentPatientId(),
  });
}

/**
 * @endpoint GET /support/tickets
 */
export async function getSupportTickets(): Promise<SupportTicket[]> {
  await delay();
  checkSimulatedError();
  const patientId = getCurrentPatientId();
  return usePatientStore.getState().tickets.filter((t) => t.patient_id === patientId);
}
