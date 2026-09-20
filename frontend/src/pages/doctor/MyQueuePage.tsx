import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, DoctorAvailabilityChip } from '@/components/ui/StatusBadge';
import { TokenBadge } from '@/components/queue/TokenBadge';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Accordion } from '@/components/ui/StatCard';
import { useCurrentDoctor } from '@/hooks/useCurrentDoctor';
import {
  callNextDoctorPatient,
  callDoctorPatientAgain,
  startDoctorConsultation,
  completeDoctorConsultation,
  markDoctorPatientNoShow,
  saveConsultationDraftNote,
  setDoctorAvailabilityStatus,
} from '@/services/doctorApi';
import { formatTimeIST, formatDateIST } from '@/lib/time';
import {
  Coffee,
  Clock,
  Siren,
  CheckCircle2,
  PhoneCall,
  UserX,
  Keyboard,
  History,
  FileText,
  Play,
  ArrowRight,
} from 'lucide-react';
import type { ConsultationNote, QueueEntry } from '@/types';

export const MyQueuePage: React.FC = () => {
  const {
    doctorId,
    currentDoctor,
    myDepartment,
    effectiveStatus,
    activeEntry,
    waitingEntries,
    completedToday,
    myAppointmentsToday,
    myConsultationNotes,
    calledSecondsRemaining,
    addToast,
  } = useCurrentDoctor();

  // Elapsed timer for active consultation
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Note editor states
  const [noteText, setNoteText] = useState('');
  const [followUp, setFollowUp] = useState<ConsultationNote['follow_up']>('none');
  const [followUpDate, setFollowUpDate] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Modals & Drawers
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState(15);
  const [breakReason, setBreakReason] = useState('');

  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [lateMinutes, setLateMinutes] = useState(15);
  const [lateReason, setLateReason] = useState('');

  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [noShowConfirmOpen, setNoShowConfirmOpen] = useState(false);
  const [selectedCompletedNote, setSelectedCompletedNote] = useState<ConsultationNote | null>(null);
  const [selectedCompletedEntry, setSelectedCompletedEntry] = useState<QueueEntry | null>(null);

  // Up next display toggles
  const [showAllWaiting, setShowAllWaiting] = useState(false);
  const [showExpected, setShowExpected] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const callNextButtonRef = useRef<HTMLButtonElement | null>(null);

  // Find active appointment matching active queue entry
  const activeAppointment = useMemo(() => {
    if (!activeEntry) return null;
    return myAppointmentsToday.find((a) => a.id === activeEntry.appointment_id) || null;
  }, [activeEntry, myAppointmentsToday]);

  // Load draft note when active entry changes
  useEffect(() => {
    if (!activeEntry) {
      setNoteText('');
      setFollowUp('none');
      setFollowUpDate('');
      setAutosaveStatus('idle');
      return;
    }

    const existingDraft = myConsultationNotes.find((n) => n.appointment_id === activeEntry.appointment_id);
    if (existingDraft) {
      setNoteText(existingDraft.text || '');
      setFollowUp(existingDraft.follow_up || 'none');
      setFollowUpDate(existingDraft.follow_up_date || '');
    } else {
      setNoteText('');
      setFollowUp('none');
      setFollowUpDate('');
    }
  }, [activeEntry?.id, myConsultationNotes]);

  // Elapsed timer tick when in consultation
  useEffect(() => {
    if (!activeEntry || activeEntry.status !== 'in_consultation' || !activeEntry.started_at) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const start = new Date(activeEntry.started_at!).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeEntry?.id, activeEntry?.status, activeEntry?.started_at]);

  // Debounced Autosave for consultation notes
  useEffect(() => {
    if (!activeEntry || activeEntry.status !== 'in_consultation' || !noteText.trim()) return;

    setAutosaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await saveConsultationDraftNote({
          appointment_id: activeEntry.appointment_id,
          doctor_id: doctorId,
          patient_id: activeAppointment?.patient_id || `pat_${activeEntry.appointment_id}`,
          text: noteText,
          follow_up: followUp,
          follow_up_date: followUp === 'custom' ? followUpDate : undefined,
          finalized: false,
        });
        setAutosaveStatus('saved');
      } catch {
        setAutosaveStatus('idle');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [noteText, followUp, followUpDate, activeEntry?.id, activeEntry?.status, doctorId, activeAppointment?.patient_id]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to Complete consultation
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (activeEntry && activeEntry.status === 'in_consultation') {
          handleTriggerComplete();
        }
        return;
      }

      // Ignore single-key shortcuts when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (!activeEntry && waitingEntries.length > 0 && effectiveStatus.status === 'available') {
          handleCallNext();
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (activeEntry && activeEntry.status === 'called') {
          handleStartConsultation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Emergency patient detection
  const waitingEmergency = useMemo(() => {
    return waitingEntries.find((w) => w.priority === 0);
  }, [waitingEntries]);

  // Expected appointments (booked, not yet arrived)
  const expectedAppointments = useMemo(() => {
    return myAppointmentsToday.filter((a) => a.status === 'booked');
  }, [myAppointmentsToday]);

  // Handlers
  const handleCallNext = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await callNextDoctorPatient();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCallAgain = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await callDoctorPatientAgain();
      addToast({
        title: 'Chime repeated',
        description: `Calling token ${activeEntry?.token} again to consultation room.`,
        variant: 'info',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartConsultation = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await startDoctorConsultation();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerComplete = () => {
    if (!noteText.trim()) {
      setCompleteConfirmOpen(true);
    } else {
      executeComplete();
    }
  };

  const executeComplete = async () => {
    setIsProcessing(true);
    setCompleteConfirmOpen(false);
    try {
      const res = await completeDoctorConsultation({
        text: noteText,
        follow_up: followUp,
        follow_up_date: followUp === 'custom' ? followUpDate : undefined,
      });

      if (res.success) {
        setNoteText('');
        setFollowUp('none');
        setFollowUpDate('');
        // Focus return to Call Next button for swift flow
        setTimeout(() => {
          callNextButtonRef.current?.focus();
        }, 150);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmNoShow = async () => {
    if (!activeEntry) return;
    setIsProcessing(true);
    try {
      await markDoctorPatientNoShow(activeEntry.id);
      setNoShowConfirmOpen(false);
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
        reason: breakReason || 'Temporary clinical break',
        notify: true,
      });
      setBreakModalOpen(false);
      setBreakReason('');
      addToast({
        title: 'Break recorded',
        description: `Status set to On Break for ${breakMinutes} min. Resumes at ${formatTimeIST(untilDate.toISOString())}.`,
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
        description: `Running late by ${lateMinutes} min recorded. Waiting patient ETAs shifted.`,
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
        description: 'Status set to Available. You may now call patients.',
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

  const elapsedMins = Math.floor(elapsedSeconds / 60);
  const elapsedSecs = elapsedSeconds % 60;
  const isRunningLong = elapsedMins >= currentDoctor.avg_consult_minutes * 1.5;

  const nextWaitingPatient = waitingEntries[0];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="SPECIALIST QUEUE"
        title="My queue"
        description={`Live consultation chamber control for ${currentDoctor.name} (${myDepartment?.name} • ${currentDoctor.room}).`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowShortcuts(!showShortcuts)}
              icon={<Keyboard className="w-4 h-4" />}
            >
              Shortcuts
            </Button>
          </div>
        }
      />

      {/* Emergency Alert Banner (when emergency is waiting during consultation) */}
      {waitingEmergency && activeEntry?.status === 'in_consultation' && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-card bg-danger/10 border border-danger/40 flex items-center justify-between gap-4 text-xs text-danger"
        >
          <div className="flex items-center gap-3">
            <Siren className="w-5 h-5 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[11px] block">Emergency Patient Waiting</span>
              <span className="text-ink font-semibold">Token {waitingEmergency.token}</span>
              <span className="text-ink/80"> — First in queue immediately after this consultation.</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-danger text-base font-bold text-[10px] uppercase">
            Priority 0
          </span>
        </div>
      )}

      {/* Sticky Status Bar */}
      <div className="sticky top-0 z-20 p-4 rounded-card bg-base border border-ink/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-ink/60">Status:</span>
            <DoctorAvailabilityChip
              status={effectiveStatus.status}
              lateMinutes={effectiveStatus.lateMinutes}
            />
          </div>

          <div className="w-px h-4 bg-ink/15 hidden sm:block" />

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-ink/60 font-medium">In Queue:</span>
            <span className="font-bold font-mono text-ink px-2 py-0.5 rounded-full bg-accent/20">
              {waitingEntries.length} waiting
            </span>
          </div>

          <div className="w-px h-4 bg-ink/15 hidden sm:block" />

          <div className="text-xs text-ink/60">
            Avg: <span className="font-mono font-semibold text-ink">{currentDoctor.avg_consult_minutes} min</span>
          </div>
        </div>

        {/* Quick Availability Actions */}
        <div className="flex items-center gap-2">
          {isUnavailable ? (
            <Button variant="primary" size="sm" onClick={handleResumeAvailability} disabled={isProcessing}>
              Resume availability
            </Button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Main Two-Region Layout (Consultation Panel ~60%, Up Next ~40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Consultation Panel (7 cols desktop) */}
        <div className="lg:col-span-7 space-y-4">
          {/* STATE 1: NO ACTIVE PATIENT */}
          {!activeEntry && (
            <Card padding="lg" className="space-y-6 text-center py-12">
              <div className="w-16 h-16 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto">
                <Play className="w-7 h-7 ml-1" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl font-medium text-ink">Chamber is ready</h2>
                <p className="text-sm text-ink/70">
                  {effectiveStatus.status === 'on_break'
                    ? `You are on temporary break until ${effectiveStatus.until ? formatTimeIST(effectiveStatus.until) : 'scheduled return'}. Resume availability to call waiting patients.`
                    : effectiveStatus.status === 'on_leave'
                    ? 'You are on scheduled leave today. Consultations are suspended.'
                    : waitingEntries.length === 0
                    ? 'No waiting patients currently in queue for your chamber. Upcoming bookings will appear as they check in at reception.'
                    : 'Call the next waiting patient into the consultation chamber.'}
                </p>
              </div>

              {waitingEntries.length > 0 && !isUnavailable && (
                <div className="pt-2 space-y-3">
                  <Button
                    ref={callNextButtonRef}
                    variant="primary"
                    size="lg"
                    onClick={handleCallNext}
                    disabled={isProcessing}
                    className="mx-auto"
                  >
                    Call next
                  </Button>
                  {nextWaitingPatient && (
                    <div className="text-xs text-ink/70">
                      Up next: <span className="font-bold text-ink">{nextWaitingPatient.token}</span> •{' '}
                      {myAppointmentsToday.find((a) => a.id === nextWaitingPatient.appointment_id)?.patient.name || 'Patient'}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* STATE 2: CALLED PATIENT (Countdown & Confirmation) */}
          {activeEntry && activeEntry.status === 'called' && (
            <Card padding="lg" className="space-y-6 border-accent/40 bg-accent/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span>PATIENT CALLED • PROCEED TO CHAMBER</span>
                  </div>
                  <h3 className="text-3xl font-bold font-mono text-ink mt-1">{activeEntry.token}</h3>
                  <div className="text-base font-semibold text-ink mt-0.5">
                    {activeAppointment?.patient.name || 'Patient'}
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-ink/10 sm:pl-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink/60">Response Countdown</div>
                  <div className="text-3xl font-mono font-bold text-accent tabular-nums">
                    {Math.floor(calledSecondsRemaining / 60)}:
                    {(calledSecondsRemaining % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-ink/60">Call count: {activeEntry.call_count}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStartConsultation}
                  disabled={isProcessing}
                  icon={<Play className="w-4 h-4" />}
                >
                  Start consultation
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleCallAgain}
                  disabled={isProcessing}
                  icon={<PhoneCall className="w-4 h-4" />}
                >
                  Call again
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setNoShowConfirmOpen(true)}
                  disabled={isProcessing}
                  icon={<UserX className="w-4 h-4" />}
                >
                  Mark no-show
                </Button>
              </div>
            </Card>
          )}

          {/* STATE 3: IN CONSULTATION (Active Consultation Card) */}
          {activeEntry && activeEntry.status === 'in_consultation' && (
            <div className="rounded-card border border-ink/10 bg-base overflow-hidden space-y-0">
              {/* Feature Band: Ink Strip */}
              <div className="p-6 bg-ink text-base space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-base/60 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span>IN CONSULTATION</span>
                    </div>
                    <div className="text-4xl sm:text-5xl font-bold font-mono text-base tracking-tight mt-1">
                      {activeEntry.token}
                    </div>
                    <div className="text-lg font-semibold text-base mt-1 flex items-center gap-2">
                      <span>{activeAppointment?.patient.name || 'Patient'}</span>
                      <span className="text-xs font-normal text-base/70">
                        ({activeAppointment?.patient.age} yrs • {activeAppointment?.patient.gender})
                      </span>
                    </div>
                  </div>

                  {/* Elapsed Timer & Rolling Average Progress */}
                  <div className="sm:text-right bg-base/5 p-3 rounded-card border border-base/10 sm:min-w-[160px]">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-base/60">Elapsed Timer</div>
                    <div className="text-3xl font-mono font-bold text-base tabular-nums">
                      {elapsedMins.toString().padStart(2, '0')}:{elapsedSecs.toString().padStart(2, '0')}
                    </div>
                    <div className="text-[11px] text-base/70 mt-0.5">
                      Avg: {currentDoctor.avg_consult_minutes} min
                    </div>

                    {isRunningLong && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-accent text-ink text-[10px] font-bold uppercase">
                        Running long
                      </span>
                    )}
                  </div>
                </div>

                {/* Priority Pill & Type Tag */}
                <div className="flex items-center gap-2 pt-1 border-t border-base/10 text-xs">
                  {activeEntry.priority === 0 && <StatusBadge status="priority_0" />}
                  {activeEntry.priority === 1 && <StatusBadge status="priority_1" />}
                  <span className="px-2.5 py-0.5 rounded-full bg-base/10 text-base text-[11px]">
                    {activeAppointment?.type === 'walk_in' ? 'Walk-in arrival' : 'Scheduled booking'}
                  </span>
                  <span className="text-base/60 text-[11px]">
                    Scheduled: {activeAppointment ? formatTimeIST(activeAppointment.scheduled_start) : '—'}
                  </span>
                </div>
              </div>

              {/* Base Body: Symptoms, Patient History Peek & Note Editor */}
              <div className="p-6 space-y-6">
                {/* Clinical Context & Patient History Peek */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-card bg-base border border-ink/10 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-ink/60 uppercase tracking-wider text-[10px]">Reason for Visit</span>
                    <p className="font-semibold text-ink text-sm">{activeAppointment?.reason || 'General checkup'}</p>
                    <p className="text-ink/75 italic">{activeAppointment?.symptoms_note || 'No acute symptoms specified.'}</p>
                  </div>

                  <div className="space-y-1 sm:border-l sm:border-ink/10 sm:pl-4">
                    <span className="font-bold text-ink/60 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <History className="w-3 h-3" />
                      <span>Patient Hospital History</span>
                    </span>
                    <div className="font-semibold text-ink">
                      {activeAppointment?.patient.past_visits_count
                        ? `${activeAppointment.patient.past_visits_count} previous visits`
                        : 'First visit at this hospital'}
                    </div>
                    {activeAppointment?.patient.last_visit_date && (
                      <div className="text-ink/70">
                        Last consultation: {formatDateIST(activeAppointment.patient.last_visit_date)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Note Editor with Autosave */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase font-bold tracking-wider text-ink flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-accent" />
                      <span>Consultation Clinical Notes & Prescription</span>
                    </label>

                    <div className="flex items-center gap-2 text-[11px]">
                      {autosaveStatus === 'saving' && <span className="text-accent animate-pulse">Saving…</span>}
                      {autosaveStatus === 'saved' && <span className="text-success font-medium">Saved just now</span>}
                      <span className="text-ink/50 font-mono">{noteText.length} chars</span>
                    </div>
                  </div>

                  <Textarea
                    placeholder="Enter observation notes, diagnostic review, medication instructions, and clinical advice..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={5}
                  />

                  <div className="text-[11px] text-ink/60 italic">
                    Demo data only. Do not enter real identifiable patient clinical details.
                  </div>

                  {/* Follow-up Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <Select
                      label="Recommended Follow-up"
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value as ConsultationNote['follow_up'])}
                      options={[
                        { value: 'none', label: 'No follow-up required' },
                        { value: '1_week', label: 'Review in 1 week' },
                        { value: '2_weeks', label: 'Review in 2 weeks' },
                        { value: '1_month', label: 'Review in 1 month' },
                        { value: 'custom', label: 'Custom date follow-up' },
                      ]}
                    />

                    {followUp === 'custom' && (
                      <Input
                        type="date"
                        label="Specific Follow-up Date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                {/* Complete Action Button */}
                <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
                  <div className="text-xs text-ink/60">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-ink/10 font-mono text-[11px]">Ctrl+Enter</kbd> to complete
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleTriggerComplete}
                    disabled={isProcessing}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Complete consultation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Up Next Column (5 cols desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-ink/70 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-ink inline-block" />
                  <span>UP NEXT IN CHAMBER</span>
                </div>
                <h3 className="text-base font-semibold text-ink mt-0.5">Waiting Patients ({waitingEntries.length})</h3>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-ink/70">Estimated Wait</span>
              </div>
            </div>

            {waitingEntries.length === 0 ? (
              <div className="text-xs text-ink/60 py-8 text-center space-y-1">
                <p>No waiting patients currently in queue.</p>
                <p className="text-[11px] text-ink/50">Patients will appear here upon reception check-in.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(showAllWaiting ? waitingEntries : waitingEntries.slice(0, 5)).map((entry, idx) => {
                  const apt = myAppointmentsToday.find((a) => a.id === entry.appointment_id);
                  const isTop = idx === 0;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-card border transition-all ${
                        entry.priority === 0
                          ? 'border-danger/60 bg-danger/5'
                          : isTop
                          ? 'border-accent/40 bg-accent/5'
                          : 'border-ink/10 bg-base hover:border-ink/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <TokenBadge token={entry.token} size="sm" />
                          <div>
                            <div className="font-semibold text-xs text-ink">{apt?.patient.name || 'Patient'}</div>
                            <div className="text-[11px] text-ink/60">
                              {apt?.patient.age}y • {apt?.patient.gender} • {apt?.type === 'walk_in' ? 'Walk-in' : 'Booked'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-accent">~{entry.eta_minutes || 5} min</div>
                          <div className="text-[10px] text-ink/50">Position #{entry.position || idx + 1}</div>
                        </div>
                      </div>

                      {/* Pill tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                        {entry.priority === 0 && <StatusBadge status="priority_0" />}
                        {entry.priority === 1 && <StatusBadge status="priority_1" />}
                        {entry.is_late_arrival && (
                          <span className="px-2 py-0.5 rounded-full bg-accent/20 text-ink font-semibold">Late arrival</span>
                        )}
                        {entry.call_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full border border-ink/20 text-ink">
                            Called ×{entry.call_count}
                          </span>
                        )}
                      </div>

                      {/* Accordion detail expander */}
                      <div className="mt-2 pt-2 border-t border-ink/10">
                        <Accordion
                          items={[
                            {
                              id: `detail_${entry.id}`,
                              title: `Details: ${apt?.reason || 'Review'}`,
                              content: `${apt?.symptoms_note || 'Standard consultation.'} History: ${
                                apt?.patient.past_visits_count ? `${apt.patient.past_visits_count} past visits` : 'First visit'
                              }.`,
                            },
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}

                {waitingEntries.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllWaiting(!showAllWaiting)}
                    className="w-full py-2 text-xs font-semibold text-accent hover:underline text-center cursor-pointer"
                  >
                    {showAllWaiting ? 'Show fewer' : `+${waitingEntries.length - 5} more waiting patients`}
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* Expected Bookings Toggle (Not Yet Arrived) */}
          <Card padding="md" className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">Expected Patients ({expectedAppointments.length})</span>
              <button
                type="button"
                onClick={() => setShowExpected(!showExpected)}
                className="text-xs font-semibold text-accent hover:underline cursor-pointer"
              >
                {showExpected ? 'Hide' : 'Show expected'}
              </button>
            </div>

            {showExpected && (
              <div className="space-y-2 pt-2 border-t border-ink/10">
                {expectedAppointments.length === 0 ? (
                  <div className="text-xs text-ink/60 py-2 text-center">No additional booked appointments today.</div>
                ) : (
                  expectedAppointments.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-base/50 border border-ink/10 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-ink">{exp.patient.name}</div>
                        <div className="text-[11px] text-ink/60">{exp.reason}</div>
                      </div>
                      <div className="text-right font-mono text-xs text-ink/75">
                        {formatTimeIST(exp.scheduled_start)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>

          {/* Collapsed Section: Completed Consultations Today */}
          <Card padding="md" className="space-y-3">
            <div className="flex items-center justify-between border-b border-ink/10 pb-2">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>Completed Consultations ({completedToday.length})</span>
              </span>
            </div>

            {completedToday.length === 0 ? (
              <div className="text-xs text-ink/60 py-3 text-center">No completed consultations yet today.</div>
            ) : (
              <div className="space-y-2">
                {completedToday.slice(0, 5).map((comp) => {
                  const apt = myAppointmentsToday.find((a) => a.id === comp.appointment_id);
                  const note = myConsultationNotes.find((n) => n.appointment_id === comp.appointment_id);

                  return (
                    <div
                      key={comp.id}
                      onClick={() => {
                        if (note) {
                          setSelectedCompletedNote(note);
                          setSelectedCompletedEntry(comp);
                        }
                      }}
                      className="p-2.5 rounded-lg border border-ink/10 bg-base hover:bg-ink/[0.02] flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink">{comp.token}</span>
                        <span className="font-medium text-ink">{apt?.patient.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink/60 font-mono text-[11px]">
                        <span>{comp.consult_minutes || currentDoctor.avg_consult_minutes}m</span>
                        {note && <FileText className="w-3 h-3 text-accent" />}
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

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
            placeholder="e.g. Ward rounds, clinical recess..."
            value={breakReason}
            onChange={(e) => setBreakReason(e.target.value)}
          />

          <div className="p-3 bg-accent/10 border border-accent/30 rounded-card text-xs text-ink space-y-1">
            <div className="font-semibold">Queue Impact Preview:</div>
            <div>
              {waitingEntries.length} waiting patients affected • Downstream consultation ETAs will shift by +{breakMinutes} min.
            </div>
          </div>
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
            placeholder="e.g. Emergency surgery, road congestion..."
            value={lateReason}
            onChange={(e) => setLateReason(e.target.value)}
          />

          <div className="p-3 bg-accent/10 border border-accent/30 rounded-card text-xs text-ink space-y-1">
            <div className="font-semibold">Patient Notification:</div>
            <div>
              Broadcast delay advisory will be dispatched to {waitingEntries.length} waiting patients.
            </div>
          </div>
        </div>
      </Modal>

      {/* Complete without Note Confirmation */}
      <ConfirmDialog
        isOpen={completeConfirmOpen}
        onClose={() => setCompleteConfirmOpen(false)}
        onConfirm={executeComplete}
        title="Complete without notes?"
        description="No consultation notes or prescription advice was written. Complete this consultation anyway?"
        confirmLabel="Complete anyway"
        cancelLabel="Return to notes"
      />

      {/* No-Show Confirmation */}
      <ConfirmDialog
        isOpen={noShowConfirmOpen}
        onClose={() => setNoShowConfirmOpen(false)}
        onConfirm={handleConfirmNoShow}
        title="Mark patient no-show?"
        description={`Token ${activeEntry?.token} has not responded. Marking no-show will release this chamber slot.`}
        confirmLabel="Mark no-show"
        isDestructive={true}
      />

      {/* Keyboard Shortcuts Popover Modal */}
      <Modal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        title="Keyboard shortcuts"
        eyebrow="ACCESSIBILITY"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-base border border-ink/10">
            <span className="text-ink">Call next waiting patient</span>
            <kbd className="px-2 py-1 rounded bg-ink/10 font-mono font-bold">N</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-base border border-ink/10">
            <span className="text-ink">Start consultation (when called)</span>
            <kbd className="px-2 py-1 rounded bg-ink/10 font-mono font-bold">S</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-base border border-ink/10">
            <span className="text-ink">Complete consultation</span>
            <kbd className="px-2 py-1 rounded bg-ink/10 font-mono font-bold">Ctrl + Enter</kbd>
          </div>
        </div>
      </Modal>

      {/* Completed Consultation Note Drawer */}
      <Drawer
        isOpen={Boolean(selectedCompletedNote)}
        onClose={() => setSelectedCompletedNote(null)}
        title={`Consultation Note: ${selectedCompletedEntry?.token}`}
        eyebrow="RECORD ARCHIVE"
        width="md"
        footer={
          <Button variant="secondary" size="md" onClick={() => setSelectedCompletedNote(null)}>
            Close
          </Button>
        }
      >
        {selectedCompletedNote && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-base border border-ink/10 rounded-card space-y-1">
              <span className="font-bold text-ink/60 uppercase tracking-wider text-[10px]">Follow-up Advice</span>
              <div className="font-semibold text-ink capitalize">
                {selectedCompletedNote.follow_up.replace('_', ' ')}
                {selectedCompletedNote.follow_up_date && ` (${formatDateIST(selectedCompletedNote.follow_up_date)})`}
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-ink/60 uppercase tracking-wider text-[10px]">Clinical Summary</span>
              <div className="p-4 rounded-card bg-base border border-ink/10 text-sm leading-relaxed text-ink whitespace-pre-wrap">
                {selectedCompletedNote.text || 'No clinical note recorded.'}
              </div>
            </div>

            <div className="text-[11px] text-ink/50">
              Finalized: {formatTimeIST(selectedCompletedNote.updated_at)}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
