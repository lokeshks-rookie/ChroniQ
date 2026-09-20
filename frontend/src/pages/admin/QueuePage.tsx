import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { QueueColumn } from '@/components/queue/QueueColumn';
import { EmergencyInsertModal } from '@/components/queue/EmergencyInsertModal';
import { DelayBroadcastModal } from '@/components/queue/DelayBroadcastModal';
import { useHospitalStore } from '@/store/hospitalStore';
import {
  callNextPatient,
  callPatientAgain,
  startConsultation,
  completeConsultation,
  skipQueueEntry,
  markQueueNoShow,
  toggleQueuePriority,
} from '@/services/adminApi';
import { Siren, Clock, Eye, EyeOff } from 'lucide-react';
import type { Appointment } from '@/types';

export const QueuePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDeptId = searchParams.get('dept') || 'all';

  const {
    departments,
    doctors,
    queue_entries,
    appointments,
    calledCountdowns,
  } = useHospitalStore();

  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [targetDoctorId, setTargetDoctorId] = useState<string | undefined>(undefined);
  const [showExpected, setShowExpected] = useState(false);

  // Map of appointments for fast lookups
  const appointmentsMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    appointments.forEach((apt) => map.set(apt.id, apt));
    return map;
  }, [appointments]);

  // Filter doctors by selected department
  const filteredDoctors = useMemo(() => {
    if (selectedDeptId === 'all') return doctors;
    return doctors.filter((doc) => doc.department_id === selectedDeptId);
  }, [doctors, selectedDeptId]);

  const handleDeptSelect = (deptId: string) => {
    if (deptId === 'all') {
      searchParams.delete('dept');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ dept: deptId });
    }
  };

  // Action wrappers using adminApi
  const handleCallNext = async (doctorId: string) => {
    await callNextPatient(doctorId);
  };

  const handleCallAgain = async (doctorId: string) => {
    await callPatientAgain(doctorId);
  };

  const handleStartConsultation = async (doctorId: string) => {
    await startConsultation(doctorId);
  };

  const handleCompleteConsultation = async (doctorId: string) => {
    await completeConsultation(doctorId);
  };

  const handleSkip = async (entryId: string) => {
    await skipQueueEntry(entryId);
  };

  const handleMarkNoShow = async (entryId: string) => {
    await markQueueNoShow(entryId);
  };

  const handleTogglePriority = async (entryId: string) => {
    await toggleQueuePriority(entryId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="LIVE QUEUE"
        title="Queue Control"
        description="Real-time outpatient queue management, patient turn summoning, and dynamic ETA tracking."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setTargetDoctorId(undefined);
                setEmergencyModalOpen(true);
              }}
              icon={<Siren className="w-4 h-4" />}
            >
              Emergency insert
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setTargetDoctorId(undefined);
                setDelayModalOpen(true);
              }}
              icon={<Clock className="w-4 h-4" />}
            >
              Delay broadcast
            </Button>
          </div>
        }
      />

      {/* Toolbar: Department Filter Pills & Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-card bg-base border border-ink/10">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => handleDeptSelect('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
              selectedDeptId === 'all'
                ? 'bg-accent text-ink font-semibold'
                : 'bg-base text-ink border border-ink/20 hover:border-ink/40'
            }`}
          >
            All Departments ({doctors.length} Doctors)
          </button>
          {departments.map((dept) => {
            const isSelected = selectedDeptId === dept.id;
            const deptWaiting = queue_entries.filter(
              (q) => q.department_id === dept.id && q.status === 'waiting'
            ).length;

            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => handleDeptSelect(dept.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-accent text-ink font-semibold'
                    : 'bg-base text-ink border border-ink/20 hover:border-ink/40'
                }`}
              >
                <span>{dept.name}</span>
                {deptWaiting > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-ink text-base' : 'bg-ink/10 text-ink'
                    }`}
                  >
                    {deptWaiting}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 shrink-0 justify-between lg:justify-end border-t lg:border-t-0 pt-2 lg:pt-0 border-ink/10">
          <LiveIndicator label="Updated just now" />

          <button
            type="button"
            onClick={() => setShowExpected(!showExpected)}
            className="flex items-center gap-1.5 text-xs text-ink/75 hover:text-ink font-medium cursor-pointer"
          >
            {showExpected ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showExpected ? 'Hide expected' : 'Show expected'}</span>
          </button>
        </div>
      </div>

      {/* Main Multi-Doctor Columns Grid (Horizontal Scroll) */}
      <div className="overflow-x-auto overflow-y-hidden pb-6 -mx-4 md:-mx-8 px-4 md:px-8">
        <div className="inline-flex gap-5 min-w-full">
          {filteredDoctors.map((doc) => {
            const dept = departments.find((d) => d.id === doc.department_id)!;
            const waiting = queue_entries.filter(
              (q) => q.doctor_id === doc.id && q.status === 'waiting'
            );
            const active = queue_entries.find(
              (q) =>
                q.doctor_id === doc.id &&
                (q.status === 'in_consultation' || q.status === 'called')
            );
            const expected = showExpected
              ? appointments.filter(
                  (a) =>
                    a.doctor_id === doc.id &&
                    a.status === 'booked' &&
                    !queue_entries.some((q) => q.appointment_id === a.id)
                )
              : [];

            return (
              <QueueColumn
                key={doc.id}
                doctor={doc}
                department={dept}
                waitingEntries={waiting}
                activeEntry={active}
                appointmentsMap={appointmentsMap}
                countdownSeconds={calledCountdowns[doc.id] ?? 120}
                showExpected={showExpected}
                expectedAppointments={expected}
                onCallNext={handleCallNext}
                onCallAgain={handleCallAgain}
                onStartConsultation={handleStartConsultation}
                onCompleteConsultation={handleCompleteConsultation}
                onSkipEntry={handleSkip}
                onMarkNoShow={handleMarkNoShow}
                onTogglePriority={handleTogglePriority}
              />
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <EmergencyInsertModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        preselectedDoctorId={targetDoctorId}
      />

      <DelayBroadcastModal
        isOpen={delayModalOpen}
        onClose={() => setDelayModalOpen(false)}
        preselectedDoctorId={targetDoctorId}
      />
    </div>
  );
};
