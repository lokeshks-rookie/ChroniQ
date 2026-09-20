import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge, DoctorAvailabilityChip } from '@/components/ui/StatusBadge';
import { TokenBadge } from '@/components/queue/TokenBadge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useCurrentDoctor } from '@/hooks/useCurrentDoctor';
import { useUiStore } from '@/store/uiStore';
import {
  callNextDoctorPatient,
  setDoctorAvailabilityStatus,
} from '@/services/doctorApi';
import { formatTimeIST, formatDateIST } from '@/lib/time';
import {
  Clock,
  Coffee,
  Calendar,
  Play,
  ArrowRight,
  AlertTriangle,
  Siren,
  Bell,
  X,
  History,
  FileText,
} from 'lucide-react';
import type { Appointment, ConsultationNote } from '@/types';

export const MyDayPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentDoctor,
    myDepartment,
    effectiveStatus,
    activeEntry,
    waitingEntries,
    myAppointmentsToday,
    mySchedule,
    myLeaves,
    myConsultationNotes,
    myAlerts,
    addToast,
  } = useCurrentDoctor();

  const { dismissAlert } = useUiStore();

  // Selected appointment for detail Drawer
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filterPill, setFilterPill] = useState<'all' | 'waiting' | 'completed' | 'no_show'>('all');

  // Quick modals for Take Break and Running Late
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState(15);
  const [breakReason, setBreakReason] = useState('');

  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [lateMinutes, setLateMinutes] = useState(15);
  const [lateReason, setLateReason] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  // Statistics counters
  const totalToday = myAppointmentsToday.length;
  const completedCount = myAppointmentsToday.filter((a) => a.status === 'completed').length;
  const waitingNow = waitingEntries.length;
  const inConsultationCount = activeEntry && activeEntry.status === 'in_consultation' ? 1 : 0;
  const noShowCount = myAppointmentsToday.filter((a) => a.status === 'no_show').length;

  // Schedule Pace Indicator calculation:
  // compare scheduled start of first non-terminal/waiting appointment to current time
  const paceIndicator = useMemo(() => {
    const nextApt = myAppointmentsToday.find(
      (a) => a.status === 'in_queue' || a.status === 'in_consultation' || a.status === 'booked'
    );
    if (!nextApt) return { label: 'On schedule', delta: 0, status: 'on_time' };

    const scheduledTime = new Date(nextApt.scheduled_start).getTime();
    const now = Date.now();
    const diffMinutes = Math.round((now - scheduledTime) / (60 * 1000));

    if (diffMinutes > 10) {
      return { label: `${diffMinutes} min behind`, delta: diffMinutes, status: 'behind' };
    }
    if (diffMinutes < -10) {
      return { label: `${Math.abs(diffMinutes)} min ahead`, delta: diffMinutes, status: 'ahead' };
    }
    return { label: 'On schedule', delta: 0, status: 'on_time' };
  }, [myAppointmentsToday]);

  // Projected finish time:
  // remaining patients * avg consult minutes
  const projectedFinish = useMemo(() => {
    const remainingCount = waitingEntries.length + (activeEntry ? 1 : 0);
    const estRemainingMins = remainingCount * currentDoctor.avg_consult_minutes;

    const finishDate = new Date(Date.now() + estRemainingMins * 60 * 1000);
    const finishTimeStr = formatTimeIST(finishDate.toISOString());

    // Compare with shift end (e.g. 5:00 PM / 17:00)
    const isPastShift = finishDate.getHours() >= 17 && finishDate.getMinutes() > 0;

    return {
      finishTimeStr,
      isPastShift,
      remainingCount,
    };
  }, [waitingEntries.length, activeEntry, currentDoctor.avg_consult_minutes]);

  // Filtered timeline rows
  const filteredTimeline = useMemo(() => {
    return myAppointmentsToday.filter((apt) => {
      if (filterPill === 'waiting') return apt.status === 'in_queue' || apt.status === 'called';
      if (filterPill === 'completed') return apt.status === 'completed';
      if (filterPill === 'no_show') return apt.status === 'no_show';
      return true;
    });
  }, [myAppointmentsToday, filterPill]);

  // Next 7 days strip data
  const next7Days = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isToday = i === 0;
      const dayIso = d.toISOString().split('T')[0];

      // Check if doctor has leave on this day
      const hasLeave = myLeaves.some((l) => {
        const start = l.date_from.split('T')[0];
        const end = l.date_to.split('T')[0];
        return dayIso >= start && dayIso <= end;
      });

      // Mock appointment count for upcoming days
      const count = isToday ? totalToday : hasLeave ? 0 : 8 + ((i * 3) % 7);

      days.push({
        date: d,
        dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        dateNum: d.getDate(),
        isToday,
        hasLeave,
        count,
      });
    }
    return days;
  }, [totalToday, myLeaves]);

  // Actions
  const handleCallNext = async () => {
    setIsProcessing(true);
    try {
      const res = await callNextDoctorPatient();
      if (res.success) {
        navigate('/doctor/queue');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyBreak = async () => {
    setIsProcessing(true);
    try {
      const untilDate = new Date(Date.now() + breakMinutes * 60 * 1000);
      await setDoctorAvailabilityStatus({
        status: 'on_break',
        until: untilDate.toISOString(),
        delay_minutes: breakMinutes,
        reason: breakReason || 'Clinical recess',
        notify: true,
      });
      setBreakModalOpen(false);
      setBreakReason('');
      addToast({
        title: 'Break scheduled',
        description: `Status set to On Break for ${breakMinutes} min.`,
        variant: 'info',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyLate = async () => {
    setIsProcessing(true);
    try {
      await setDoctorAvailabilityStatus({
        status: 'late',
        delay_minutes: lateMinutes,
        reason: lateReason || 'Transit delay',
        notify: true,
      });
      setLateModalOpen(false);
      setLateReason('');
      addToast({
        title: 'Advisory posted',
        description: `Delay advisory of ${lateMinutes} min posted.`,
        variant: 'info',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResumeAvailability = async () => {
    setIsProcessing(true);
    try {
      await setDoctorAvailabilityStatus({
        status: 'available',
        notify: false,
      });
      addToast({
        title: 'Welcome back',
        description: 'Status set to Available.',
        variant: 'success',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isUnavailable =
    effectiveStatus.status === 'on_break' ||
    effectiveStatus.status === 'on_leave' ||
    effectiveStatus.status === 'late';

  const nextWaiting = waitingEntries[0];
  const selectedNote: ConsultationNote | undefined = selectedAppointment
    ? myConsultationNotes.find((n) => n.appointment_id === selectedAppointment.id)
    : undefined;

  return (
    <div className="space-y-8">
      {/* 1. Header with Title, Date, Availability Chip and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink/70 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-ink inline-block" />
            <span>MY DAY • {formatDateIST(new Date().toISOString())}</span>
          </div>
          <h1 className="text-3xl font-medium text-ink mt-0.5">My day</h1>
          <p className="text-xs text-ink/70 mt-0.5">
            {currentDoctor.name} • {myDepartment?.name} ({currentDoctor.room})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full border border-ink/10 bg-base flex items-center gap-2">
            <DoctorAvailabilityChip
              status={effectiveStatus.status}
              lateMinutes={effectiveStatus.lateMinutes}
            />
          </div>

          {isUnavailable ? (
            <Button variant="primary" size="sm" onClick={handleResumeAvailability} disabled={isProcessing}>
              Resume
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBreakModalOpen(true)}
                icon={<Coffee className="w-3.5 h-3.5" />}
              >
                Take break
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLateModalOpen(true)}
                icon={<Clock className="w-3.5 h-3.5" />}
              >
                Running late
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Stat Row (StatCards, live) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Total Today" value={totalToday} subtitle="Bookings & Walk-ins" />
        <StatCard title="Completed" value={completedCount} subtitle={`${totalToday - completedCount} remaining`} />
        <StatCard title="Waiting Now" value={waitingNow} subtitle="In waiting chamber" />
        <StatCard title="In Chamber" value={inConsultationCount} subtitle={activeEntry ? activeEntry.token : 'None'} />
        <StatCard title="No-Shows" value={noShowCount} subtitle="Released slots" />
        <StatCard
          title="Avg Consult"
          value={`${currentDoctor.avg_consult_minutes}m`}
          subtitle={`Slot length: ${mySchedule?.slot_minutes || 15}m`}
        />
      </div>

      {/* 3. Feature Band: Ink Band "■ RIGHT NOW" (The page's ONE feature band) */}
      <div className="p-6 md:p-8 rounded-card bg-ink text-base space-y-6">
        <div className="text-xs uppercase tracking-wider font-semibold text-base/60 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>■ RIGHT NOW</span>
        </div>

        {/* State A: In Consultation */}
        {activeEntry && activeEntry.status === 'in_consultation' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="text-xs text-base/70 font-semibold uppercase tracking-wider">
                Active Consultation in Chamber
              </div>
              <div className="text-5xl font-bold font-mono text-base tracking-tight">{activeEntry.token}</div>
              <div className="text-lg font-medium text-base">
                {myAppointmentsToday.find((a) => a.id === activeEntry.appointment_id)?.patient.name || 'Patient'}
              </div>
              <div className="text-xs text-base/70">
                Started at {activeEntry.started_at ? formatTimeIST(activeEntry.started_at) : 'recently'}
              </div>
            </div>

            <Button
              variant="inverted"
              size="lg"
              onClick={() => navigate('/doctor/queue')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Open queue control
            </Button>
          </div>
        )}

        {/* State B: On Break / Late / Leave */}
        {(!activeEntry || activeEntry.status !== 'in_consultation') && isUnavailable && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="text-xs text-base/70 font-semibold uppercase tracking-wider">
                Chamber Paused
              </div>
              <div className="text-3xl font-bold text-base capitalize">
                Status: {effectiveStatus.status.replace('_', ' ')}
              </div>
              <p className="text-xs text-base/70 max-w-md">
                {effectiveStatus.status === 'on_break' &&
                  `You are on break until ${effectiveStatus.until ? formatTimeIST(effectiveStatus.until) : 'scheduled time'}. Resume to proceed with patient consultations.`}
                {effectiveStatus.status === 'late' &&
                  `Running late advisory posted (+${effectiveStatus.lateMinutes}m). Click below once you arrive.`}
                {effectiveStatus.status === 'on_leave' &&
                  'You are on scheduled leave today. Chamber consultations are suspended.'}
              </p>
            </div>

            <Button
              variant="inverted"
              size="lg"
              onClick={handleResumeAvailability}
              disabled={isProcessing}
            >
              {effectiveStatus.status === 'late' ? "I've arrived" : 'Resume availability'}
            </Button>
          </div>
        )}

        {/* State C: Normal Waiting or Empty */}
        {(!activeEntry || activeEntry.status !== 'in_consultation') && !isUnavailable && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {nextWaiting ? (
              <>
                <div className="space-y-2">
                  <div className="text-xs text-base/70 font-semibold uppercase tracking-wider">
                    Next Patient Ready for Call
                  </div>
                  <div className="text-4xl sm:text-5xl font-bold font-mono text-base tracking-tight">
                    {nextWaiting.token}
                  </div>
                  <div className="text-lg font-medium text-base">
                    {myAppointmentsToday.find((a) => a.id === nextWaiting.appointment_id)?.patient.name || 'Patient'}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-base/70">
                    <span>Wait: ~{nextWaiting.eta_minutes || 5} min</span>
                    {nextWaiting.priority === 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-accent text-ink font-bold text-[10px]">
                        Priority Patient
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="inverted"
                  size="lg"
                  onClick={handleCallNext}
                  disabled={isProcessing}
                  icon={<Play className="w-4 h-4" />}
                >
                  Call next
                </Button>
              </>
            ) : (
              <div className="py-2 space-y-1">
                <div className="text-lg font-medium text-base">No patients currently waiting</div>
                <div className="text-xs text-base/70">
                  Upcoming bookings will appear here upon reception desk check-in.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Schedule Pace & Projected Finish Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md" className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink/60 tracking-wider">Schedule Pace</span>
            <div className="text-base font-semibold text-ink flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  paceIndicator.status === 'behind'
                    ? 'bg-accent'
                    : paceIndicator.status === 'ahead'
                    ? 'bg-info'
                    : 'bg-success'
                }`}
              />
              <span>{paceIndicator.label}</span>
            </div>
          </div>
          <span className="text-xs text-ink/60">Relative to slot start</span>
        </Card>

        <Card padding="md" className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink/60 tracking-wider">Projected Finish</span>
            <div className="text-base font-semibold text-ink flex items-center gap-2">
              <span>Shift ends 5:00 PM • Projected {projectedFinish.finishTimeStr}</span>
            </div>
          </div>
          {projectedFinish.isPastShift && (
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-accent text-ink">
              Extended
            </span>
          )}
        </Card>
      </div>

      {/* 5. Today's Schedule Timeline & Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Schedule Timeline (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-ink/70 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-ink inline-block" />
                  <span>TODAY'S TIMELINE</span>
                </div>
                <h3 className="text-base font-semibold text-ink mt-0.5">Appointment Slots</h3>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 text-xs">
                {(['all', 'waiting', 'completed', 'no_show'] as const).map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setFilterPill(pill)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer capitalize transition-colors ${
                      filterPill === pill
                        ? 'bg-accent text-ink'
                        : 'border border-ink/15 text-ink/70 hover:border-ink/30'
                    }`}
                  >
                    {pill.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline Rows */}
            <div className="space-y-2 relative">
              {filteredTimeline.map((apt) => {
                const qEntry = waitingEntries.find((q) => q.appointment_id === apt.id);
                const isSelected = selectedAppointment?.id === apt.id;

                return (
                  <div
                    key={apt.id}
                    onClick={() => setSelectedAppointment(apt)}
                    className={`p-3 rounded-card border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-ink bg-ink/5'
                        : apt.status === 'in_consultation'
                        ? 'border-success/50 bg-success/5'
                        : 'border-ink/10 bg-base hover:border-ink/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-mono font-semibold text-ink w-16">
                        {formatTimeIST(apt.scheduled_start)}
                      </div>

                      <div className="w-px h-6 bg-ink/10" />

                      <div>
                        <div className="font-semibold text-xs text-ink flex items-center gap-2">
                          <span>{apt.patient.name}</span>
                          {qEntry?.token && <TokenBadge token={qEntry.token} size="sm" />}
                        </div>
                        <div className="text-[11px] text-ink/60">
                          {apt.patient.age}y • {apt.patient.gender} • {apt.reason}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={apt.status} />
                      <ArrowRight className="w-3.5 h-3.5 text-ink/40" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: Doctor Alerts Feed & Next 7 Days Strip (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Alerts Feed */}
          <Card padding="md" className="space-y-3">
            <div className="flex items-center justify-between border-b border-ink/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-accent" />
                <span>My Alerts ({myAlerts.length})</span>
              </span>
            </div>

            {myAlerts.length === 0 ? (
              <div className="text-xs text-ink/60 py-4 text-center">No active alerts.</div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {myAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-card border border-ink/10 bg-base space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink flex items-center gap-1.5">
                        {alert.severity === 'danger' && <Siren className="w-3 h-3 text-danger" />}
                        {alert.severity === 'warning' && <AlertTriangle className="w-3 h-3 text-accent" />}
                        <span>{alert.title}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => dismissAlert(alert.id)}
                        className="text-ink/40 hover:text-ink cursor-pointer p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-ink/80 text-[11px] leading-relaxed">{alert.message}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-ink/50">
                      <span>{alert.time}</span>
                      {alert.actionUrl && (
                        <button
                          type="button"
                          onClick={() => navigate(alert.actionUrl!)}
                          className="font-semibold text-accent hover:underline cursor-pointer"
                        >
                          {alert.actionLabel || 'View'} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Next 7 Days Strip */}
          <Card padding="md" className="space-y-3">
            <div className="flex items-center justify-between border-b border-ink/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span>Next 7 Days</span>
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {next7Days.map((day) => (
                <div
                  key={day.dayName + day.dateNum}
                  className={`p-2 rounded-lg text-xs space-y-1 transition-all ${
                    day.isToday
                      ? 'bg-ink text-base font-bold'
                      : day.hasLeave
                      ? 'bg-accent/15 border border-accent/40 text-ink'
                      : 'bg-base border border-ink/10 text-ink'
                  }`}
                >
                  <div className="text-[10px] uppercase font-mono opacity-80">{day.dayName}</div>
                  <div className="font-bold text-sm">{day.dateNum}</div>
                  <div className="text-[10px] opacity-75 font-mono">
                    {day.hasLeave ? 'Leave' : `${day.count}`}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Patient Snapshot Drawer */}
      <Drawer
        isOpen={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        title={selectedAppointment?.patient.name || 'Patient Detail'}
        eyebrow="PATIENT SNAPSHOT"
        width="md"
        footer={
          <Button variant="secondary" size="md" onClick={() => setSelectedAppointment(null)}>
            Close
          </Button>
        }
      >
        {selectedAppointment && (
          <div className="space-y-6 text-xs">
            {/* Snapshot Row */}
            <div className="p-4 rounded-card bg-base border border-ink/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-ink">{selectedAppointment.patient.name}</div>
                  <div className="text-ink/60">
                    {selectedAppointment.patient.age} yrs • {selectedAppointment.patient.gender} • Booking:{' '}
                    {selectedAppointment.booking_code}
                  </div>
                </div>
                <StatusBadge status={selectedAppointment.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ink/10 text-ink">
                <div>
                  <span className="text-ink/60 block text-[10px] uppercase">Scheduled Time</span>
                  <span className="font-mono font-semibold">{formatTimeIST(selectedAppointment.scheduled_start)}</span>
                </div>
                <div>
                  <span className="text-ink/60 block text-[10px] uppercase">Fee</span>
                  <span className="font-mono font-semibold">₹{selectedAppointment.fee}</span>
                </div>
              </div>
            </div>

            {/* Reason and Symptoms */}
            <div className="space-y-1">
              <span className="font-bold text-ink/60 uppercase tracking-wider text-[10px]">Reason for Consultation</span>
              <p className="font-semibold text-ink text-sm">{selectedAppointment.reason}</p>
              <p className="text-ink/75 italic">{selectedAppointment.symptoms_note}</p>
            </div>

            {/* Hospital History Peek */}
            <div className="p-3 rounded-card bg-base border border-ink/10 space-y-1">
              <span className="font-bold text-ink/60 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <History className="w-3 h-3" />
                <span>Visit History</span>
              </span>
              <div className="font-semibold text-ink">
                {selectedAppointment.patient.past_visits_count
                  ? `${selectedAppointment.patient.past_visits_count} previous consultations`
                  : 'First visit at this hospital'}
              </div>
              {selectedAppointment.patient.last_visit_date && (
                <div className="text-ink/70">
                  Last recorded visit: {formatDateIST(selectedAppointment.patient.last_visit_date)}
                </div>
              )}
            </div>

            {/* Finalized Note (for completed consultations) */}
            {selectedNote && (
              <div className="space-y-2 pt-2 border-t border-ink/10">
                <span className="font-bold text-ink/60 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  <span>Finalized Clinical Note</span>
                </span>
                <div className="p-3 rounded-card bg-base/50 border border-ink/10 whitespace-pre-wrap text-ink leading-relaxed">
                  {selectedNote.text}
                </div>
                <div className="text-[11px] text-ink/60">
                  Follow-up:{' '}
                  <span className="font-semibold text-ink capitalize">
                    {selectedNote.follow_up.replace('_', ' ')}
                  </span>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-2 pt-2 border-t border-ink/10">
              <span className="font-bold text-ink/60 uppercase tracking-wider text-[10px]">Status History</span>
              <div className="space-y-1 font-mono text-[11px]">
                {selectedAppointment.status_history.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between text-ink/70">
                    <span className="capitalize">{ev.status.replace('_', ' ')}</span>
                    <span>{formatTimeIST(ev.at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Break Scheduling Modal */}
      <Modal
        isOpen={breakModalOpen}
        onClose={() => setBreakModalOpen(false)}
        title="Take a break"
        eyebrow="SCHEDULE PAUSE"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setBreakModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleApplyBreak} disabled={isProcessing}>
              Confirm break
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink block mb-2">Break Duration</label>
            <div className="flex flex-wrap items-center gap-2">
              {[10, 15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setBreakMinutes(mins)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    breakMinutes === mins
                      ? 'bg-accent text-ink'
                      : 'border border-ink/20 text-ink hover:border-ink/40'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Optional Reason / Note"
            placeholder="e.g. Clinical rounds, conference..."
            value={breakReason}
            onChange={(e) => setBreakReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Running Late Modal */}
      <Modal
        isOpen={lateModalOpen}
        onClose={() => setLateModalOpen(false)}
        title="Report running late"
        eyebrow="ADVISORY"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setLateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleApplyLate} disabled={isProcessing}>
              Post advisory
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink block mb-2">Expected Delay</label>
            <div className="flex flex-wrap items-center gap-2">
              {[10, 15, 20, 30, 45].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setLateMinutes(mins)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    lateMinutes === mins
                      ? 'bg-accent text-ink'
                      : 'border border-ink/20 text-ink hover:border-ink/40'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Reason for Delay"
            placeholder="e.g. Unforeseen traffic, emergency..."
            value={lateReason}
            onChange={(e) => setLateReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
