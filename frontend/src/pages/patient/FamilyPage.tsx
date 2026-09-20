import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Calendar,
  AlertTriangle,
  User,
} from 'lucide-react';
import { usePatientStore } from '@/store/patientStore';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Dropdown } from '@/components/ui/Dropdown';
import { canRemoveFamilyMember } from '@/lib/patient';
import type { FamilyMember } from '@/types';

const RELATIONS: FamilyMember['relation'][] = [
  'spouse', 'son', 'daughter', 'father', 'mother', 'brother', 'sister', 'grandparent', 'other',
];

const RELATION_LABELS: Record<FamilyMember['relation'], string> = {
  spouse: 'Spouse',
  son: 'Son',
  daughter: 'Daughter',
  father: 'Father',
  mother: 'Mother',
  brother: 'Brother',
  sister: 'Sister',
  grandparent: 'Grandparent',
  other: 'Other',
};

const RELATION_ICONS: Record<FamilyMember['relation'], React.ReactNode> = {
  spouse: <Users className="w-5 h-5 text-ink/60" />,
  son: <User className="w-5 h-5 text-ink/60" />,
  daughter: <User className="w-5 h-5 text-ink/60" />,
  father: <User className="w-5 h-5 text-ink/60" />,
  mother: <User className="w-5 h-5 text-ink/60" />,
  brother: <User className="w-5 h-5 text-ink/60" />,
  sister: <User className="w-5 h-5 text-ink/60" />,
  grandparent: <User className="w-5 h-5 text-ink/60" />,
  other: <User className="w-5 h-5 text-ink/60" />,
};

interface MemberFormData {
  name: string;
  age: string;
  gender: string;
  relation: FamilyMember['relation'];
}

const EMPTY_FORM: MemberFormData = { name: '', age: '', gender: '', relation: 'spouse' };

