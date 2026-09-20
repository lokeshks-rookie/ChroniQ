import React from 'react';
import type { AppointmentStatus, QueueStatus } from '@/types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Megaphone,
  Stethoscope,
  AlertTriangle,
  Siren,
  Calendar,
} from 'lucide-react';

export interface StatusBadgeProps {
  status: AppointmentStatus | QueueStatus | 'priority_1' | 'priority_0';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  // Section 3.5 Status Mapping Rules
  switch (status) {
    case 'booked':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-ink/20 text-ink bg-transparent font-medium ${sizeClasses}`}>
          <Calendar className="w-3.5 h-3.5 text-ink/70" strokeWidth={1.75} />
          <span>{label || 'Booked'}</span>
        </span>
      );

    case 'rescheduled':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-ink/20 text-ink bg-transparent font-medium ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-ink/70" strokeWidth={1.75} />
          <span>{label || 'Rescheduled'}</span>
        </span>
      );

    case 'expired':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-ink/20 text-ink bg-transparent font-medium ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-ink/70" strokeWidth={1.75} />
          <span>{label || 'Expired'}</span>
        </span>
      );

    case 'checked_in':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-accent text-ink font-medium ${sizeClasses}`}>
          <UserCheck className="w-3.5 h-3.5 text-ink" strokeWidth={1.75} />
          <span>{label || 'Checked in'}</span>
        </span>
      );

    case 'waiting':
    case 'in_queue':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-accent text-ink font-medium ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-ink" strokeWidth={1.75} />
          <span>{label || 'In queue'}</span>
        </span>
      );

    case 'called':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-accent text-ink font-semibold ${sizeClasses}`}>
          <Megaphone className="w-3.5 h-3.5 text-ink" strokeWidth={1.75} />
          <span>{label || 'Called'}</span>
        </span>
      );

    case 'in_consultation':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-ink text-base font-medium ${sizeClasses}`}>
          <Stethoscope className="w-3.5 h-3.5 text-base" strokeWidth={1.75} />
          <span>{label || 'In consultation'}</span>
        </span>
      );

    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-success/15 text-success border border-success/30 font-medium ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-success" strokeWidth={1.75} />
          <span>{label || 'Completed'}</span>
        </span>
      );

    case 'cancelled':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-danger/15 text-danger border border-danger/30 font-medium ${sizeClasses}`}>
          <XCircle className="w-3.5 h-3.5 text-danger" strokeWidth={1.75} />
          <span>{label || 'Cancelled'}</span>
        </span>
      );

    case 'no_show':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-danger/15 text-danger border border-danger/30 font-medium ${sizeClasses}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-danger" strokeWidth={1.75} />
          <span>{label || 'No show'}</span>
        </span>
      );

    case 'priority_1':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-accent text-ink font-medium ${sizeClasses}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-ink" strokeWidth={1.75} />
          <span>{label || 'Priority'}</span>
        </span>
      );

    case 'priority_0':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-danger text-base font-semibold ${sizeClasses}`}>
          <Siren className="w-3.5 h-3.5 text-base" strokeWidth={1.75} />
          <span>{label || 'Emergency'}</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-ink/20 text-ink bg-transparent font-medium ${sizeClasses}`}>
          <span>{label || String(status)}</span>
        </span>
      );
  }
};

/**
 * Doctor Availability Chip (Section 3.5)
 */
export interface DoctorAvailabilityChipProps {
  status: 'available' | 'in_consultation' | 'break' | 'on_break' | 'late' | 'leave' | 'on_leave';
  lateMinutes?: number;
}

export const DoctorAvailabilityChip: React.FC<DoctorAvailabilityChipProps> = ({ status, lateMinutes = 0 }) => {
  switch (status) {
    case 'available':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>Available</span>
        </span>
      );
    case 'in_consultation':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
          <span className="w-2 h-2 rounded-full bg-ink" />
          <span>In consultation</span>
        </span>
      );
    case 'break':
    case 'on_break':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span>On break</span>
        </span>
      );
    case 'late':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span>Late {lateMinutes > 0 ? `(${lateMinutes}m)` : ''}</span>
        </span>
      );
    case 'leave':
    case 'on_leave':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/70">
          <span className="w-2 h-2 rounded-full border border-ink/40 bg-transparent" />
          <span>On leave</span>
        </span>
      );
  }
};
