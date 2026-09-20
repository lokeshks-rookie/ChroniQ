import React, { useState } from 'react';
import type { QueueEntry, Appointment } from '@/types';
import { TokenBadge } from './TokenBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTimeIST } from '@/lib/time';
import { MoreVertical, FastForward, UserX, Star, Clock } from 'lucide-react';

export interface QueueCardProps {
  entry: QueueEntry;
  appointment?: Appointment;
  onSkip: (id: string) => void;
  onMarkNoShow: (id: string) => void;
  onTogglePriority: (id: string) => void;
}

export const QueueCard: React.FC<QueueCardProps> = ({
  entry,
  appointment,
  onSkip,
  onMarkNoShow,
  onTogglePriority,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Calculate waiting time in minutes
  const arrivalTime = entry.checked_in_at ? new Date(entry.checked_in_at).getTime() : new Date(entry.sort_time).getTime();
  const waitingMinutes = Math.max(1, Math.floor((Date.now() - arrivalTime) / (60 * 1000)));

  const patientName = appointment?.patient.name || 'Patient';
  const ageGender = [
    appointment?.patient.age ? `${appointment.patient.age}y` : null,
    appointment?.patient.gender ? appointment.patient.gender[0].toUpperCase() : null,
  ]
    .filter(Boolean)
    .join(', ');

  const isEmergency = entry.priority === 0;
  const isPriority = entry.priority === 1;

  return (
    <div
      className={`relative p-4 rounded-card border transition-all duration-200 bg-base ${
        isEmergency
          ? 'border-danger ring-1 ring-danger/30'
          : isPriority
          ? 'border-accent bg-accent/5'
          : 'border-ink/15 hover:border-ink/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <TokenBadge token={entry.token} size="sm" />
          {entry.position && (
            <span className="text-xs font-semibold text-ink/70">
              #{entry.position}
            </span>
          )}
        </div>

        {/* Action Menu Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded text-ink/60 hover:text-ink hover:bg-ink/5 cursor-pointer"
            aria-label="Queue card options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-base border border-ink/15 rounded-card shadow-lg p-1 z-20 text-xs space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSkip(entry.id);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-ink/5 text-left text-ink cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Skip (move back)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onTogglePriority(entry.id);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-ink/5 text-left text-ink cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 text-accent" />
                  <span>{isPriority ? 'Remove Priority' : 'Move to Priority'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onMarkNoShow(entry.id);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-danger/10 text-left text-danger cursor-pointer font-medium"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Mark no-show</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Patient Name and Info */}
      <div className="mt-2.5">
        <div className="font-semibold text-sm text-ink truncate">{patientName}</div>
        <div className="text-xs text-ink/65 flex items-center gap-2 mt-0.5">
          {ageGender && <span>{ageGender}</span>}
          <span>•</span>
          <span className="capitalize">{appointment?.type === 'walk_in' ? 'Walk-in' : 'Booked'}</span>
          {appointment?.scheduled_start && (
            <>
              <span>•</span>
              <span>{formatTimeIST(appointment.scheduled_start)}</span>
            </>
          )}
        </div>
      </div>

      {/* Status Tags & Indicators */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-ink/10 text-xs">
        {isEmergency && <StatusBadge status="priority_0" size="sm" />}
        {isPriority && <StatusBadge status="priority_1" size="sm" />}

        {entry.is_late_arrival && (
          <span className="px-2 py-0.5 rounded-full bg-accent text-ink font-semibold text-[10px]">
            Late arrival
          </span>
        )}

        {entry.call_count > 0 && (
          <span className="px-2 py-0.5 rounded-full border border-ink/20 text-ink text-[10px]">
            Called ×{entry.call_count}
          </span>
        )}

        {entry.skip_count && entry.skip_count > 0 ? (
          <span className="px-2 py-0.5 rounded-full border border-ink/20 text-ink/70 text-[10px]">
            Skipped ×{entry.skip_count}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2 text-ink/75 font-mono text-xs">
          <span title="Waiting so far">Wait: {waitingMinutes}m</span>
          {entry.eta_minutes !== undefined && (
            <span className="font-semibold text-ink flex items-center gap-1 bg-ink/5 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3 text-ink/60" />
              ETA: ~{entry.eta_minutes}m
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
