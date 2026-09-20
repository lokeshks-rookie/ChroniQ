import React from 'react';
import type { Doctor, Department, QueueEntry, Appointment } from '@/types';
import { NowServingCard } from './NowServingCard';
import { QueueCard } from './QueueCard';
import { DoctorAvailabilityChip } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface QueueColumnProps {
  doctor: Doctor;
  department: Department;
  waitingEntries: QueueEntry[];
  activeEntry?: QueueEntry | null;
  appointmentsMap: Map<string, Appointment>;
  countdownSeconds?: number;
  showExpected?: boolean;
  expectedAppointments?: Appointment[];
  onCallNext: (doctorId: string) => void;
  onCallAgain: (doctorId: string) => void;
  onStartConsultation: (doctorId: string) => void;
  onCompleteConsultation: (doctorId: string) => void;
  onSkipEntry: (entryId: string) => void;
  onMarkNoShow: (entryId: string) => void;
  onTogglePriority: (entryId: string) => void;
}

export const QueueColumn: React.FC<QueueColumnProps> = React.memo(
  ({
    doctor,
    department,
    waitingEntries,
    activeEntry,
    appointmentsMap,
    countdownSeconds = 120,
    showExpected = false,
    expectedAppointments = [],
    onCallNext,
    onCallAgain,
    onStartConsultation,
    onCompleteConsultation,
    onSkipEntry,
    onMarkNoShow,
    onTogglePriority,
  }) => {
    // Derive doctor availability
    let availability: 'available' | 'in_consultation' | 'break' | 'late' | 'leave' = 'available';
    if (!doctor.is_active) {
      availability = 'leave';
    } else if (activeEntry?.status === 'in_consultation') {
      availability = 'in_consultation';
    }

    const activeApt = activeEntry ? appointmentsMap.get(activeEntry.appointment_id) : undefined;

    return (
      <div className="w-[340px] shrink-0 flex flex-col rounded-panel border border-ink/15 bg-base/60 p-4 space-y-4">
        {/* Doctor Column Header */}
        <div className="p-3 bg-base border border-ink/10 rounded-card space-y-2.5">
          <div className="flex items-center gap-3">
            <Avatar name={doctor.name} photoUrl={doctor.photo_url} size="md" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-ink truncate" title={doctor.name}>
                {doctor.name}
              </div>
              <div className="text-xs text-ink/65 truncate">
                {department.name} • {doctor.room || department.room}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-ink/10">
            <DoctorAvailabilityChip status={availability} />
            <div className="flex items-center gap-1 text-ink/70 font-mono" title="Rolling average consult time">
              <Clock className="w-3 h-3 text-ink/50" />
              <span>~{doctor.avg_consult_minutes}m/pt</span>
            </div>
          </div>
        </div>

        {/* Now Serving / Called Card */}
        <NowServingCard
          currentEntry={activeEntry}
          currentAppointment={activeApt}
          countdownSeconds={countdownSeconds}
          waitingCount={waitingEntries.length}
          onCallNext={() => onCallNext(doctor.id)}
          onCallAgain={() => onCallAgain(doctor.id)}
          onStartConsultation={() => onStartConsultation(doctor.id)}
          onCompleteConsultation={() => onCompleteConsultation(doctor.id)}
          onMarkNoShow={() => activeEntry && onMarkNoShow(activeEntry.id)}
        />

        {/* Waiting List Section */}
        <div className="space-y-2 flex-1 min-h-[160px]">
          <div className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-ink/70">
            <span>Waiting Queue</span>
            <span className="bg-ink/10 px-2 py-0.5 rounded-full text-[11px] font-bold">
              {waitingEntries.length}
            </span>
          </div>

          {waitingEntries.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink/50 border border-dashed border-ink/20 rounded-card">
              No patients waiting in queue
            </div>
          ) : (
            <div className="space-y-2.5">
              {waitingEntries.map((entry) => (
                <QueueCard
                  key={entry.id}
                  entry={entry}
                  appointment={appointmentsMap.get(entry.appointment_id)}
                  onSkip={onSkipEntry}
                  onMarkNoShow={onMarkNoShow}
                  onTogglePriority={onTogglePriority}
                />
              ))}
            </div>
          )}
        </div>

        {/* Expected (not yet checked-in) Section */}
        {showExpected && expectedAppointments.length > 0 && (
          <div className="pt-3 border-t border-dashed border-ink/20 space-y-2">
            <div className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-ink/60">
              <span>Expected ({expectedAppointments.length})</span>
              <span className="text-[10px] text-ink/50">Booked today</span>
            </div>
            <div className="space-y-1.5">
              {expectedAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-2.5 rounded-lg border border-ink/10 bg-base/70 text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-ink truncate">{apt.patient.name}</div>
                    <div className="text-[11px] text-ink/60 font-mono">
                      {new Date(apt.scheduled_start).toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </div>
                  </div>
                  <Link
                    to={`/admin/checkin?code=${apt.booking_code}`}
                    className="px-2 py-1 rounded bg-ink text-base text-[10px] font-medium hover:opacity-90 shrink-0"
                  >
                    Check in
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

QueueColumn.displayName = 'QueueColumn';
