import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Checkbox } from '@/components/ui/Checkbox';
import { Textarea } from '@/components/ui/Textarea';
import { useHospitalStore } from '@/store/hospitalStore';
import {
  rescheduleAppointment,
  cancelAppointment,
  confirmAppointmentDesk,
} from '@/services/adminApi';
import { toCsv, downloadCsv } from '@/lib/csv';
import { formatTimeIST, formatDateIST } from '@/lib/time';
import { formatInr } from '@/lib/format';
import {
  Search,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  XCircle,
  User,
  Activity,
  Globe,
  Monitor,
  Mic,
  ShieldCheck,
} from 'lucide-react';
import type { Appointment, AppointmentStatus } from '@/types';

export const AppointmentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const { appointments, doctors, departments } = useHospitalStore();

  // Filter params from URL
  const searchQuery = searchParams.get('q') || '';
  const selectedDept = searchParams.get('dept') || 'all';
  const selectedDoctor = searchParams.get('doctor') || 'all';
  const selectedType = searchParams.get('type') || 'all';
  const selectedSource = searchParams.get('source') || 'all';
  const selectedStatuses = useMemo(() => {
    const s = searchParams.get('status');
    return s ? s.split(',') : [];
  }, [searchParams]);

  // Modals & Drawers state
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Patient requested cancellation');
  const [notifyPatient, setNotifyPatient] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reschedule state
  const [newRescheduleDate, setNewRescheduleDate] = useState('2026-09-21');
  const [newRescheduleTime, setNewRescheduleTime] = useState('11:00');
  const [rescheduleReason, setRescheduleReason] = useState('Schedule conflict requested by patient');

  // Multi-row selection for bulk actions
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const updateFilters = (newParams: Record<string, string | null>) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (!v || v === 'all') {
        updated.delete(k);
      } else {
        updated.set(k, v);
      }
    });
    setSearchParams(updated);
  };

  const toggleStatusFilter = (st: AppointmentStatus) => {
    const set = new Set(selectedStatuses);
    if (set.has(st)) {
      set.delete(st);
    } else {
      set.add(st);
    }
    const arr = Array.from(set);
    updateFilters({ status: arr.length > 0 ? arr.join(',') : null });
  };

  // Filtered dataset
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = apt.patient.name.toLowerCase().includes(q);
        const matchCode = apt.booking_code.toLowerCase().includes(q);
        const matchPhone = apt.patient.phone?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone) return false;
      }

      // Department
      if (selectedDept !== 'all' && apt.department_id !== selectedDept) return false;

      // Doctor
      if (selectedDoctor !== 'all' && apt.doctor_id !== selectedDoctor) return false;

      // Type
      if (selectedType !== 'all' && apt.type !== selectedType) return false;

      // Source
      if (selectedSource !== 'all' && apt.created_via !== selectedSource) return false;

      // Status
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(apt.status)) return false;

      return true;
    });
  }, [appointments, searchQuery, selectedDept, selectedDoctor, selectedType, selectedSource, selectedStatuses]);

  // Summary counts for the filtered set
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [appointments]);

  // Actions
  const handleConfirm = async (aptId: string) => {
    await confirmAppointmentDesk(aptId);
  };

  const handleOpenReschedule = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!selectedAppointment) return;
    setIsProcessing(true);
    try {
      await rescheduleAppointment(
        selectedAppointment.id,
        newRescheduleDate,
        newRescheduleTime,
        rescheduleReason
      );
      setRescheduleModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenCancel = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedAppointment) return;
    setIsProcessing(true);
    try {
      await cancelAppointment(selectedAppointment.id, cancelReason, notifyPatient);
      setCancelDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk actions
  const handleBulkCancel = async () => {
    setIsProcessing(true);
    try {
      for (const id of selectedKeys) {
        await cancelAppointment(id, 'Bulk administrative cancellation', true);
      }
      setSelectedKeys(new Set());
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCsv = () => {
    const columns = [
      { key: 'booking_code', label: 'Booking Code' },
      { key: 'patient_name', label: 'Patient Name', format: (_: any, row: Appointment) => row.patient.name },
      { key: 'patient_phone', label: 'Phone', format: (_: any, row: Appointment) => row.patient.phone || '' },
      { key: 'doctor_name', label: 'Doctor' },
      { key: 'department_name', label: 'Department' },
      { key: 'scheduled_start', label: 'Date Time (IST)', format: (val: string) => `${formatDateIST(val)} ${formatTimeIST(val)}` },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'fee', label: 'Fee (INR)' },
      { key: 'created_via', label: 'Source' },
    ];

    const csvContent = toCsv(columns, filteredAppointments);
    const todayStr = new Date().toISOString().split('T')[0];
    downloadCsv(`chroniq-appointments-${todayStr}.csv`, csvContent);
  };

  // Table Columns
  const columns: Column<Appointment>[] = [
    {
      key: 'booking_code',
      header: 'Booking Code',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 font-mono font-semibold text-xs">
          <span>{row.booking_code}</span>
          {row.desk_confirmed && (
            <span title="Confirmed by front desk">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      sortable: false,
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.patient.name}</div>
          <div className="text-[11px] text-ink/65">
            {row.patient.age ? `${row.patient.age}y` : ''} • {row.patient.gender}
          </div>
        </div>
      ),
    },
    {
      key: 'doctor_name',
      header: 'Doctor & Department',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-ink">{row.doctor_name}</div>
          <div className="text-[11px] text-ink/65">{row.department_name}</div>
        </div>
      ),
    },
    {
      key: 'scheduled_start',
      header: 'Scheduled Slot',
      sortable: true,
      render: (row) => (
        <div className="font-mono text-xs">
          <div>{formatTimeIST(row.scheduled_start)}</div>
          <div className="text-[11px] text-ink/60">{formatDateIST(row.scheduled_start)}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (row) => (
        <span className="capitalize text-xs font-medium text-ink">
          {row.type === 'walk_in' ? 'Walk-in' : 'Booked'}
        </span>
      ),
    },
    {
      key: 'created_via',
      header: 'Source',
      sortable: true,
      render: (row) => {
        const icon = {
          web: <Globe className="w-3.5 h-3.5 text-ink/70" />,
          desk: <User className="w-3.5 h-3.5 text-ink/70" />,
          kiosk: <Monitor className="w-3.5 h-3.5 text-ink/70" />,
          voice: <Mic className="w-3.5 h-3.5 text-ink/70" />,
        }[row.created_via] || <Activity className="w-3.5 h-3.5 text-ink/70" />;

        return (
          <div className="flex items-center gap-1.5 text-xs text-ink capitalize" title={`Booked via ${row.created_via}`}>
            {icon}
            <span>{row.created_via}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'fee',
      header: 'Fee',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono text-xs font-semibold">{formatInr(row.fee)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const canReschedule = row.status === 'booked' || row.status === 'checked_in';
        const canCancel =
          row.status !== 'completed' &&
          row.status !== 'cancelled' &&
          row.status !== 'no_show' &&
          row.status !== 'expired';

        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAppointment(row);
                setViewDrawerOpen(true);
              }}
              className="p-1 rounded text-ink/70 hover:text-ink hover:bg-ink/5 cursor-pointer"
              title="View details"
            >
              <Eye className="w-4 h-4" />
            </button>

            {!row.desk_confirmed && canReschedule && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirm(row.id);
                }}
                className="p-1 rounded text-success hover:bg-success/10 cursor-pointer"
                title="Confirm appointment"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}

            {canReschedule && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenReschedule(row);
                }}
                className="p-1 rounded text-ink/70 hover:text-ink hover:bg-ink/5 cursor-pointer"
                title="Reschedule"
              >
                <Calendar className="w-4 h-4" />
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenCancel(row);
                }}
                className="p-1 rounded text-danger hover:bg-danger/10 cursor-pointer"
                title="Cancel appointment"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="APPOINTMENTS"
        title="Appointment Roster"
        description="Filter and manage all patient bookings, verify front desk confirmations, and export schedule rosters."
        actions={
          <div className="flex items-center gap-2.5">
            {selectedKeys.size > 0 && (
              <Button
                variant="danger"
                size="md"
                onClick={handleBulkCancel}
                isLoading={isProcessing}
                icon={<XCircle className="w-4 h-4" />}
              >
                Cancel selected ({selectedKeys.size})
              </Button>
            )}

            <Button
              variant="secondary"
              size="md"
              onClick={handleExportCsv}
              icon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar with Multi-Select Status Pills */}
      <div className="p-4 rounded-card bg-base border border-ink/10 space-y-4">
        {/* Search and Select dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search patient, code, phone..."
            value={searchQuery}
            onChange={(e) => updateFilters({ q: e.target.value || null })}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select
            value={selectedDept}
            onChange={(e) => updateFilters({ dept: e.target.value })}
            options={[
              { value: 'all', label: 'All Departments' },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />

          <Select
            value={selectedDoctor}
            onChange={(e) => updateFilters({ doctor: e.target.value })}
            options={[
              { value: 'all', label: 'All Doctors' },
              ...doctors.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />

          <Select
            value={selectedType}
            onChange={(e) => updateFilters({ type: e.target.value })}
            options={[
              { value: 'all', label: 'All Booking Types' },
              { value: 'booked', label: 'Pre-Booked' },
              { value: 'walk_in', label: 'Walk-In' },
            ]}
          />
        </div>

        {/* Status Multi-Select Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ink/10 text-xs">
          <span className="font-semibold text-ink/70 mr-1">Status:</span>
          {(
            [
              'booked',
              'checked_in',
              'in_queue',
              'in_consultation',
              'completed',
              'cancelled',
              'no_show',
              'rescheduled',
            ] as AppointmentStatus[]
          ).map((st) => {
            const isSelected = selectedStatuses.includes(st);
            const count = statusCounts[st] || 0;

            return (
              <button
                key={st}
                type="button"
                onClick={() => toggleStatusFilter(st)}
                className={`badge !capitalize flex items-center gap-1.5 ${isSelected ? 'active' : ''}`}
              >
                <span>{st.replace('_', ' ')}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-ink text-base' : 'bg-ink/10 text-ink'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {selectedStatuses.length > 0 && (
            <button
              type="button"
              onClick={() => updateFilters({ status: null })}
              className="text-xs text-accent hover:underline font-semibold ml-2 cursor-pointer"
            >
              Clear status filters
            </button>
          )}
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={filteredAppointments}
        keyExtractor={(row) => row.id}
        selectable={true}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        onRowClick={(row) => {
          setSelectedAppointment(row);
          setViewDrawerOpen(true);
        }}
        defaultSortKey="scheduled_start"
        defaultSortDir="asc"
        defaultPageSize={10}
      />

      {/* View Appointment Details Drawer */}
      <Drawer
        isOpen={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
        title={selectedAppointment?.booking_code || 'Appointment Details'}
        eyebrow="APPOINTMENT SUMMARY"
        width="lg"
      >
        {selectedAppointment && (
          <div className="space-y-6">
            {/* Status & Patient Snapshot */}
            <div className="p-4 rounded-card border border-ink/10 bg-base/60 space-y-3">
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedAppointment.status} />
                <span className="font-mono text-xs text-ink/70">
                  {selectedAppointment.booking_code}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">{selectedAppointment.patient.name}</h3>
                <p className="text-xs text-ink/70 mt-0.5">
                  Age: {selectedAppointment.patient.age || '—'} • Gender: {selectedAppointment.patient.gender || '—'}
                </p>
                <p className="text-xs text-ink/70 font-mono mt-0.5">
                  Phone: {selectedAppointment.patient.phone || '—'}
                </p>
              </div>
            </div>

            {/* Clinical & Encounter Snapshot */}
            <div className="space-y-3 text-xs">
              <div className="eyebrow">
                Clinical Context
              </div>
              <div className="p-3 rounded-card border border-ink/10 space-y-2">
                <div>
                  <span className="text-ink/60">Reason for visit:</span>
                  <div className="font-medium text-ink mt-0.5">
                    {selectedAppointment.reason || 'General consultation'}
                  </div>
                </div>
                {selectedAppointment.symptoms_note && (
                  <div>
                    <span className="text-ink/60">Symptoms note:</span>
                    <div className="text-ink/80 mt-0.5">{selectedAppointment.symptoms_note}</div>
                  </div>
                )}
                <div className="pt-2 border-t border-ink/10 flex justify-between">
                  <span className="text-ink/60">Consultation Fee:</span>
                  <span className="font-bold text-ink font-mono">
                    {formatInr(selectedAppointment.fee)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status History Timeline */}
            <div className="space-y-3 text-xs">
              <div className="eyebrow">
                Status History Timeline
              </div>
              <div className="space-y-2 relative pl-4 border-l-2 border-ink/20">
                {selectedAppointment.status_history.map((event, idx) => (
                  <div key={idx} className="relative space-y-0.5">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-ink" />
                    <div className="font-semibold text-ink capitalize">
                      {event.status.replace('_', ' ')}
                    </div>
                    <div className="text-[11px] text-ink/60 font-mono">
                      {formatTimeIST(event.at)} • {formatDateIST(event.at)}
                    </div>
                    {event.note && (
                      <div className="text-[11px] text-ink/80 italic">{event.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Reschedule Modal with Slot Grid */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Appointment"
        eyebrow="CALENDAR RESCHEDULE"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setRescheduleModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmReschedule}
              isLoading={isProcessing}
            >
              Confirm Reschedule
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-ink/70">
            Rescheduling for patient <strong>{selectedAppointment?.patient.name}</strong> with{' '}
            <strong>{selectedAppointment?.doctor_name}</strong>.
          </p>

          <Input
            label="New Date *"
            type="date"
            value={newRescheduleDate}
            onChange={(e) => setNewRescheduleDate(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="eyebrow block">
              Select Time Slot *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '15:00'].map((time) => {
                const isSelected = newRescheduleTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setNewRescheduleTime(time)}
                    className={`p-2 rounded-card text-xs font-mono font-semibold border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-ink text-base border-ink'
                        : 'bg-base border-ink/20 text-ink hover:border-ink/40'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea
            label="Reason for Rescheduling *"
            rows={2}
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
            required
          />
        </div>
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Appointment"
        isDestructive={true}
        isLoading={isProcessing}
        confirmLabel="Cancel appointment"
        description={
          <>
            Are you sure you want to cancel booking <strong>{selectedAppointment?.booking_code}</strong> for{' '}
            <strong>{selectedAppointment?.patient.name}</strong>?
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Cancellation Reason *"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            options={[
              { value: 'Patient requested cancellation', label: 'Patient requested cancellation' },
              { value: 'Doctor unavailable / emergency leave', label: 'Doctor unavailable / emergency leave' },
              { value: 'Scheduling conflict', label: 'Scheduling conflict' },
              { value: 'No longer requires consultation', label: 'No longer requires consultation' },
            ]}
          />

          <Checkbox
            label="Notify patient via in-app & SMS"
            checked={notifyPatient}
            onChange={(e) => setNotifyPatient(e.target.checked)}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
};
