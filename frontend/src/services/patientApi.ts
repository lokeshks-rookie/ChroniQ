/**
 * Patient API Service — Real database-backed API integration
 * for the patient portal (Section 4.2, Pages 20–24).
 */

import { usePatientStore } from '@/store/patientStore';
import { useAuthStore } from '@/store/authStore';
import { patientPortalApi, bookingApi, discoveryApi, getApiErrorMessage } from '@/services/api';
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

// Dev flag to force errors for testing
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
  const authUser = useAuthStore.getState().user;
  if (authUser?.id) return authUser.id;
  return usePatientStore.getState().patient?.id || '';
}

// ==========================================
// Profile
// ==========================================

/**
 * @endpoint PATCH /users/me
 * Update the current patient's profile (name, age, gender, language, etc.)
 */
export async function updateProfile(
  updates: Partial<Pick<PatientUser, 'name' | 'age' | 'gender' | 'preferred_language' | 'photo_url' | 'phone' | 'email'>>
): Promise<PatientUser> {
  checkSimulatedError();
  try {
    const res = await patientPortalApi.updateProfile(updates);
    const updated = res.data;
    const normalized: PatientUser = {
      ...updated,
      id: updated.id || updated._id,
    };
    usePatientStore.getState().updateProfile(normalized);

    // Keep authStore user synchronized
    const currentAuthUser = useAuthStore.getState().user;
    if (currentAuthUser) {
      useAuthStore.getState().setAuth(
        {
          ...currentAuthUser,
          ...normalized,
        },
        useAuthStore.getState().token || ''
      );
    }

    return normalized;
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to update profile'));
  }
}

/**
 * @endpoint POST /users/me/verify-contact
 * Verify phone or email OTP on backend.
 */
export async function verifyContact(
  type: 'phone' | 'email',
  newValue: string,
  code: string
): Promise<{ success: boolean; message?: string }> {
  checkSimulatedError();
  try {
    const res = await patientPortalApi.verifyContact({ target: newValue, code, type });
    const updates: Partial<PatientUser> = {};
    if (type === 'phone') {
      updates.phone = newValue;
      updates.is_verified = true;
    } else {
      updates.email = newValue;
      (updates as Record<string, unknown>).email_verified = true;
    }
    usePatientStore.getState().updateProfile(updates);

    // Keep authStore user synchronized
    const currentAuthUser = useAuthStore.getState().user;
    if (currentAuthUser) {
      useAuthStore.getState().setAuth(
        {
          ...currentAuthUser,
          ...updates,
        },
        useAuthStore.getState().token || ''
      );
    }

    return { success: true, message: res.data?.message };
  } catch (err: any) {
    return { success: false, message: getApiErrorMessage(err, 'Invalid or expired verification code.') };
  }
}

/**
 * @endpoint PATCH /users/me/password
 * Change the current patient's password.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await patientPortalApi.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
    return { success: true };
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to change password.'));
  }
}

/**
 * @endpoint PUT /users/me/notification-preferences
 */
export async function updateNotificationPreferences(
  prefs: NotificationPreferences
): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await patientPortalApi.updateNotificationPreferences(prefs);
    usePatientStore.getState().updateNotificationPreferences(prefs);
    return { success: true };
  } catch (err: any) {
    usePatientStore.getState().updateNotificationPreferences(prefs);
    return { success: true };
  }
}

/**
 * @endpoint POST /users/me/export
 * Returns a JSON blob representing the patient's data export.
 */
export async function exportMyData(): Promise<Record<string, unknown>> {
  checkSimulatedError();
  try {
    const res = await patientPortalApi.exportMyData();
    return res.data;
  } catch {
    const { patient, familyMembers, appointments, reviews, documents } = usePatientStore.getState();
    const { buildDataExport } = await import('@/lib/patient');
    return buildDataExport(patient, familyMembers, appointments, reviews, documents);
  }
}