export const FamilyPage: React.FC = () => {
  const { addToast } = useUiStore();
  const patient = usePatientStore((s) => s.patient);
  const familyMembers = usePatientStore((s) => s.familyMembers);
  const appointments = usePatientStore((s) => s.appointments);
  const addFamilyMember = usePatientStore((s) => s.addFamilyMember);
  const updateFamilyMember = usePatientStore((s) => s.updateFamilyMember);
  const removeFamilyMember = usePatientStore((s) => s.removeFamilyMember);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const myMembers = useMemo(
    () => familyMembers.filter((fm) => fm.user_id === patient.id),
    [familyMembers, patient.id]
  );

  const maxReached = myMembers.length >= 6;

  // ========== Form handlers ==========
  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError('');
    setEditingMember(null);
    setAddModalOpen(true);
  };

  const openEdit = (member: FamilyMember) => {
    setFormData({
      name: member.name,
      age: member.age?.toString() || '',
      gender: member.gender || '',
      relation: member.relation,
    });
    setFormError('');
    setEditingMember(member);
    setAddModalOpen(true);
  };

  const handleSubmit = () => {
    const name = formData.name.trim();
    if (!name) {
      setFormError('Name is required.');
      return;
    }
    if (name.length < 2) {
      setFormError('Name must be at least 2 characters.');
      return;
    }

    const age = formData.age ? parseInt(formData.age, 10) : undefined;
    if (formData.age && (isNaN(age!) || age! < 0 || age! > 120)) {
      setFormError('Enter a valid age (0–120).');
      return;
    }

    if (editingMember) {
      // Update
      const ok = updateFamilyMember(editingMember.id, {
        name,
        age,
        gender: formData.gender || undefined,
        relation: formData.relation,
      });
      if (ok) {
        addToast({ title: 'Member updated', description: `${name}'s details saved.`, variant: 'success' });
        setAddModalOpen(false);
      }
    } else {
      // Add
      const result = addFamilyMember({
        name,
        age,
        gender: formData.gender || undefined,
        relation: formData.relation,
      });
      if (result) {
        addToast({ title: 'Member added', description: `${name} added to your family.`, variant: 'success' });
        setAddModalOpen(false);
      } else {
        setFormError('Maximum of 6 family members reached.');
      }
    }
  };

  const handleDelete = (id: string) => {
    const member = myMembers.find((m) => m.id === id);
    if (!member) return;

    const check = canRemoveFamilyMember(member, appointments);
    if (!check.allowed) {
      addToast({ title: 'Cannot remove', description: check.reason || 'Has upcoming appointments.', variant: 'danger' });
      setDeleteConfirmId(null);
      return;
    }

    removeFamilyMember(id);
    setDeleteConfirmId(null);
    addToast({ title: 'Member removed', description: `${member.name} removed from your family.`, variant: 'success' });
  };

  // ========== Get upcoming count for a member ==========
  const getUpcomingCount = (memberId: string) =>
    appointments.filter(
      (a) => a.family_member_id === memberId && ['booked', 'checked_in', 'in_queue'].includes(a.status)
    ).length;

  const getPastCount = (memberId: string) =>
    appointments.filter(
      (a) => a.family_member_id === memberId && a.status === 'completed'
    ).length;

  const deleteTarget = myMembers.find((m) => m.id === deleteConfirmId);
  const deleteCheck = deleteTarget ? canRemoveFamilyMember(deleteTarget, appointments) : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '8px' }}>Family members</h1>
          <p className="text-sm text-muted mt-1">
            {myMembers.length} of 6 members · Book appointments for your dependents
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<UserPlus className="w-4 h-4" strokeWidth={1.75} />}
          onClick={openAdd}
          disabled={maxReached}
        >
          Add
        </Button>
      </div>

      {maxReached && (
        <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-card text-xs text-muted">
          <AlertTriangle className="w-4 h-4 text-accent shrink-0" strokeWidth={1.75} />
          Maximum of 6 family members reached.
        </div>
      )}

      {/* Member list */}
      {myMembers.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Users className="w-10 h-10 mx-auto text-muted/50" strokeWidth={1.5} />
          <p className="text-sm text-muted">No family members added yet.</p>
          <p className="text-xs text-muted">Add your dependents to book appointments on their behalf.</p>
          <Button variant="secondary" onClick={openAdd}>
            Add first member
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {myMembers.map((member) => {
            const upcoming = getUpcomingCount(member.id);
            const past = getPastCount(member.id);

            return (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 bg-base border border-ink/10 rounded-card hover:shadow-sm transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-cream/20 flex items-center justify-center shrink-0">
                  {RELATION_ICONS[member.relation] || <User className="w-5 h-5 text-ink/60" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink truncate">{member.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cream/20 text-muted capitalize shrink-0">
                      {RELATION_LABELS[member.relation]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted mt-1">
                    {member.age !== undefined && <span>Age {member.age}</span>}
                    {member.gender && <span className="capitalize">{member.gender}</span>}
                    {upcoming > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" strokeWidth={1.75} />
                        {upcoming} upcoming
                      </span>
                    )}
                    {past > 0 && <span>{past} past visit{past > 1 ? 's' : ''}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(member)}
                    className="p-2 rounded-lg hover:bg-ink/5 transition-colors cursor-pointer"
                    aria-label={`Edit ${member.name}`}
                  >
                    <Pencil className="w-4 h-4 text-muted" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(member.id)}
                    className="p-2 rounded-lg hover:bg-danger/10 transition-colors cursor-pointer"
                    aria-label={`Remove ${member.name}`}
                  >
                    <Trash2 className="w-4 h-4 text-danger" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={editingMember ? 'Edit family member' : 'Add family member'}
        eyebrow={editingMember ? 'EDIT MEMBER' : 'NEW MEMBER'}
        maxWidth="sm"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="secondary" onClick={() => setAddModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} className="flex-1">
              {editingMember ? 'Save changes' : 'Add member'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && (
            <p className="text-sm text-danger" role="alert">{formError}</p>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">
              Full name <span className="text-danger">*</span>
            </label>
            <input
              value={formData.name}
              onChange={(e) => { setFormData((f) => ({ ...f, name: e.target.value })); setFormError(''); }}
              placeholder="Enter full name"
              className="w-full h-12 px-4 bg-base border border-ink/15 rounded-card text-sm text-ink placeholder:text-muted/60
                         focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Age</label>
              <input
                type="number"
                min={0}
                max={120}
                value={formData.age}
                onChange={(e) => { setFormData((f) => ({ ...f, age: e.target.value })); setFormError(''); }}
                placeholder="Optional"
                className="w-full h-12 px-4 bg-base border border-ink/15 rounded-card text-sm text-ink placeholder:text-muted/60
                           focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Gender</label>
              <Dropdown
                value={formData.gender}
                onChange={(val) => setFormData((f) => ({ ...f, gender: val as any }))}
                placeholder="Optional"
                options={[
                  { value: '', label: 'Optional' },
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
            <label className="text-xs font-medium text-muted uppercase tracking-wider">
              Relationship <span className="text-danger">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {RELATIONS.map((rel) => (
                <button
                  key={rel}
                  type="button"
                  onClick={() => setFormData((f) => ({ ...f, relation: rel }))}
                  className={`h-10 px-3 rounded-full text-xs font-medium transition-all cursor-pointer select-none
                    ${formData.relation === rel
                      ? 'bg-accent text-ink'
                      : 'bg-transparent border border-ink/15 text-ink hover:bg-ink/5'
                    }`}
                >
                  {RELATION_ICONS[rel]} {RELATION_LABELS[rel]}
                </button>
              ))}
            </div>
          </div>

          {!editingMember && (
            <p className="text-xs text-muted">
              By adding a family member, you confirm that you have their consent to book
              medical appointments on their behalf.
            </p>
          )}
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={deleteTarget ? `Remove ${deleteTarget.name}?` : 'Remove member?'}
        eyebrow="CONFIRM REMOVAL"
        maxWidth="sm"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="secondary" onClick={() => setDeleteConfirmId(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteCheck !== null && !deleteCheck.allowed}
              className="flex-1"
            >
              Remove
            </Button>
          </div>
        }
      >
        {deleteCheck && !deleteCheck.allowed ? (
          <div className="flex items-start gap-3 p-3 bg-danger/10 rounded-card">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" strokeWidth={1.75} />
            <p className="text-sm text-ink">{deleteCheck.reason}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            {deleteTarget?.name} will be removed from your family members list. Past appointment
            records will be preserved.
          </p>
        )}
      </Modal>
    </div>
  );
};
