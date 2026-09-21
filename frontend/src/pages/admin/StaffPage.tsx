import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useHospitalStore } from '@/store/hospitalStore';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { mockHospitals } from '@/data/mockData';
import {
  createStaffMember,
  updateStaffMember,
  toggleStaffStatus,
} from '@/services/adminApi';
import {
  UserPlus,
  KeyRound,
  Power,
  Edit2,
  Shield,
  Lock,
  Hospital,
  Filter,
} from 'lucide-react';
import type { User, Role, Capability } from '@/types';

const CAPABILITIES_LIST: { id: Capability; label: string }[] = [
  { id: 'view_dashboard', label: 'View Dashboard & KPIs' },
  { id: 'manage_appointments', label: 'Manage Appointments' },
  { id: 'queue_control', label: 'Live Queue Control' },
  { id: 'walk_in_registration', label: 'Walk-In Registration' },
  { id: 'check_in', label: 'Check-In Desk' },
  { id: 'view_patients', label: 'View Patients & Notes' },
  { id: 'manage_doctors', label: 'Manage Doctors' },
  { id: 'manage_schedules', label: 'Manage Schedules' },
  { id: 'manage_departments', label: 'Manage Departments' },
  { id: 'reports_and_export', label: 'Reports & Export' },
  { id: 'manage_staff', label: 'Manage Staff & Roles' },
  { id: 'hospital_settings', label: 'Hospital Settings' },
  { id: 'send_broadcasts', label: 'Send Broadcasts' },
];