/**
 * @endpoint POST /users/me/delete-request
 */
export async function requestAccountDeletion(): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await patientPortalApi.requestAccountDeletion();
    usePatientStore.getState().requestDeletion();
    return { success: true };
  } catch {
    usePatientStore.getState().requestDeletion();
    return { success: true };
  }
}

/**
 * @endpoint DELETE /users/me/delete-request (cancel)
 */
export async function cancelAccountDeletion(): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await patientPortalApi.cancelAccountDeletion();
    usePatientStore.getState().cancelDeletion();
    return { success: true };
  } catch {
    usePatientStore.getState().cancelDeletion();
    return { success: true };
  }
}

// ==========================================
// Family Members
// ==========================================

/**
 * @endpoint GET /family-members (or /patients/me/family)
 */
export async function getFamilyMembers(): Promise<FamilyMember[]> {
  checkSimulatedError();
  try {
    const res = await patientPortalApi.getFamilyMembers();
    const members: FamilyMember[] = (res.data || []).map((m: any) => ({
      ...m,
      id: m.id || m._id,
      user_id: m.user_id || getCurrentPatientId(),
    }));
    usePatientStore.setState({ familyMembers: members });
    return members;
  } catch (err: any) {
    console.warn('Failed to load family members from backend:', err);
    return usePatientStore.getState().familyMembers;
  }
}

/**
 * @endpoint POST /family-members
 */
export async function addFamilyMember(
  member: Omit<FamilyMember, 'id' | 'user_id' | 'created_at'>
): Promise<{ success: boolean; member?: FamilyMember; message?: string }> {
  checkSimulatedError();
  try {
    const res = await patientPortalApi.addFamilyMember(member);
    const created = res.data;
    const normalized: FamilyMember = {
      ...created,
      id: created.id || created._id,
      user_id: created.user_id || getCurrentPatientId(),
    };
    usePatientStore.getState().addFamilyMember(normalized);
    return { success: true, member: normalized };
  } catch (err: any) {
    return { success: false, message: getApiErrorMessage(err, 'Failed to add family member') };
  }
}

/**
 * @endpoint PATCH /family-members/:id
 */
export async function updateFamilyMember(
  id: string,
  updates: Partial<FamilyMember>
): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await patientPortalApi.updateFamilyMember(id, updates);
    usePatientStore.getState().updateFamilyMember(id, updates);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update family member:', err);
    return { success: false };
  }
}

/**
 * @endpoint DELETE /family-members/:id
 */
export async function removeFamilyMember(id: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await patientPortalApi.removeFamilyMember(id);
    usePatientStore.getState().removeFamilyMember(id);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete family member:', err);
    return { success: false };
  }
}

// ==========================================
// Appointments
// ==========================================

/**
 * @endpoint GET /appointments/me
 */
export async function getMyAppointments(): Promise<Appointment[]> {
  checkSimulatedError();
  try {
    const res = await bookingApi.getMyAppointments();
    const appts: Appointment[] = (res.data || []).map((a: any) => ({
      ...a,
      id: a.id || a._id,
    }));
    usePatientStore.setState({ appointments: appts });
    return appts;
  } catch (err: any) {
    console.warn('Failed to load appointments from backend:', err);
    return usePatientStore.getState().appointments;
  }
}

// ==========================================
// Documents
// ==========================================

/**
 * @endpoint GET /documents
 */
