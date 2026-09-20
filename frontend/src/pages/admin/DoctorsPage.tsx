import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TagInput } from '@/components/ui/TagInput';
import { Toggle } from '@/components/ui/Textarea';
import { Avatar } from '@/components/ui/Avatar';
import { useHospitalStore } from '@/store/hospitalStore';
import {
  createDoctor,
  updateDoctor,
  toggleDoctorStatus,
} from '@/services/adminApi';
import { formatInr } from '@/lib/format';
import {
  UserPlus,
  Search,
  Calendar,
  Edit2,
  Power,
  Star,
  Clock,
} from 'lucide-react';
import type { Doctor } from '@/types';

export const DoctorsPage: React.FC = () => {
  const navigate = useNavigate();
  const { doctors, departments, appointments } = useHospitalStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Deactivate dialog state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [doctorToDeactivate, setDoctorToDeactivate] = useState<Doctor | null>(null);
  const [affectedAppointmentsCount, setAffectedAppointmentsCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [specialty, setSpecialty] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [qualifications, setQualifications] = useState<string[]>(['MBBS']);
  const [experienceYears, setExperienceYears] = useState(5);
  const [fee, setFee] = useState(500);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [bio, setBio] = useState('');
  const [room, setRoom] = useState('');
  const [createLogin, setCreateLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Open Add Drawer
  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setName('');
    setGender('male');
    setSpecialty('');
    setDepartmentId(departments[0]?.id || '');
    setQualifications(['MBBS']);
    setExperienceYears(5);
    setFee(500);
    setLanguages(['English']);
    setBio('');
    setRoom('Room 101');
    setCreateLogin(false);
    setEmail('');
    setPhone('');
    setDrawerOpen(true);
  };

  // Open Edit Drawer
  const handleOpenEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setName(doc.name);
    setGender(doc.gender || 'male');
    setSpecialty(doc.specialty);
    setDepartmentId(doc.department_id);
    setQualifications(doc.qualifications || ['MBBS']);
    setExperienceYears(doc.experience_years);
    setFee(doc.fee);
    setLanguages(doc.languages || ['English']);
    setBio(doc.bio || '');
    setRoom(doc.room || 'Room 101');
    setCreateLogin(Boolean(doc.user_id));
    setEmail('');
    setPhone('');
    setDrawerOpen(true);
  };

  // Save Doctor
  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (editingDoctor) {
        await updateDoctor({
          ...editingDoctor,
          name,
          gender,
          specialty,
          department_id: departmentId,
          qualifications,
          experience_years: experienceYears,
          fee,
          languages,
          bio,
          room,
        });
      } else {
        await createDoctor({
          name,
          gender,
          specialty,
          department_id: departmentId,
          qualifications,
          experience_years: experienceYears,
          fee,
          languages,
          bio,
          room,
          avg_consult_minutes: 12,
          is_active: true,
        });
      }
      setDrawerOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle Doctor Active
  const handlePromptToggleStatus = (doc: Doctor) => {
    if (doc.is_active) {
      const affected = appointments.filter(
        (a) => a.doctor_id === doc.id && (a.status === 'booked' || a.status === 'in_queue')
      ).length;
      setDoctorToDeactivate(doc);
      setAffectedAppointmentsCount(affected);
      setDeactivateDialogOpen(true);
    } else {
      toggleDoctorStatus(doc.id);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!doctorToDeactivate) return;
    setIsProcessing(true);
    try {
      await toggleDoctorStatus(doctorToDeactivate.id);
      setDeactivateDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          doc.name.toLowerCase().includes(q) ||
          doc.specialty.toLowerCase().includes(q) ||
          doc.languages.some((l) => l.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (selectedDept !== 'all' && doc.department_id !== selectedDept) return false;
      if (statusFilter === 'active' && !doc.is_active) return false;
      if (statusFilter === 'inactive' && doc.is_active) return false;
      return true;
    });
  }, [doctors, searchQuery, selectedDept, statusFilter]);

  const columns: Column<Doctor>[] = [
    {
      key: 'name',
      header: 'Doctor',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} photoUrl={row.photo_url} size="md" />
          <div>
            <div className="font-semibold text-ink">{row.name}</div>
            <div className="text-[11px] text-ink/65">{row.specialty}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: false,
      render: (row) => {
        const dept = departments.find((d) => d.id === row.department_id);
        return (
          <div>
            <div className="font-medium text-ink">{dept?.name || '—'}</div>
            <div className="text-[11px] text-ink/60">{row.room || dept?.room}</div>
          </div>
        );
      },
    },
    {
      key: 'experience_years',
      header: 'Exp.',
      sortable: true,
      render: (row) => <span className="text-xs font-mono">{row.experience_years} yrs</span>,
    },
    {
      key: 'fee',
      header: 'Fee',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono text-xs font-semibold">{formatInr(row.fee)}</span>,
    },
    {
      key: 'avg_consult_minutes',
      header: 'Consult Avg',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs font-medium">
          <Clock className="w-3.5 h-3.5 text-ink/50" />
          <span>{row.avg_consult_minutes}m</span>
        </span>
      ),
    },
    {
      key: 'rating_avg',
      header: 'Rating',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1 text-xs font-semibold">
          <Star className="w-3.5 h-3.5 text-accent fill-accent" />
          <span>{row.rating_avg.toFixed(1)}</span>
          <span className="text-[10px] text-ink/50 font-normal">({row.rating_count})</span>
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.is_active ? 'bg-success/15 text-success border border-success/30' : 'bg-ink/10 text-ink/60'
          }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
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
            title="Edit Doctor Details"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate(`/admin/doctors/${row.id}/schedule`)}
            className="p-1 rounded text-ink/70 hover:text-ink hover:bg-ink/5 cursor-pointer"
            title="Manage Schedule & Availability"
          >
            <Calendar className="w-4 h-4 text-accent" />
          </button>

          <button
            type="button"
            onClick={() => handlePromptToggleStatus(row)}
            className={`p-1 rounded cursor-pointer ${
              row.is_active ? 'text-ink/60 hover:text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10'
            }`}
            title={row.is_active ? 'Deactivate Doctor' : 'Reactivate Doctor'}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DOCTORS"
        title="Medical Specialists"
        description="Clinical profiles, specialty assignments, fees, rolling consultation benchmarks, and schedule controls."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Add doctor
          </Button>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-card bg-base border border-ink/10">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search by doctor name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedDept('all')}
            className={`px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors ${
              selectedDept === 'all'
                ? 'bg-accent text-ink font-semibold'
                : 'border border-ink/20 text-ink hover:border-ink/40'
            }`}
          >
            All Departments
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => setSelectedDept(dept.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                selectedDept === dept.id
                  ? 'bg-accent text-ink font-semibold'
                  : 'border border-ink/20 text-ink hover:border-ink/40'
              }`}
            >
              {dept.name}
            </button>
          ))}
          <div className="w-px h-4 bg-ink/15 mx-1" />
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full font-medium cursor-pointer capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-ink text-base font-semibold'
                  : 'border border-ink/20 text-ink hover:border-ink/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={filteredDoctors}
        keyExtractor={(row) => row.id}
        defaultSortKey="name"
        defaultSortDir="asc"
        defaultPageSize={10}
      />

      {/* Add / Edit Doctor Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingDoctor ? `Edit ${editingDoctor.name}` : 'Add New Doctor Profile'}
        eyebrow="SPECIALIST PROFILE"
        width="lg"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setDrawerOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveDoctor}
              isLoading={isProcessing}
            >
              Save doctor profile
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveDoctor} className="space-y-4 text-left">
          <Input
            label="Doctor Full Name *"
            placeholder="e.g. Dr. Rajesh Deshmukh"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Gender *"
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Select
              label="Department Assignment *"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
          </div>

          <Input
            label="Clinical Specialty *"
            placeholder="e.g. Senior Consultant Cardiologist"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            required
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Experience (Yrs)"
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
            />
            <Input
              label="Consult Fee (₹) *"
              type="number"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              required
            />
            <Input
              label="Room / Chamber"
              placeholder="Room 101"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </div>

          <TagInput
            label="Qualifications"
            tags={qualifications}
            onChange={setQualifications}
            placeholder="Add MBBS, MD, DM..."
          />

          <TagInput
            label="Consultation Languages"
            tags={languages}
            onChange={setLanguages}
            placeholder="Add English, Tamil..."
          />

          <Textarea
            label="Doctor Professional Bio"
            rows={3}
            placeholder="Short bio and clinical interest highlights..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          {/* Toggle for User Login Account Creation */}
          <div className="pt-2 border-t border-ink/10">
            <Toggle
              label="Create doctor login account"
              description="Permit doctor to access doctor queue view (/doctor)"
              checked={createLogin}
              onChange={setCreateLogin}
            />

            {createLogin && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  label="Email address *"
                  type="email"
                  placeholder="doctor@cityhospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Mobile phone *"
                  type="tel"
                  placeholder="+91 98400 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}
          </div>
        </form>
      </Drawer>

      {/* Deactivate Doctor Confirm Dialog */}
      <ConfirmDialog
        isOpen={deactivateDialogOpen}
        onClose={() => setDeactivateDialogOpen(false)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Doctor Profile"
        isDestructive={true}
        isLoading={isProcessing}
        confirmLabel="Deactivate doctor"
        description={
          <>
            Are you sure you want to deactivate <strong>{doctorToDeactivate?.name}</strong>?
            {affectedAppointmentsCount > 0 ? (
              <span className="block mt-2 font-semibold text-danger">
                Warning: {affectedAppointmentsCount} upcoming appointments are currently booked for this doctor. They will need to be rescheduled.
              </span>
            ) : (
              <span className="block mt-2">
                No active appointments will be affected.
              </span>
            )}
          </>
        }
      />
    </div>
  );
};