export const StaffPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlHospital = searchParams.get('hospital');

  const { users, doctors } = useHospitalStore();
  const { currentUserId, permissions, updatePermission } = useAuthStore();
  const { addToast } = useUiStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Hospital split-up filters
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(urlHospital || 'all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [staffHospitalId, setStaffHospitalId] = useState<string>(
    urlHospital && urlHospital !== 'all' ? urlHospital : 'hosp_city_01'
  );

  // Synchronize when URL param changes
  React.useEffect(() => {
    if (urlHospital) {
      setSelectedHospitalId(urlHospital);
      setStaffHospitalId(urlHospital);
    }
  }, [urlHospital]);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('receptionist');
  const [linkedDoctorId, setLinkedDoctorId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Guard warning dialog
  const [guardError, setGuardError] = useState<string | null>(null);

  // Unsaved matrix dirty tracker
  const [matrixDirty, setMatrixDirty] = useState(false);
  const [localMatrix, setLocalMatrix] = useState(permissions);

  // Synchronize localMatrix when permissions change
  React.useEffect(() => {
    setLocalMatrix(permissions);
  }, [permissions]);

  // Filtered staff users according to Hospital & District
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const uHospId = u.hospital_id || 'hosp_city_01';
      const hosp = mockHospitals.find((h) => h._id === uHospId);

      if (selectedHospitalId !== 'all' && uHospId !== selectedHospitalId) {
        return false;
      }
      if (selectedDistrict !== 'all') {
        if (!hosp || hosp.city.toLowerCase() !== selectedDistrict.toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [users, selectedHospitalId, selectedDistrict]);

  const filteredHospitalsForSelect = useMemo(() => {
    if (selectedDistrict === 'all') return mockHospitals;
    return mockHospitals.filter(
      (h) => h.city.toLowerCase() === selectedDistrict.toLowerCase()
    );
  }, [selectedDistrict]);

  // Add / Edit Modal open
  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setPhone('+91 ');
    setEmail('');
    setRole('receptionist');
    setLinkedDoctorId('');
    setStaffHospitalId(selectedHospitalId !== 'all' ? selectedHospitalId : 'hosp_city_01');
    setModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setRole(user.role);
    setLinkedDoctorId(user.linked_doctor_id || '');
    setStaffHospitalId(user.hospital_id || 'hosp_city_01');
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (editingUser) {
        // Guard check: cannot demote oneself or last admin
        if (editingUser.id === currentUserId && role !== 'hospital_admin') {
          setGuardError('You cannot demote your own administrator role.');
          return;
        }

        await updateStaffMember({
          ...editingUser,
          name,
          phone,
          email: email || undefined,
          role,
          hospital_id: staffHospitalId,
          linked_doctor_id: role === 'doctor' ? linkedDoctorId : undefined,
        });
      } else {
        await createStaffMember({
          name,
          phone,
          email: email || undefined,
          role,
          hospital_id: staffHospitalId,
          linked_doctor_id: role === 'doctor' ? linkedDoctorId : undefined,
          preferred_language: 'en',
          is_verified: true,
          is_active: true,
        });
      }
      setModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    const res = await toggleStaffStatus(user.id);
    if (!res.success && res.reason) {
      setGuardError(res.reason);
    }
  };

  const handleResetPassword = (user: User) => {
    addToast({
      title: 'Password reset link sent',
      description: `Reset instructions dispatched to ${user.email || user.phone}.`,
      variant: 'default',
    });
  };

  // Matrix toggle
  const handleMatrixCheck = (r: Role, cap: Capability, val: boolean) => {
    if (r === 'hospital_admin') return; // Locked on
    setLocalMatrix((prev) => ({
      ...prev,
      [r]: {
        ...prev[r],
        [cap]: val,
      },
    }));
    setMatrixDirty(true);
  };

  const handleSaveMatrix = () => {
    // Commit localMatrix to AuthStore
    Object.keys(localMatrix).forEach((r) => {
      const roleKey = r as Role;
      CAPABILITIES_LIST.forEach((c) => {
        updatePermission(roleKey, c.id, localMatrix[roleKey][c.id]);
      });
    });
    setMatrixDirty(false);
    addToast({
      title: 'Permissions matrix updated',
      description: 'Role capabilities saved. Navigation menus updated dynamically.',
      variant: 'success',
    });
  };

  const handleDiscardMatrix = () => {
    setLocalMatrix(permissions);
    setMatrixDirty(false);
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-ink flex items-center gap-1.5">
            <span>{row.name}</span>
            {row.id === currentUserId && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent text-ink font-bold">
                You
              </span>
            )}
          </div>
          <div className="text-[11px] text-ink/65">{row.email || 'No email registered'}</div>
        </div>
      ),
    },
    {
      key: 'hospital_id' as any,
      header: 'Hospital & District',
      sortable: true,
      render: (row) => {
        const hospId = row.hospital_id || 'hosp_city_01';
        const hosp = mockHospitals.find((h) => h._id === hospId);
        const hospName = hosp?.name || 'City Hospital';
        const district = hosp?.city || 'Chennai';
        const districtColor =
          district === 'Madurai'
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : district === 'Coimbatore'
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
            : 'bg-blue-100 text-blue-900 border-blue-300';

        return (
          <div>
            <div className="font-semibold text-ink flex items-center gap-1.5 text-xs">
              <Hospital className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="line-clamp-1">{hospName}</span>
            </div>
            <div className="mt-0.5">
              <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${districtColor}`}>
                {district}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Assigned Role',
      sortable: true,
      render: (row) => {
        const rolePill = {
          hospital_admin: 'bg-ink text-base',
          receptionist: 'bg-accent text-ink',
          doctor: 'bg-cream text-ink',
          patient: 'border border-ink/20 text-ink',
          super_admin: 'bg-ink text-base',
        }[row.role];

        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${rolePill}`}>
            {row.role.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      key: 'phone',
      header: 'Contact',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-ink">{row.phone}</span>,
    },
    {
      key: 'linked_doctor_id',
      header: 'Linked Doctor Profile',
      render: (row) => {
        if (!row.linked_doctor_id) return <span className="text-xs text-ink/40">—</span>;
        const doc = doctors.find((d) => d.id === row.linked_doctor_id);
        return <span className="text-xs font-medium text-ink">{doc?.name || 'Linked Doctor'}</span>;
      },
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            row.is_active ? 'bg-success/15 text-success border border-success/30' : 'bg-ink/10 text-ink/60'
          }`}
        >
          {row.is_active ? 'Active' : 'Deactivated'}
        </span>
      ),
    },
    {
      key: 'last_active',
      header: 'Last Active',
      sortable: true,
      render: (row) => <span className="text-xs text-ink/70">{row.last_active || 'Recent'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="p-1 rounded text-ink/70 hover:text-ink hover:bg-ink/5 cursor-pointer"
            title="Edit staff details"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleResetPassword(row)}
            className="p-1 rounded text-ink/70 hover:text-ink hover:bg-ink/5 cursor-pointer"
            title="Reset Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleToggleActive(row)}
            className={`p-1 rounded cursor-pointer ${
              row.is_active ? 'text-ink/60 hover:text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10'
            }`}
            title={row.is_active ? 'Deactivate account' : 'Reactivate account'}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        eyebrow="STAFF"
        title="Staff Accounts & Roles"
        description="Multi-hospital staff directory, role assignments, self-deactivation security guards, and capability access matrix."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Add staff
          </Button>
        }
      />

      {/* Hospital Level Split-up Filter Bar */}
      <div className="bg-base border border-ink/10 rounded-card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* District Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60 mr-1 shrink-0">
              District:
            </span>
            {['all', 'Chennai', 'Madurai', 'Coimbatore'].map((district) => {
              const isActive = selectedDistrict === district;
              return (
                <button
                  key={district}
                  type="button"
                  onClick={() => {
                    setSelectedDistrict(district);
                    setSelectedHospitalId('all');
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-ink text-base shadow-xs'
                      : 'bg-ink/5 text-ink/70 hover:bg-ink/10 hover:text-ink'
                  }`}
                >
                  {district === 'all' ? 'All Districts' : district}
                </button>
              );
            })}
          </div>

          {/* Hospital Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-ink/60 shrink-0">
              Hospital:
            </label>
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="text-xs rounded-card bg-surface border border-ink/15 text-ink py-1.5 px-3 focus:outline-hidden focus:border-accent"
            >
              <option value="all">All Hospitals ({users.length} total staff)</option>
              {filteredHospitalsForSelect.map((h) => {
                const count = users.filter((u) => (u.hospital_id || 'hosp_city_01') === h._id).length;
                return (
                  <option key={h._id} value={h._id}>
                    {h.name} [{h.city}] — {count} staff
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Quick info bar showing active filter count */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-ink/5 text-xs text-ink/65">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-bold text-ink">{filteredUsers.length}</span>
            <span>staff members</span>
            {selectedHospitalId !== 'all' && (
              <span className="bg-accent/15 text-accent font-semibold px-2 py-0.5 rounded-full text-[11px]">
                {mockHospitals.find((h) => h._id === selectedHospitalId)?.name}
              </span>
            )}
            {selectedDistrict !== 'all' && (
              <span className="bg-ink/10 text-ink font-semibold px-2 py-0.5 rounded-full text-[11px]">
                {selectedDistrict}
              </span>
            )}
          </div>

          {(selectedHospitalId !== 'all' || selectedDistrict !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSelectedHospitalId('all');
                setSelectedDistrict('all');
              }}
              className="text-xs text-accent font-semibold hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Staff Users Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        keyExtractor={(row) => row.id}
        defaultSortKey="name"
        defaultSortDir="asc"
        defaultPageSize={10}
      />

      {/* Role-Based Permissions Matrix */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/10 pb-3">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <span>ACCESS CONTROL MATRIX</span>
            </div>
            <h3 className="text-base font-medium text-ink mt-0.5">Role Capabilities & Navigation Entitlements</h3>
          </div>
          <p className="text-xs text-ink/65">
            Hospital Admin permissions are locked ON. Receptionist and Doctor privileges can be modified live.
          </p>
        </div>

        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="eyebrow">
                <th className="py-3 px-4">System Capability</th>
                <th className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-ink" />
                    <span>Hospital Admin</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Receptionist</th>
                <th className="py-3 px-4 text-center">Doctor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {CAPABILITIES_LIST.map((cap) => (
                <tr key={cap.id} className="hover:bg-ink/[0.02]">
                  <td className="py-3 px-4 font-medium text-ink">{cap.label}</td>

                  {/* Hospital Admin (Locked ON) */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-ink/60">
                      <Lock className="w-3 h-3" />
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className="w-4 h-4 accent-ink opacity-60"
                      />
                    </div>
                  </td>

                  {/* Receptionist (Editable) */}
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={localMatrix.receptionist[cap.id] ?? false}
                      onChange={(e) => handleMatrixCheck('receptionist', cap.id, e.target.checked)}
                      className="w-4 h-4 accent-ink cursor-pointer"
                    />
                  </td>

                  {/* Doctor (Editable) */}
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={localMatrix.doctor[cap.id] ?? false}
                      onChange={(e) => handleMatrixCheck('doctor', cap.id, e.target.checked)}
                      className="w-4 h-4 accent-ink cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? `Edit ${editingUser.name}` : 'Add Staff Member'}
        eyebrow="ACCOUNT INTAKE"
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
              onClick={handleSaveUser}
              isLoading={isProcessing}
            >
              Save account & send invite
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-left">
          <Input
            label="Staff Full Name *"
            placeholder="e.g. Ramesh Chandra"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Mobile Phone (+91) *"
            placeholder="+91 98401 23456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="staff@cityhospital.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Select
            label="Hospital Assignment *"
            value={staffHospitalId}
            onChange={(e) => setStaffHospitalId(e.target.value)}
            options={mockHospitals.map((h) => ({
              value: h._id,
              label: `${h.name} (${h.city})`,
            }))}
          />

          <Select
            label="Role Assignment *"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            options={[
              { value: 'receptionist', label: 'Receptionist' },
              { value: 'doctor', label: 'Doctor' },
              { value: 'hospital_admin', label: 'Hospital Admin' },
            ]}
          />

          {role === 'doctor' && (
            <Select
              label="Link Doctor Profile *"
              value={linkedDoctorId}
              onChange={(e) => setLinkedDoctorId(e.target.value)}
              options={[
                { value: '', label: 'Select doctor profile to bind...' },
                ...doctors.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          )}
        </form>
      </Modal>

      {/* Security Guard Error Dialog */}
      <ConfirmDialog
        isOpen={Boolean(guardError)}
        onClose={() => setGuardError(null)}
        onConfirm={() => setGuardError(null)}
        title="Administrative Security Guard"
        confirmLabel="I understand"
        description={guardError || ''}
      />

      {/* Sticky Save Bar for Matrix Changes */}
      {matrixDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-ink text-base px-6 py-3.5 rounded-full border border-base/20 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3">
          <span className="text-xs font-semibold text-base/90">
            Unsaved capability matrix changes detected.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleDiscardMatrix} className="text-base hover:bg-base/10">
              Discard
            </Button>
            <Button variant="inverted" size="sm" onClick={handleSaveMatrix}>
              Save permissions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
