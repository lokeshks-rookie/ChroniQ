import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useHospitalStore } from '@/store/hospitalStore';
import {
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
} from '@/services/adminApi';
import {
  Plus,
  Edit2,
  Power,
  Users,
  Hash,
} from 'lucide-react';
import { DepartmentIcon } from '@/components/ui/DepartmentIcon';
import type { Department } from '@/types';

export const DepartmentsPage: React.FC = () => {
  const { departments, doctors, queue_entries } = useHospitalStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [tokenPrefix, setTokenPrefix] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [prefixError, setPrefixError] = useState('');

  // Deactivate dialog state
  const [deactivateErrorMsg, setDeactivateErrorMsg] = useState<string | null>(null);
  const [deactivateErrorModalOpen, setDeactivateErrorModalOpen] = useState(false);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setName('');
    setRoom('Room 101');
    setTokenPrefix('');
    setPrefixError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setRoom(dept.room || '');
    setTokenPrefix(dept.token_prefix);
    setPrefixError('');
    setModalOpen(true);
  };

  const handlePrefixChange = (val: string) => {
    const uppercase = val.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    setTokenPrefix(uppercase);

    // Live uniqueness check
    const isTaken = departments.some(
      (d) => d.token_prefix === uppercase && (!editingDept || d.id !== editingDept.id)
    );
    if (isTaken) {
      setPrefixError(`Prefix '${uppercase}' is already assigned to another department.`);
    } else if (uppercase.length < 2) {
      setPrefixError('Prefix must be 2 to 5 uppercase characters.');
    } else {
      setPrefixError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenPrefix.length < 2 || prefixError) {
      setPrefixError('Valid unique 2-5 letter prefix is required.');
      return;
    }

    setIsProcessing(true);
    try {
      if (editingDept) {
        await updateDepartment({
          ...editingDept,
          name,
          room,
          token_prefix: tokenPrefix,
        });
      } else {
        await createDepartment({
          name,
          room,
          token_prefix: tokenPrefix,
          is_active: true,
        });
      }
      setModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (dept: Department) => {
    const res = await toggleDepartmentStatus(dept.id);
    if (!res.success && res.reason) {
      setDeactivateErrorMsg(res.reason);
      setDeactivateErrorModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DEPARTMENTS"
        title="Clinical Departments & OPD Units"
        description="Configure departmental branches, assigned consultation chambers, and unique token prefixes."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            icon={<Plus className="w-4 h-4" />}
          >
            Add department
          </Button>
        }
      />

      {/* Grid of Department Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept) => {
          const deptDoctors = doctors.filter((d) => d.department_id === dept.id);
          const activeDocsCount = deptDoctors.filter((d) => d.is_active).length;
          const tokensToday = queue_entries.filter((q) => q.department_id === dept.id).length;
          const waitingCount = queue_entries.filter(
            (q) => q.department_id === dept.id && q.status === 'waiting'
          ).length;

          // Load percentage (max 20 tokens)
          const loadPct = Math.min(100, Math.round((waitingCount / 10) * 100));

          return (
            <Card key={dept.id} tilt padding="md" className="space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-card bg-cream text-ink flex items-center justify-center shrink-0 border border-ink/10 shadow-xs">
                      <DepartmentIcon name={dept.name} prefix={dept.token_prefix} className="w-5 h-5 text-ink" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-ink">{dept.name}</h3>
                      <p className="text-xs text-ink/65">{dept.room || 'General wing'}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      dept.is_active
                        ? 'bg-success/15 text-success border border-success/30'
                        : 'bg-ink/10 text-ink/60'
                    }`}
                  >
                    {dept.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-ink/10 text-xs">
                  <div className="p-2.5 rounded-card bg-ink/5 border border-ink/10 space-y-0.5">
                    <div className="text-ink/60 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>Doctors</span>
                    </div>
                    <div className="font-bold text-ink text-sm">
                      {activeDocsCount} <span className="font-normal text-xs text-ink/60">/ {deptDoctors.length}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-card bg-ink/5 border border-ink/10 space-y-0.5">
                    <div className="text-ink/60 flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      <span>Issued today</span>
                    </div>
                    <div className="font-bold text-ink text-sm font-mono">{tokensToday}</div>
                  </div>
                </div>

                {/* Load Bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-ink/70 font-medium">
                    <span>Queue load</span>
                    <span>{waitingCount} waiting ({loadPct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-ink/10 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${loadPct}%` }}
                      className={`h-full rounded-full transition-all ${
                        loadPct > 80 ? 'bg-danger' : loadPct > 50 ? 'bg-accent' : 'bg-ink'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-ink/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleActive(dept)}
                  className={`text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    dept.is_active ? 'text-ink/60 hover:text-danger' : 'text-success hover:underline'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{dept.is_active ? 'Deactivate' : 'Reactivate'}</span>
                </button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(dept)}
                  icon={<Edit2 className="w-3 h-3" />}
                >
                  Edit
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDept ? `Edit ${editingDept.name}` : 'Add New Department'}
        eyebrow="DEPARTMENT SETTINGS"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              isLoading={isProcessing}
              disabled={Boolean(prefixError)}
            >
              Save department
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <Input
            label="Department Name *"
            placeholder="e.g. Ophthalmology"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Chamber / Room Numbers"
            placeholder="e.g. Room 401–403"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />

          <div className="space-y-1.5">
            <Input
              label="Token Prefix (2–5 Uppercase letters) *"
              placeholder="e.g. OPHT"
              value={tokenPrefix}
              onChange={(e) => handlePrefixChange(e.target.value)}
              className="font-mono uppercase font-bold"
              error={prefixError}
              hint="Unique identifier prefix for all tokens generated in this department."
            />

            {tokenPrefix.length >= 2 && !prefixError && (
              <div className="p-3 bg-ink/5 border border-ink/10 rounded-card flex items-center justify-between text-xs">
                <span className="text-ink/70">Live Sequence Preview:</span>
                <span className="font-mono font-bold text-ink">
                  {tokenPrefix}-001, {tokenPrefix}-002 ...
                </span>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Deactivation Guard Error Modal */}
      <ConfirmDialog
        isOpen={deactivateErrorModalOpen}
        onClose={() => setDeactivateErrorModalOpen(false)}
        onConfirm={() => setDeactivateErrorModalOpen(false)}
        title="Department Deactivation Blocked"
        confirmLabel="I understand"
        description={deactivateErrorMsg || 'Cannot deactivate department.'}
      />
    </div>
  );
};
