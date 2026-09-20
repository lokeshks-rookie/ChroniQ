import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Tabs } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { useHospitalStore } from '@/store/hospitalStore';
import { useUiStore } from '@/store/uiStore';
import { addPatientStaffNote, logAudit } from '@/services/adminApi';
import { maskPhone } from '@/lib/format';
import { formatDateIST } from '@/lib/time';
import {
  Search,
  Eye,
  EyeOff,
  AlertTriangle,
  User,
  History,
  FileText,
  Plus,
  Calendar,
} from 'lucide-react';
import type { Appointment } from '@/types';

interface PatientRecord {
  patientId: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  totalVisits: number;
  lastVisit?: string;
  nextAppointment?: string;
  noShowCount: number;
  appointments: Appointment[];
}

export const PatientsPage: React.FC = () => {
  const { appointments, patient_notes } = useHospitalStore();
  const { addToast } = useUiStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'noshows'>('all');

  // Revealed phone IDs set
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());

  // Patient detail drawer
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'history' | 'visits' | 'notes'>('overview');

  // New Note
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Group appointments into patient records
  const patientRecords = useMemo(() => {
    const map = new Map<string, PatientRecord>();

    appointments.forEach((apt) => {
      const pid = apt.patient_id;
      if (!map.has(pid)) {
        map.set(pid, {
          patientId: pid,
          name: apt.patient.name,
          age: apt.patient.age,
          gender: apt.patient.gender,
          phone: apt.patient.phone,
          totalVisits: 0,
          noShowCount: 0,
          appointments: [],
        });
      }

      const rec = map.get(pid)!;
      rec.appointments.push(apt);

      if (apt.status === 'completed') {
        rec.totalVisits += 1;
        if (!rec.lastVisit || new Date(apt.scheduled_start) > new Date(rec.lastVisit)) {
          rec.lastVisit = apt.scheduled_start;
        }
      } else if (apt.status === 'no_show') {
        rec.noShowCount += 1;
      } else if (apt.status === 'booked' || apt.status === 'in_queue') {
        if (!rec.nextAppointment || new Date(apt.scheduled_start) < new Date(rec.nextAppointment)) {
          rec.nextAppointment = apt.scheduled_start;
        }
      }
    });

    return Array.from(map.values());
  }, [appointments]);

  // Filtered list
  const filteredPatients = useMemo(() => {
    return patientRecords.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchPhone = p.phone?.toLowerCase().includes(q);
        const matchCode = p.appointments.some((a) => a.booking_code.toLowerCase().includes(q));
        if (!matchName && !matchPhone && !matchCode) return false;
      }

      if (filterType === 'upcoming' && !p.nextAppointment) return false;
      if (filterType === 'noshows' && p.noShowCount < 2) return false;

      return true;
    });
  }, [patientRecords, searchQuery, filterType]);

  // Masking reveal action
  const handleRevealPhone = (patientId: string, phone: string) => {
    const next = new Set(revealedPhones);
    if (next.has(patientId)) {
      next.delete(patientId);
    } else {
      next.add(patientId);
      addToast({
        title: 'Access logged',
        description: 'Audit log recorded: Patient phone revealed.',
        variant: 'info',
      });
      logAudit('REVEAL_PHONE', `Accessed unmasked contact number (${phone}) for patient ${patientId}`);
    }
    setRevealedPhones(next);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !newNote.trim()) return;

    setIsAddingNote(true);
    try {
      await addPatientStaffNote({
        patientId: selectedPatient.patientId,
        authorId: 'user_admin_1',
        authorName: 'Front Desk Admin',
        note: newNote.trim(),
      });
      setNewNote('');
    } finally {
      setIsAddingNote(false);
    }
  };

  const patientNotes = patient_notes.filter((n) => n.patient_id === selectedPatient?.patientId);

  const columns: Column<PatientRecord>[] = [
    {
      key: 'name',
      header: 'Patient Name',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.name}</div>
          <div className="text-[11px] text-ink/65">
            {row.age ? `${row.age} yrs` : ''} • {row.gender || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact Phone',
      render: (row) => {
        const isRevealed = revealedPhones.has(row.patientId);
        const rawPhone = row.phone || '+91 98400 00000';

        return (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span>{isRevealed ? rawPhone : maskPhone(rawPhone)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRevealPhone(row.patientId, rawPhone);
              }}
              className="p-1 rounded text-ink/60 hover:text-ink hover:bg-ink/5 cursor-pointer"
              title={isRevealed ? 'Hide phone' : 'Reveal phone (access logged)'}
            >
              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        );
      },
    },
    {
      key: 'totalVisits',
      header: 'Completed Visits',
      sortable: true,
      align: 'center',
      render: (row) => <span className="font-mono text-xs">{row.totalVisits}</span>,
    },
    {
      key: 'lastVisit',
      header: 'Last Visit',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-ink/75">
          {row.lastVisit ? formatDateIST(row.lastVisit) : '—'}
        </span>
      ),
    },
    {
      key: 'nextAppointment',
      header: 'Upcoming',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-ink">
          {row.nextAppointment ? formatDateIST(row.nextAppointment) : 'None'}
        </span>
      ),
    },
    {
      key: 'noShowCount',
      header: 'No-Show History',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.noShowCount >= 2 ? (
            <span className="px-2 py-0.5 rounded-full bg-danger/15 text-danger font-semibold text-xs border border-danger/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Repeat no-show ({row.noShowCount})</span>
            </span>
          ) : (
            <span className="text-xs text-ink/60">{row.noShowCount}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PATIENTS"
        title="Patient Directory"
        description="Patient visit histories, masked contact audit protection, attendance records, and desk consultation notes."
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-card bg-base border border-ink/10">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search by name, phone, booking code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors ${
              filterType === 'all'
                ? 'bg-accent text-ink font-semibold'
                : 'border border-ink/20 text-ink hover:border-ink/40'
            }`}
          >
            All Patients ({patientRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('upcoming')}
            className={`px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors ${
              filterType === 'upcoming'
                ? 'bg-accent text-ink font-semibold'
                : 'border border-ink/20 text-ink hover:border-ink/40'
            }`}
          >
            Has Upcoming Appointment
          </button>
          <button
            type="button"
            onClick={() => setFilterType('noshows')}
            className={`px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors ${
              filterType === 'noshows'
                ? 'bg-accent text-ink font-semibold'
                : 'border border-ink/20 text-ink hover:border-ink/40'
            }`}
          >
            Repeat No-Shows (2+)
          </button>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={filteredPatients}
        keyExtractor={(row) => row.patientId}
        onRowClick={(row) => {
          setSelectedPatient(row);
          setDrawerTab('overview');
          setDrawerOpen(true);
        }}
        defaultSortKey="name"
        defaultSortDir="asc"
        defaultPageSize={10}
      />

      {/* Patient Profile & Visit History Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedPatient?.name || 'Patient Profile'}
        eyebrow="PATIENT RECORD"
        width="lg"
      >
        {selectedPatient && (
          <div className="space-y-4">
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
                { id: 'history', label: 'All Bookings', icon: <History className="w-4 h-4" />, count: selectedPatient.appointments.length },
                { id: 'visits', label: 'Past Visits', icon: <Calendar className="w-4 h-4" />, count: selectedPatient.totalVisits },
                { id: 'notes', label: 'Desk Notes', icon: <FileText className="w-4 h-4" />, count: patientNotes.length },
              ]}
              activeTab={drawerTab}
              onChange={(t) => setDrawerTab(t as any)}
            />

            {/* TAB 1: Overview */}
            {drawerTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-card border border-ink/10 bg-base space-y-2">
                  <div className="font-semibold uppercase tracking-wider text-ink/70">Personal Info</div>
                  <div className="grid grid-cols-2 gap-2 text-ink pt-1">
                    <div>
                      <span className="text-ink/60">Full Name:</span>
                      <div className="font-semibold text-sm">{selectedPatient.name}</div>
                    </div>
                    <div>
                      <span className="text-ink/60">Age / Gender:</span>
                      <div className="font-semibold">{selectedPatient.age || '—'} yrs • {selectedPatient.gender}</div>
                    </div>
                    <div>
                      <span className="text-ink/60">Contact Phone:</span>
                      <div className="font-semibold font-mono">{selectedPatient.phone || '—'}</div>
                    </div>
                    <div>
                      <span className="text-ink/60">Registered At:</span>
                      <div className="font-semibold">City Hospital OPD Desk</div>
                    </div>
                  </div>
                </div>

                {/* Family members simulation */}
                <div className="p-4 rounded-card border border-ink/10 bg-base space-y-2">
                  <div className="font-semibold uppercase tracking-wider text-ink/70">Linked Family Members</div>
                  <div className="divide-y divide-ink/10">
                    <div className="py-2 flex justify-between">
                      <span className="font-medium text-ink">Vijay (Son, 14 yrs)</span>
                      <span className="text-ink/60 font-mono">Child Profile</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="font-medium text-ink">Radhika (Spouse, 40 yrs)</span>
                      <span className="text-ink/60 font-mono">Dependent</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: All Bookings History */}
            {drawerTab === 'history' && (
              <div className="space-y-2.5">
                {selectedPatient.appointments.map((apt) => (
                  <div key={apt.id} className="p-3 rounded-card border border-ink/10 bg-base text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-ink">{apt.booking_code}</span>
                      <StatusBadge status={apt.status} size="sm" />
                    </div>
                    <div className="flex justify-between text-ink/70">
                      <span>{apt.doctor_name} ({apt.department_name})</span>
                      <span className="font-mono">{formatDateIST(apt.scheduled_start)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: Completed Visits */}
            {drawerTab === 'visits' && (
              <div className="space-y-2.5">
                {selectedPatient.appointments
                  .filter((a) => a.status === 'completed')
                  .map((apt) => (
                    <div key={apt.id} className="p-3.5 rounded-card border border-ink/10 bg-base text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-ink">
                        <span>{apt.doctor_name}</span>
                        <span className="font-mono text-ink/70">{formatDateIST(apt.scheduled_start)}</span>
                      </div>
                      <div className="text-ink/70">Reason: {apt.reason || 'General checkup'}</div>
                    </div>
                  ))}
              </div>
            )}

            {/* TAB 4: Desk Notes */}
            {drawerTab === 'notes' && (
              <div className="space-y-4">
                <div className="p-3 rounded-card bg-ink/5 border border-ink/10 text-[11px] text-ink/70 italic">
                  Hint: Do not record clinical details or sensitive health summaries here. Administrative operational notes only. Demo data only.
                </div>

                <form onSubmit={handleAddNote} className="space-y-2">
                  <Textarea
                    placeholder="Record administrative front desk note..."
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    isLoading={isAddingNote}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add staff note
                  </Button>
                </form>

                <div className="space-y-2 pt-2 border-t border-ink/10">
                  {patientNotes.length === 0 ? (
                    <div className="py-4 text-center text-xs text-ink/50">No notes recorded yet.</div>
                  ) : (
                    patientNotes.map((note) => (
                      <div key={note.id} className="p-3 rounded-card border border-ink/10 bg-base text-xs space-y-1">
                        <div className="flex justify-between text-[11px] text-ink/60">
                          <span className="font-semibold text-ink">{note.author_name}</span>
                          <span>{formatDateIST(note.created_at)}</span>
                        </div>
                        <p className="text-ink/80 leading-relaxed">{note.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
