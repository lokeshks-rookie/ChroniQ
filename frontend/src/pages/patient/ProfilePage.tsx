import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  Phone,
  Shield,
  Bell,
  Key,
  Download,
  Trash2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Plus,
} from 'lucide-react';
import { usePatientStore } from '@/store/patientStore';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Dropdown } from '@/components/ui/Dropdown';
import { OtpModal } from '@/components/patient/OtpModal';
import { passwordStrength } from '@/lib/patient';
import * as patientApi from '@/services/patientApi';
import type { NotificationType, NotificationChannelPreference, NotificationPreferences } from '@/types';

// Notification type labels
const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  booking_confirmed: 'Booking confirmed',
  reminder: 'Appointment reminders',
  doctor_delayed: 'Doctor delay alerts',
  queue_update: 'Queue position updates',
  you_are_next: '"You\'re next" alert',
  cancelled: 'Cancellation notices',
  rescheduled: 'Reschedule notices',
  system: 'System updates',
};

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'ml', label: 'മലയാളം (Malayalam)' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
];

type Section = 'main' | 'edit-profile' | 'notifications' | 'password' | 'data-export' | 'delete-account';

export const ProfilePage: React.FC = () => {
  const { addToast } = useUiStore();
  const patient = usePatientStore((s) => s.patient);
  const authUser = useAuthStore((s) => s.user);

  // Fetch real patient profile from backend on mount
  useEffect(() => {
    usePatientStore.getState().fetchPatientData();
  }, []);

  const [section, setSection] = useState<Section>('main');

  // Edit profile state
  const [editName, setEditName] = useState(patient.name || authUser?.name || '');
  const [editPhone, setEditPhone] = useState(patient.phone || authUser?.phone || '');
  const [editAge, setEditAge] = useState(patient.age?.toString() || authUser?.age?.toString() || '');
  const [editGender, setEditGender] = useState(patient.gender || authUser?.gender || '');
  const [editLanguage, setEditLanguage] = useState(patient.preferred_language || 'en');
  const [savingProfile, setSavingProfile] = useState(false);

  // Synchronize edit fields when patient or authUser state changes
  useEffect(() => {
    setEditName(patient.name || authUser?.name || '');
    setEditPhone(patient.phone || authUser?.phone || '');
    setEditAge(patient.age?.toString() || authUser?.age?.toString() || '');
    setEditGender(patient.gender || authUser?.gender || '');
    setEditLanguage(patient.preferred_language || 'en');
    if (patient.notification_preferences) {
      setNotifPrefs(patient.notification_preferences);
    }
  }, [patient, authUser]);

  // Contact change state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpType, setOtpType] = useState<'phone' | 'email'>('phone');
  const [newContactValue, setNewContactValue] = useState('');
  const [editingContact, setEditingContact] = useState<'phone' | 'email' | null>(null);

  // Password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  // Notification prefs state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(patient.notification_preferences);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Data export
  const [exporting, setExporting] = useState(false);

  // Delete account
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const pwStrength = useMemo(() => passwordStrength(newPw), [newPw]);

  // ========== Profile save ==========
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      addToast({ title: 'Name required', variant: 'danger' });
      return;
    }
    setSavingProfile(true);
    try {
      await patientApi.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        age: editAge ? parseInt(editAge, 10) : undefined,
        gender: editGender || undefined,
        preferred_language: editLanguage,
      });
      addToast({ title: 'Profile updated', variant: 'success' });
      setSection('main');
    } catch (err: any) {
      addToast({ title: err?.message || 'Failed to save', variant: 'danger' });
    } finally {
      setSavingProfile(false);
    }
  };


  // ========== Contact change ==========
  const handleContactEdit = (type: 'phone' | 'email') => {
    setOtpType(type);
    setNewContactValue(type === 'phone' ? (patient.phone || '') : (patient.email || ''));
    setEditingContact(type);
  };

  const handleContactSubmit = () => {
    if (!newContactValue.trim()) return;
    setEditingContact(null);
    setOtpModalOpen(true);
  };

  const handleOtpVerify = async (code: string) => {
    return patientApi.verifyContact(otpType, newContactValue, code);
  };

  // ========== Password change ==========
  const handleChangePassword = async () => {
    setPwError('');
    if (!currentPw) { setPwError('Enter your current password.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (!pwStrength.checks.hasLetter || !pwStrength.checks.hasNumber) {
      setPwError('Password must contain at least one letter and one number.');
      return;
    }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }

    setChangingPw(true);
    try {
      await patientApi.changePassword(currentPw, newPw);
      addToast({ title: 'Password changed', variant: 'success' });
      setSection('main');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      setPwError('Failed to change password. Try again.');
    } finally {
      setChangingPw(false);
    }
  };

  // ========== Notification prefs ==========
  const toggleChannel = (type: NotificationType, channel: keyof NotificationChannelPreference) => {
    setNotifPrefs((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [type]: {
          ...prev.channels[type],
          [channel]: !prev.channels[type][channel],
        },
      },
    }));
  };

  const handleSaveNotifications = async () => {
    setSavingNotifs(true);
    try {
      await patientApi.updateNotificationPreferences(notifPrefs);
      addToast({ title: 'Preferences saved', variant: 'success' });
      setSection('main');
    } catch {
      addToast({ title: 'Failed to save', variant: 'danger' });
    } finally {
      setSavingNotifs(false);
    }
  };

  // ========== Data export ==========
  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await patientApi.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chroniq_data_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ title: 'Data exported', description: 'Check your downloads folder.', variant: 'success' });
    } catch {
      addToast({ title: 'Export failed', variant: 'danger' });
    } finally {
      setExporting(false);
    }
  };

  // ========== Delete account ==========
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await patientApi.requestAccountDeletion();
      addToast({
        title: 'Deletion requested',
        description: 'Your account will be deleted in 30 days. You can cancel before then.',
        variant: 'info',
      });
      setDeleteConfirmOpen(false);
    } catch {
      addToast({ title: 'Failed', variant: 'danger' });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await patientApi.cancelAccountDeletion();
      addToast({ title: 'Deletion cancelled', variant: 'success' });
    } catch {
      addToast({ title: 'Failed', variant: 'danger' });
    }
  };

  // ========== Strength bar color ==========
  const strengthColors = {
    weak: 'bg-danger',
    fair: 'bg-accent',
    good: 'bg-info',
    strong: 'bg-success',
  };

  // ========== MAIN SECTION ==========
  if (section === 'main') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-ink">Your profile</h1>
        </div>

        {/* Profile card */}
        <div className="bg-base border border-ink/10 rounded-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-cream/30 flex items-center justify-center text-2xl font-medium text-ink shrink-0 overflow-hidden">
              {patient.photo_url ? (
                <img src={patient.photo_url} alt={patient.name} className="w-full h-full object-cover" />
              ) : (
                patient.name ? patient.name.charAt(0).toUpperCase() : 'U'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-medium text-ink">{patient.name || 'Your profile'}</h2>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
                {patient.age ? <span>Age {patient.age}</span> : null}
                {patient.gender ? <span className="capitalize">{patient.gender}</span> : null}
                <span>
                  {LANGUAGE_OPTIONS.find((l) => l.value === patient.preferred_language)?.label || patient.preferred_language}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 border-t border-ink/5">
              <span className="text-muted flex items-center gap-2">
                <Phone className="w-4 h-4" strokeWidth={1.75} />
                Phone
              </span>
              <div className="flex items-center gap-2">
                <span className="text-ink">{patient.phone || 'Not provided'}</span>
                {patient.phone && patient.is_verified ? (
                  <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={1.75} />
                ) : null}
                {!patient.phone && (
                  <button
                    onClick={() => setSection('edit-profile')}
                    className="text-xs text-accent font-medium hover:underline cursor-pointer flex items-center gap-1 ml-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add phone
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-ink/5">
              <span className="text-muted flex items-center gap-2">
                <Mail className="w-4 h-4" strokeWidth={1.75} />
                Email
              </span>
              <div className="flex items-center gap-2">
                <span className="text-ink">{patient.email || 'Not provided'}</span>
                {patient.email && patient.email_verified ? (
                  <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={1.75} />
                ) : null}
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />}
            onClick={() => setSection('edit-profile')}
            className="w-full"
          >
            Edit profile
          </Button>
        </div>


        {/* Deletion pending warning */}
        {patient.deletion_requested_at && (
          <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-card">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">Account deletion pending</p>
              <p className="text-xs text-muted mt-0.5">
                Your account is scheduled for deletion. All data will be permanently removed within 30 days.
              </p>
              <button
                onClick={handleCancelDeletion}
                className="text-xs text-accent font-medium mt-2 hover:underline cursor-pointer"
              >
                Cancel deletion request
              </button>
            </div>
          </div>
        )}

        {/* Menu items */}
        <div className="space-y-1">
          {([
            { id: 'notifications' as Section, icon: Bell, label: 'Notification preferences', desc: 'Manage alerts, reminders and channels' },
            { id: 'password' as Section, icon: Key, label: 'Change password', desc: 'Update your login password' },
            { id: 'data-export' as Section, icon: Download, label: 'Export your data', desc: 'Download a copy of your records' },
            { id: 'delete-account' as Section, icon: Trash2, label: 'Delete account', desc: 'Permanently remove your account', danger: true },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'data-export') handleExport();
                else if (item.id === 'delete-account') setDeleteConfirmOpen(true);
                else setSection(item.id);
              }}
              disabled={item.id === 'data-export' && exporting}
              className={`w-full flex items-center gap-4 p-4 rounded-card border border-ink/10 hover:bg-ink/[0.02] transition-colors cursor-pointer text-left ${
                'danger' in item && item.danger ? 'hover:border-danger/30' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                'danger' in item && item.danger ? 'bg-danger/10' : 'bg-cream/20'
              }`}>
                <item.icon className={`w-5 h-5 ${'danger' in item && item.danger ? 'text-danger' : 'text-muted'}`} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${'danger' in item && item.danger ? 'text-danger' : 'text-ink'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
              {item.id !== 'data-export' && item.id !== 'delete-account' && (
                <ChevronRight className="w-4 h-4 text-muted shrink-0" strokeWidth={1.75} />
              )}
              {item.id === 'data-export' && exporting && (
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Account info */}
        <div className="text-xs text-muted space-y-1 pt-2">
          <p>
            Member since{' '}
            {patient.created_at
              ? new Date(patient.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
              : 'Recently'}
          </p>
          <p className="flex items-center gap-1">
            <Shield className="w-3 h-3" strokeWidth={1.75} />
            {patient.phone ? (patient.is_verified ? 'Phone verified' : 'Phone unverified') : 'No phone linked'} ·{' '}
            {patient.email_verified ? 'Email verified' : 'Email not verified'}
          </p>
        </div>


        {/* Delete confirmation modal */}
        <Modal
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          title="Delete your account?"
          eyebrow="DANGER ZONE"
          maxWidth="sm"
          footer={
            <div className="flex gap-3 w-full">
              <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteAccount} isLoading={deletingAccount} className="flex-1">
                Delete account
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-danger/10 rounded-card">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="text-sm text-ink">
                <p className="font-medium">This action is irreversible.</p>
                <p className="text-muted mt-1">
                  All your appointments, reviews, documents, and family member data will be
                  permanently deleted within 30 days.
                </p>
              </div>
            </div>
          </div>
        </Modal>

        {/* OTP modal for contact changes */}
        <OtpModal
          isOpen={otpModalOpen}
          onClose={() => setOtpModalOpen(false)}
          type={otpType}
          target={newContactValue}
          onVerify={handleOtpVerify}
        />
      </div>
    );
  }

  // ========== EDIT PROFILE ==========
  if (section === 'edit-profile') {
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setSection('main')} className="text-sm text-accent hover:underline cursor-pointer mb-2">
            ← Back to profile
          </button>
          <h1 className="text-2xl font-medium text-ink">Edit profile</h1>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Full name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your full name"
              className="w-full h-12 px-4 bg-base border border-ink/15 rounded-card text-sm text-ink
                         focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Phone number</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full h-12 px-4 bg-base border border-ink/15 rounded-card text-sm text-ink
                           focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Email address</label>
              <input
                type="email"
                value={patient.email || ''}
                disabled
                title="Email is managed via authentication"
                className="w-full h-12 px-4 bg-ink/[0.03] border border-ink/10 rounded-card text-sm text-ink/70 cursor-not-allowed outline-none"
              />
            </div>
          </div>


          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Age</label>
              <input
                type="number"
                min={0}
                max={120}
                value={editAge}
                onChange={(e) => setEditAge(e.target.value)}
                className="w-full h-12 px-4 bg-base border border-ink/15 rounded-card text-sm text-ink
                           focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Gender</label>
              <Dropdown
                value={editGender}
                onChange={(val) => setEditGender(val)}
                placeholder="Not specified"
                options={[
                  { value: '', label: 'Not specified' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                width="w-full"
                className="w-full"
                triggerClassName="w-full justify-between h-12 px-4 rounded-card"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Preferred language</label>
            <Dropdown
              value={editLanguage}
              onChange={(val) => setEditLanguage(val)}
              placeholder="Select language"
              options={LANGUAGE_OPTIONS.map((lang) => ({
                value: lang.value,
                label: lang.label,
              }))}
              width="w-full"
              className="w-full"
              triggerClassName="w-full justify-between h-12 px-4 rounded-card"
            />
          </div>

          {/* Contact change section */}
          <div className="space-y-3 pt-4 border-t border-ink/10">
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Contact details</p>

            <div className="flex items-center justify-between p-3 bg-ink/[0.02] rounded-card">
              <div>
                <p className="text-xs text-muted">Phone</p>
                {editingContact === 'phone' ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      value={newContactValue}
                      onChange={(e) => setNewContactValue(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="h-10 px-3 bg-base border border-ink/15 rounded-sm text-sm outline-none focus:border-accent w-48"
                    />
                    <Button variant="primary" size="sm" onClick={handleContactSubmit}>Verify</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingContact(null)}>Cancel</Button>
                  </div>
                ) : (
                  <p className="text-sm text-ink">{patient.phone}</p>
                )}
              </div>
              {editingContact !== 'phone' && (
                <button
                  onClick={() => handleContactEdit('phone')}
                  className="text-xs text-accent font-medium hover:underline cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-ink/[0.02] rounded-card">
              <div>
                <p className="text-xs text-muted">Email</p>
                {editingContact === 'email' ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="email"
                      value={newContactValue}
                      onChange={(e) => setNewContactValue(e.target.value)}
                      placeholder="you@example.com"
                      className="h-10 px-3 bg-base border border-ink/15 rounded-sm text-sm outline-none focus:border-accent w-48"
                    />
                    <Button variant="primary" size="sm" onClick={handleContactSubmit}>Verify</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingContact(null)}>Cancel</Button>
                  </div>
                ) : (
                  <p className="text-sm text-ink">{patient.email || 'Not set'}</p>
                )}
              </div>
              {editingContact !== 'email' && (
                <button
                  onClick={() => handleContactEdit('email')}
                  className="text-xs text-accent font-medium hover:underline cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={() => setSection('main')} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveProfile} isLoading={savingProfile} className="flex-1">
            Save changes
          </Button>
        </div>

        <OtpModal
          isOpen={otpModalOpen}
          onClose={() => setOtpModalOpen(false)}
          type={otpType}
          target={newContactValue}
          onVerify={handleOtpVerify}
        />
      </div>
    );
  }

  // ========== NOTIFICATIONS ==========
  if (section === 'notifications') {
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setSection('main')} className="text-sm text-accent hover:underline cursor-pointer mb-2">
            ← Back to profile
          </button>
          <h1 className="text-2xl font-medium text-ink">Notification preferences</h1>
          <p className="text-sm text-muted mt-1">Choose how you receive alerts for each notification type.</p>
        </div>

        {/* Reminder toggles */}
        <div className="bg-base border border-ink/10 rounded-card p-4 space-y-3">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">Reminders</p>
          {([
            { key: 'reminder_24h' as const, label: '24-hour reminder before appointment' },
            { key: 'reminder_1h' as const, label: '1-hour reminder before appointment' },
          ]).map((item) => (
            <label key={item.key} className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-sm text-ink">{item.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={notifPrefs[item.key]}
                onClick={() => setNotifPrefs((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  notifPrefs[item.key] ? 'bg-accent' : 'bg-ink/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-base shadow transition-transform ${
                    notifPrefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>

        {/* Channel matrix */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">Channels per notification type</p>
          <div className="bg-base border border-ink/10 rounded-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-ink/10 bg-ink/[0.02]">
              <div className="text-xs font-medium text-muted">Type</div>
              <div className="text-xs font-medium text-muted text-center">In-app</div>
              <div className="text-xs font-medium text-muted text-center">Email</div>
              <div className="text-xs font-medium text-muted text-center">SMS</div>
            </div>
            {(Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]).map((type) => {
              const pref = notifPrefs.channels[type];
              if (!pref) return null;
              return (
                <div key={type} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-ink/5 last:border-b-0">
                  <div className="text-sm text-ink">{NOTIFICATION_TYPE_LABELS[type]}</div>
                  {(['in_app', 'email', 'sms'] as const).map((ch) => (
                    <div key={ch} className="flex items-center justify-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={pref[ch]}
                        aria-label={`${NOTIFICATION_TYPE_LABELS[type]} via ${ch}`}
                        onClick={() => toggleChannel(type, ch)}
                        className={`w-8 h-5 rounded-full transition-colors cursor-pointer ${
                          pref[ch] ? 'bg-accent' : 'bg-ink/15'
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-base shadow transition-transform mx-0.5 mt-0.5 ${
                            pref[ch] ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setSection('main')} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveNotifications} isLoading={savingNotifs} className="flex-1">
            Save preferences
          </Button>
        </div>
      </div>
    );
  }

  // ========== PASSWORD ==========
  if (section === 'password') {
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setSection('main')} className="text-sm text-accent hover:underline cursor-pointer mb-2">
            ← Back to profile
          </button>
          <h1 className="text-2xl font-medium text-ink">Change password</h1>
        </div>

        <div className="space-y-4 max-w-sm">
          {pwError && (
            <p className="text-sm text-danger" role="alert">{pwError}</p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Current password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full h-12 px-4 bg-base border border-ink/15 rounded-card text-sm text-ink
                         focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">New password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => { setNewPw(e.target.value); setPwError(''); }}
              className="w-full h-12 px-4 bg-base border border-ink/15 rounded-card text-sm text-ink
                         focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
            />
            {newPw && (
              <div className="space-y-1.5 mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < pwStrength.score ? strengthColors[pwStrength.level] : 'bg-ink/10'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  pwStrength.level === 'weak' ? 'text-danger' :
                  pwStrength.level === 'fair' ? 'text-accent' :
                  pwStrength.level === 'good' ? 'text-info' : 'text-success'
                }`}>
                  {pwStrength.label}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Confirm new password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => { setConfirmPw(e.target.value); setPwError(''); }}
              className="w-full h-12 px-4 bg-base border border-ink/15 rounded-card text-sm text-ink
                         focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-3 max-w-sm">
          <Button variant="secondary" onClick={() => setSection('main')} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleChangePassword} isLoading={changingPw} className="flex-1">
            Change password
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