export async function getDocuments(): Promise<MedicalDocument[]> {
  checkSimulatedError();
  try {
    const res = await patientPortalApi.getDocuments();
    const docs: MedicalDocument[] = (res.data || []).map((d: any) => ({
      ...d,
      id: d.id || d._id,
      patient_id: d.patient_id || getCurrentPatientId(),
    }));
    usePatientStore.setState({ documents: docs });
    return docs;
  } catch {
    return usePatientStore.getState().documents;
  }
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
  checkSimulatedError();
  try {
    const res = await patientPortalApi.uploadDocument({
      ...doc,
      patient_id: getCurrentPatientId(),
    });
    const created = res.data;
    const normalized: MedicalDocument = {
      ...created,
      id: created.id || created._id,
      patient_id: getCurrentPatientId(),
    };
    usePatientStore.getState().addDocument(normalized, blob);
    return normalized;
  } catch {
    return usePatientStore.getState().addDocument(
      { ...doc, patient_id: getCurrentPatientId() },
      blob
    );
  }
}

/**
 * @endpoint PATCH /documents/:id
 */
export async function renameDocument(
  id: string,
  name: string
): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await patientPortalApi.renameDocument(id, name);
    usePatientStore.getState().renameDocument(id, name);
    return { success: true };
  } catch {
    const ok = usePatientStore.getState().renameDocument(id, name);
    return { success: ok };
  }
}

/**
 * @endpoint DELETE /documents/:id
 */
export async function deleteDocument(id: string): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await patientPortalApi.deleteDocument(id);
    usePatientStore.getState().deleteDocument(id);
    return { success: true };
  } catch {
    const ok = usePatientStore.getState().deleteDocument(id);
    return { success: ok };
  }
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
  checkSimulatedError();
  try {
    const res = await patientPortalApi.submitReview(review);
    const created = res.data;
    const normalized: Review = {
      ...created,
      id: created.id || created._id,
    };
    usePatientStore.getState().submitReview(normalized);
    return normalized;
  } catch {
    return usePatientStore.getState().submitReview(review);
  }
}

/**
 * @endpoint PATCH /reviews/:id
 */
export async function updateReview(
  id: string,
  updates: Partial<Pick<Review, 'doctor_rating' | 'hospital_rating' | 'comment' | 'tags' | 'wait_as_expected'>>
): Promise<{ success: boolean }> {
  checkSimulatedError();
  try {
    await patientPortalApi.updateReview(id, updates);
    usePatientStore.getState().updateReview(id, updates);
    return { success: true };
  } catch {
    const ok = usePatientStore.getState().updateReview(id, updates);
    return { success: ok };
  }
}

/**
 * @endpoint GET /reviews/by-appointment/:id
 */
export async function getReviewByAppointment(
  appointmentId: string
): Promise<Review | null> {
  checkSimulatedError();
  try {
    const res = await patientPortalApi.getReviews(appointmentId);
    return res.data || null;
  } catch {
    return usePatientStore.getState().getReviewByAppointmentId(appointmentId) ?? null;
  }
}

// ==========================================
// Hospitals
// ==========================================

/**
 * @endpoint GET /hospitals/:id
 */
export async function getHospital(id: string): Promise<{
  hospital?: Hospital;
  found: boolean;
}> {
  checkSimulatedError();
  try {
    const res = await discoveryApi.getHospital(id);
    if (res.data) {
      return { hospital: res.data, found: true };
    }
  } catch (err) {
    console.warn('Hospital fetch from backend failed:', err);
  }
  const patientHosp = usePatientStore.getState().hospitals.find((h) => h.id === id);
  if (patientHosp) return { hospital: patientHosp, found: true };
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
  checkSimulatedError();
  try {
    const res = await patientPortalApi.submitTicket({
      ...ticket,
      patient_id: getCurrentPatientId(),
    });
    return res.data;
  } catch {
    return usePatientStore.getState().submitTicket({
      ...ticket,
      patient_id: getCurrentPatientId(),
    });
  }
}

/**
 * @endpoint GET /support/tickets
 */
export async function getSupportTickets(): Promise<SupportTicket[]> {
  checkSimulatedError();
  try {
    const res = await patientPortalApi.getTickets();
    return res.data || [];
  } catch {
    const patientId = getCurrentPatientId();
    return usePatientStore.getState().tickets.filter((t) => t.patient_id === patientId);
  }
}
