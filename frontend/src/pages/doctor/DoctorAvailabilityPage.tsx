import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DoctorAvailabilityChip } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCurrentDoctor } from '@/hooks/useCurrentDoctor';
import {
  setDoctorAvailabilityStatus,
  createDoctorLeave,
  cancelDoctorScheduledLeave,
} from '@/services/doctorApi';
import { formatTimeIST, formatDateIST } from '@/lib/time';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { DoctorAvailabilityStatus, DoctorLeave } from '@/types';

export const DoctorAvailabilityPage: React.FC = () => {
  const {
    currentDoctor,
    availability,
    effectiveStatus,
    waitingEntries,
    myAppointmentsToday,
    myLeaves,
    addToast,
  } = useCurrentDoctor();

  const [activeTab, setActiveTab] = useState<DoctorAvailabilityStatus>('available');
  const [notifyPatients, setNotifyPatients] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Break form state
  const [breakDuration, setBreakDuration] = useState<number>(15);
  const [customBreak, setCustomBreak] = useState<string>('');
  const [breakReason, setBreakReason] = useState('');

  // Late form state
  const [lateMinutes, setLateMinutes] = useState<number>(20);
  const [customLate, setCustomLate] = useState<string>('');
  const [lateReason, setLateReason] = useState('');

  // Leave form state
  const [leaveDateFrom, setLeaveDateFrom] = useState('');
  const [leaveDateTo, setLeaveDateTo] = useState('');
  const [leaveType, setLeaveType] = useState<'full' | 'morning' | 'afternoon'>('full');
  const [leaveReason, setLeaveReason] = useState('');

  // Cancel leave state
  const [leaveToCancel, setLeaveToCancel] = useState<DoctorLeave | null>(null);

  // Break and late effective minutes
  const effectiveBreakMinutes = customBreak ? parseInt(customBreak, 10) || 15 : breakDuration;
  const effectiveLateMinutes = customLate ? parseInt(customLate, 10) || 20 : lateMinutes;

  // Expected arrival calculation for Late
  const expectedArrivalIso = useMemo(() => {
    const d = new Date(Date.now() + effectiveLateMinutes * 60 * 1000);
    return d.toISOString();
  }, [effectiveLateMinutes]);

  // Affected appointments for Leave date range
  const affectedLeaveAppointments = useMemo(() => {
    if (!leaveDateFrom) return [];
    const fromTime = new Date(leaveDateFrom).getTime();
    const toTime = leaveDateTo ? new Date(leaveDateTo).getTime() : fromTime;

    return myAppointmentsToday.filter((a) => {
      const aptTime = new Date(a.scheduled_start).getTime();
      return (
        (a.status === 'booked' || a.status === 'in_queue') &&
        aptTime >= fromTime &&
        aptTime <= toTime + 86400000
      );
    });
  }, [leaveDateFrom, leaveDateTo, myAppointmentsToday]);

  // Handlers
  const handleSaveAvailability = async () => {
    setIsProcessing(true);
    try {
      if (activeTab === 'available') {
        await setDoctorAvailabilityStatus({
          status: 'available',
          notify: false,
        });
        addToast({
          title: 'Status updated',
          description: 'You are now marked Available. Consultations can proceed normally.',
          variant: 'success',
        });
      } else if (activeTab === 'on_break') {
        const untilDate = new Date(Date.now() + effectiveBreakMinutes * 60 * 1000);
        await setDoctorAvailabilityStatus({
          status: 'on_break',
          until: untilDate.toISOString(),
          delay_minutes: effectiveBreakMinutes,
          reason: breakReason || 'Scheduled break',
          notify: notifyPatients,
        });
        addToast({
          title: 'On break',
          description: `Break scheduled for ${effectiveBreakMinutes} min. Auto-resumes at ${formatTimeIST(untilDate.toISOString())}.`,
          variant: 'info',
        });
      } else if (activeTab === 'late') {
        await setDoctorAvailabilityStatus({
          status: 'late',
          delay_minutes: effectiveLateMinutes,
          reason: lateReason || 'Transit delay',
          notify: notifyPatients,
        });
        addToast({
          title: 'Advisory posted',
          description: `Marked running late by ${effectiveLateMinutes} min. Waiting patient ETAs updated.`,
          variant: 'info',
        });
      } else if (activeTab === 'on_leave') {
        if (!leaveDateFrom) {
          addToast({
            title: 'Select start date',
            description: 'Please select when your leave begins.',
            variant: 'danger',
          });
          return;
        }

        const startIso = new Date(leaveDateFrom).toISOString();
        const endIso = leaveDateTo ? new Date(leaveDateTo).toISOString() : startIso;

        await createDoctorLeave({
          date_from: startIso,
          date_to: endIso,
          reason: `${leaveType.toUpperCase()} DAY: ${leaveReason || 'Doctor personal leave'}`,
        });

        // Reset form
        setLeaveDateFrom('');
        setLeaveDateTo('');
        setLeaveReason('');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndBreakEarly = async () => {
    setIsProcessing(true);
    try {
      await setDoctorAvailabilityStatus({
        status: 'available',
        notify: false,
      });
      addToast({
        title: 'Break ended early',
        description: 'Status restored to Available.',
        variant: 'success',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCancelLeave = async () => {
    if (!leaveToCancel) return;
    setIsProcessing(true);
    try {
      await cancelDoctorScheduledLeave(leaveToCancel.id);
      setLeaveToCancel(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const isCurrentlyOnBreak = effectiveStatus.status === 'on_break';
  const isCurrentlyLate = effectiveStatus.status === 'late';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <PageHeader
        eyebrow="CHAMBER AVAILABILITY"
        title="Availability"
        description="Manage your clinical presence, pause consultations for breaks, report transit delays, or schedule advance leaves."
      />

      {/* 1. Current Status Card */}
      <Card padding="lg" className="border-accent/30 bg-base space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-ink/60 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-ink inline-block" />
              <span>LIVE ACTIVE STATUS</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <DoctorAvailabilityChip
                status={effectiveStatus.status}
                lateMinutes={effectiveStatus.lateMinutes}
              />
              <span className="text-xs text-ink/60 font-mono">
                Since {formatTimeIST(availability.changed_at)}
              </span>
            </div>
          </div>

          {/* Quick resume shortcuts */}
          <div className="flex items-center gap-2">
            {isCurrentlyOnBreak && (
              <Button variant="primary" size="md" onClick={handleEndBreakEarly} disabled={isProcessing}>
                End break early
              </Button>
            )}
            {isCurrentlyLate && (
              <Button
                variant="primary"
                size="md"
                onClick={handleEndBreakEarly}
                disabled={isProcessing}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                I've arrived
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Plain-Language Effect Explainer */}
        <div className="p-4 rounded-card bg-base border border-ink/10 text-xs text-ink space-y-1">
          <div className="font-semibold text-ink flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Chamber & Queue Impact:</span>
          </div>
          <p className="text-ink/80 leading-relaxed">
            {effectiveStatus.status === 'available' &&
              'Consultations are active. Queue progression is running with normal live ETAs.'}
            {effectiveStatus.status === 'in_consultation' &&
              'Currently attending to an active patient in chamber. Call Next will unlock upon consultation completion.'}
            {effectiveStatus.status === 'on_break' &&
              `You are on break until ${effectiveStatus.until ? formatTimeIST(effectiveStatus.until) : 'scheduled return'}. Waiting patients' ETAs are shifted, and Call Next is disabled.`}
            {effectiveStatus.status === 'late' &&
              `Advisory active: Estimated ${effectiveStatus.lateMinutes} min delay. Waiting patients' ETAs are shifted by +${effectiveStatus.lateMinutes} min.`}
            {effectiveStatus.status === 'on_leave' &&
              'You are on scheduled leave. Your chamber queue is currently held.'}
          </p>
        </div>
      </Card>

      {/* 2. Set Status Section (Segmented Control & Specific Forms) */}
      <Card padding="lg" className="space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-ink/70 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-ink inline-block" />
            <span>UPDATE CHAMBER STATUS</span>
          </div>
          <h3 className="text-lg font-medium text-ink mt-0.5">Declare Presence or Absence</h3>
        </div>

        <div className="flex flex-wrap p-1 bg-ink/5 rounded-pill border border-ink/10 gap-1 w-full sm:w-max" role="tablist">
          {[
            { value: 'available', label: 'Available' },
            { value: 'on_break', label: 'On Break' },
            { value: 'late', label: 'Running Late' },
            { value: 'on_leave', label: 'Schedule Leave' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value as DoctorAvailabilityStatus)}
              className={`px-4 py-2 text-xs font-semibold rounded-pill transition-all cursor-pointer ${
                activeTab === tab.value
                  ? 'bg-ink text-base shadow-sm'
                  : 'text-ink/70 hover:text-ink hover:bg-ink/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Available */}
        {activeTab === 'available' && (
          <div className="space-y-4 p-4 rounded-card bg-base border border-ink/10 text-xs">
            <p className="text-sm font-medium text-ink">
              Ready to resume in-person consultations in {currentDoctor.room}.
            </p>
            <p className="text-ink/70 leading-relaxed">
              Setting your status to Available allows immediate patient calls from My Day and My Queue. Any active delay or break offset will be reset.
            </p>
          </div>
        )}

        {/* Tab 2: On Break */}
        {activeTab === 'on_break' && (
          <div className="space-y-4 p-4 rounded-card bg-base border border-ink/10">
            <div>
              <label className="text-xs font-semibold text-ink block mb-2">Break Duration</label>
              <div className="flex flex-wrap items-center gap-2">
                {[10, 15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setBreakDuration(mins);
                      setCustomBreak('');
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      breakDuration === mins && !customBreak
                        ? 'bg-accent text-ink font-bold'
                        : 'border border-ink/20 text-ink hover:border-ink/40'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Custom Minutes"
                placeholder="e.g. 25"
                value={customBreak}
                onChange={(e) => setCustomBreak(e.target.value)}
              />
              <Input
                label="Break Reason (Optional)"
                placeholder="e.g. Tea break, clinical review..."
                value={breakReason}
                onChange={(e) => setBreakReason(e.target.value)}
              />
            </div>

            <div className="p-3 bg-accent/10 border border-accent/30 rounded-card text-xs text-ink space-y-1">
              <div className="font-semibold">Automatic Return:</div>
              <div>
                A live timer will run. When the {effectiveBreakMinutes}-minute break elapses, your status will automatically revert to Available.
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Running Late */}
        {activeTab === 'late' && (
          <div className="space-y-4 p-4 rounded-card bg-base border border-ink/10">
            <div>
              <label className="text-xs font-semibold text-ink block mb-2">Estimated Transit Delay</label>
              <div className="flex flex-wrap items-center gap-2">
                {[10, 15, 20, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setLateMinutes(mins);
                      setCustomLate('');
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      lateMinutes === mins && !customLate
                        ? 'bg-accent text-ink font-bold'
                        : 'border border-ink/20 text-ink hover:border-ink/40'
                    }`}
                  >
                    +{mins} min
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Custom Delay Minutes"
                placeholder="e.g. 25"
                value={customLate}
                onChange={(e) => setCustomLate(e.target.value)}
              />
              <Input
                label="Reason for Delay"
                placeholder="e.g. Unforeseen traffic, emergency surgery..."
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
              />
            </div>

            <div className="text-xs text-ink/80 flex items-center gap-2 font-mono">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span>Expected Arrival: {formatTimeIST(expectedArrivalIso)}</span>
            </div>
          </div>
        )}

        {/* Tab 4: Schedule Leave */}
        {activeTab === 'on_leave' && (
          <div className="space-y-4 p-4 rounded-card bg-base border border-ink/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Leave Start Date"
                value={leaveDateFrom}
                onChange={(e) => setLeaveDateFrom(e.target.value)}
              />
              <Input
                type="date"
                label="Leave End Date (Optional if 1 day)"
                value={leaveDateTo}
                onChange={(e) => setLeaveDateTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink block">Leave Session</label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'full', label: 'Full Day' },
                  { id: 'morning', label: 'Morning Only (09:00 - 13:00)' },
                  { id: 'afternoon', label: 'Afternoon Only (14:00 - 17:00)' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setLeaveType(s.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      leaveType === s.id
                        ? 'bg-accent text-ink font-bold'
                        : 'border border-ink/20 text-ink hover:border-ink/40'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Reason for Leave"
              placeholder="e.g. Academic Conference, Family Leave, Emergency..."
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
            />

            {/* Expandable Affected Bookings List */}
            {affectedLeaveAppointments.length > 0 && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded-card space-y-2 text-xs">
                <div className="font-bold text-danger flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{affectedLeaveAppointments.length} Booked Appointments Require Rescheduling</span>
                </div>
                <p className="text-ink/80">
                  Booked patients will NOT be auto-cancelled. They will be marked with a "Needs reschedule" tag for front-desk priority reassignment.
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto pt-1">
                  {affectedLeaveAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between text-[11px] text-ink py-0.5">
                      <span>
                        {apt.patient.name} ({apt.booking_code})
                      </span>
                      <span className="font-mono">{formatTimeIST(apt.scheduled_start)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Impact Preview & Notification Toggle */}
        <div className="p-4 rounded-card bg-base border border-ink/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-ink uppercase tracking-wider text-[11px] block">
                Impact Preview
              </span>
              <span className="text-ink/80">
                {activeTab === 'available'
                  ? 'All waiting patients will proceed according to regular slot ETAs.'
                  : activeTab === 'on_break'
                  ? `${waitingEntries.length} waiting patients affected • Chamber ETAs shift by +${effectiveBreakMinutes} min`
                  : activeTab === 'late'
                  ? `${waitingEntries.length} waiting patients affected • Chamber ETAs shift by +${effectiveLateMinutes} min`
                  : `${affectedLeaveAppointments.length} existing bookings in selected range flagged for front-desk reschedule`}
              </span>
            </div>

            {/* Notification toggle */}
            {(activeTab === 'on_break' || activeTab === 'late') && (
              <Toggle
                label="Notify Patients"
                description="In-App & SMS push"
                checked={notifyPatients}
                onChange={setNotifyPatients}
              />
            )}
          </div>

          <div className="pt-3 border-t border-ink/10 flex items-center justify-end">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSaveAvailability}
              disabled={isProcessing}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {activeTab === 'available'
                ? 'Confirm available status'
                : activeTab === 'on_break'
                ? 'Start break'
                : activeTab === 'late'
                ? 'Publish delay advisory'
                : 'Confirm & schedule leave'}
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. Upcoming Leave Schedule */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between border-b border-ink/10 pb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-ink/70 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-ink inline-block" />
              <span>SCHEDULED LEAVES</span>
            </div>
            <h3 className="text-base font-semibold text-ink mt-0.5">Upcoming Planned Absences</h3>
          </div>
          <span className="text-xs text-ink/60">Front desk is notified immediately</span>
        </div>

        {myLeaves.length === 0 ? (
          <div className="text-xs text-ink/60 py-6 text-center">No upcoming leaves scheduled.</div>
        ) : (
          <div className="space-y-2">
            {myLeaves.map((leave) => {
              const isStarted = new Date(leave.date_from).getTime() <= Date.now();

              return (
                <div
                  key={leave.id}
                  className="p-3 rounded-card border border-ink/10 bg-base flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-ink flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      <span>
                        {formatDateIST(leave.date_from)}
                        {leave.date_to !== leave.date_from && ` – ${formatDateIST(leave.date_to)}`}
                      </span>
                    </div>
                    <p className="text-ink/70">{leave.reason}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {isStarted ? (
                      <span className="text-[11px] text-ink/50 italic">Active leave</span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setLeaveToCancel(leave)}
                        icon={<XCircle className="w-3.5 h-3.5 text-danger" />}
                      >
                        Cancel leave
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Cancel Leave Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(leaveToCancel)}
        onClose={() => setLeaveToCancel(null)}
        onConfirm={handleConfirmCancelLeave}
        title="Cancel planned leave?"
        description={`Cancel your scheduled absence for ${
          leaveToCancel ? formatDateIST(leaveToCancel.date_from) : ''
        }? Open slots will be restored.`}
        confirmLabel="Cancel leave"
        isDestructive={true}
      />
    </div>
  );
};
