import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useHospitalStore } from '@/store/hospitalStore';
import { useUiStore } from '@/store/uiStore';
import { broadcastDoctorDelay } from '@/services/adminApi';
import { formatTimeIST, formatDateIST } from '@/lib/time';
import {
  Send,
  Clock,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import type { BroadcastLog, Channel } from '@/types';

export const BroadcastsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryType = searchParams.get('type');
  const queryDoctor = searchParams.get('doctor');

  const {
    hospital,
    doctors,
    departments,
    appointments,
    queue_entries,
    broadcasts,
  } = useHospitalStore();

  const { addToast, addAlert } = useUiStore();

  // Form compose fields
  const [broadcastType, setBroadcastType] = useState<'delay' | 'closure' | 'custom'>(
    queryType === 'delay' ? 'delay' : 'delay'
  );
  const [audienceType, setAudienceType] = useState<'doctor' | 'department' | 'all'>('doctor');
  const [targetDoctorId, setTargetDoctorId] = useState<string>(queryDoctor || doctors[0]?.id || '');
  const [targetDeptId, setTargetDeptId] = useState<string>(departments[0]?.id || '');

  // Delay minutes
  const [delayMinutes, setDelayMinutes] = useState(20);

  // Closure dates
  const [closureStart, setClosureStart] = useState('2026-09-28');
  const [closureEnd, setClosureEnd] = useState('2026-09-29');

  // Channels
  const [channels, setChannels] = useState<{ email: boolean; sms: boolean }>({
    email: false,
    sms: true,
  });

  // Message content
  const [message, setMessage] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Deep linking initial setup
  useEffect(() => {
    if (queryDoctor) {
      setAudienceType('doctor');
      setTargetDoctorId(queryDoctor);
      setBroadcastType('delay');
    }
  }, [queryDoctor]);

  // Dynamic template generator
  useEffect(() => {
    const doc = doctors.find((d) => d.id === targetDoctorId);
    const dep = departments.find((d) => d.id === targetDeptId);

    if (broadcastType === 'delay') {
      setMessage(
        `Queue Advisory: ${doc?.name || 'Your specialist'} is experiencing a delay of approximately ${delayMinutes} minutes due to an emergency procedure. Your live queue token ETA has updated.`
      );
    } else if (broadcastType === 'closure') {
      setMessage(
        `Facility Notice: ${
          audienceType === 'department' ? dep?.name || 'Department' : hospital.name
        } OPD will remain temporarily closed from ${closureStart} to ${closureEnd}. Affected bookings will be prioritized for rescheduling.`
      );
    } else {
      setMessage(
        `Hospital Announcement: Welcome to ${hospital.name}. Please keep your booking QR code ready at entrance desks for priority check-in.`
      );
    }
  }, [broadcastType, audienceType, targetDoctorId, targetDeptId, delayMinutes, closureStart, closureEnd, doctors, departments, hospital.name]);

  // Calculate live affected count from today's non-terminal appointments
  const affectedCount = useMemo(() => {
    if (broadcastType === 'delay' || audienceType === 'doctor') {
      return queue_entries.filter((q) => q.doctor_id === targetDoctorId && q.status === 'waiting').length;
    }
    if (audienceType === 'department') {
      return appointments.filter(
        (a) =>
          a.department_id === targetDeptId &&
          (a.status === 'booked' || a.status === 'in_queue')
      ).length;
    }
    // all today's non-terminal appointments
    return appointments.filter(
      (a) => a.status === 'booked' || a.status === 'in_queue' || a.status === 'in_consultation'
    ).length;
  }, [broadcastType, audienceType, targetDoctorId, targetDeptId, queue_entries, appointments]);

  const handleSendBroadcast = async () => {
    setIsSending(true);
    try {
      if (broadcastType === 'delay' && targetDoctorId) {
        // Shift queue ETAs
        await broadcastDoctorDelay({
          doctorId: targetDoctorId,
          minutes: delayMinutes,
          message,
        });
      } else {
        // Log broadcast
        const selectedChannels: Channel[] = ['in_app'];
        if (channels.email) selectedChannels.push('email');
        if (channels.sms) selectedChannels.push('sms');

        const newLog: BroadcastLog = {
          id: `bcast_${Date.now()}`,
          hospital_id: hospital.id,
          type: broadcastType,
          audience_type: audienceType,
          target_id: audienceType === 'doctor' ? targetDoctorId : targetDeptId,
          target_name:
            audienceType === 'doctor'
              ? doctors.find((d) => d.id === targetDoctorId)?.name
              : departments.find((d) => d.id === targetDeptId)?.name,
          channels: selectedChannels,
          message,
          recipients_count: affectedCount,
          sent_count: affectedCount,
          failed_count: 0,
          sent_at: new Date().toISOString(),
        };

        useHospitalStore.setState((state) => ({
          broadcasts: [newLog, ...state.broadcasts],
        }));

        addToast({
          title: 'Broadcast dispatched',
          description: `Dispatched message to ${affectedCount} recipients.`,
          variant: 'success',
        });
      }

      // Add to dashboard alerts feed
      addAlert({
        severity: broadcastType === 'delay' ? 'warning' : 'info',
        title: broadcastType === 'delay' ? 'Doctor delay advisory' : 'Hospital operational broadcast',
        message,
      });

      setConfirmDialogOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  const columns: Column<BroadcastLog>[] = [
    {
      key: 'sent_at',
      header: 'Dispatched At',
      sortable: true,
      render: (row) => (
        <div className="font-mono text-xs">
          <div>{formatTimeIST(row.sent_at)}</div>
          <div className="text-[11px] text-ink/60">{formatDateIST(row.sent_at)}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Broadcast Type',
      sortable: true,
      render: (row) => {
        const badge = {
          delay: 'bg-accent text-ink',
          closure: 'bg-danger text-base',
          custom: 'bg-ink text-base',
        }[row.type];
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${badge}`}>
            {row.type}
          </span>
        );
      },
    },
    {
      key: 'audience',
      header: 'Target Audience',
      render: (row) => (
        <div>
          <div className="font-medium text-ink capitalize">{row.audience_type} audience</div>
          <div className="text-[11px] text-ink/65">{row.target_name || 'All Outpatients'}</div>
        </div>
      ),
    },
    {
      key: 'recipients_count',
      header: 'Recipients',
      sortable: true,
      align: 'center',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-ink">
          {row.recipients_count} patients
        </span>
      ),
    },
    {
      key: 'channels',
      header: 'Channels',
      render: (row) => (
        <div className="flex items-center gap-1 text-[11px] uppercase font-mono text-ink/70">
          {row.channels.join(', ')}
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message Content',
      render: (row) => (
        <div className="max-w-xs truncate text-xs text-ink/80" title={row.message}>
          {row.message}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="BROADCASTS"
        title="Patient Announcements & Advisories"
        description="Transmit multi-channel delay notifications, departmental closure alerts, and queue broadcast advisories."
      />

      {/* Two Column Layout: Compose Panel on Left, Live Phone Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Compose Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card padding="lg" className="space-y-5">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-ink/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-ink inline-block" />
                <span>COMPOSE BROADCAST</span>
              </div>
              <h3 className="text-lg font-medium text-ink mt-0.5">Advisory Dispatcher</h3>
            </div>

            {/* Broadcast Type Pills */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
                Notice Type *
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'delay', label: 'Doctor Delay' },
                  { id: 'closure', label: 'OPD Closure' },
                  { id: 'custom', label: 'Custom Alert' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBroadcastType(t.id as any)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      broadcastType === t.id
                        ? 'bg-ink text-base'
                        : 'bg-base text-ink border border-ink/20 hover:border-ink/40'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience Scope Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
                Target Audience *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'doctor', label: 'By Doctor' },
                  { id: 'department', label: 'By Department' },
                  { id: 'all', label: "All Today's Patients" },
                ].map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setAudienceType(aud.id as any)}
                    className={`p-2.5 rounded-card border text-xs font-medium cursor-pointer text-center transition-colors ${
                      audienceType === aud.id
                        ? 'bg-ink text-base border-ink font-semibold'
                        : 'bg-base text-ink border-ink/20 hover:border-ink/40'
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Selectors */}
            {audienceType === 'doctor' && (
              <Select
                label="Target Doctor *"
                value={targetDoctorId}
                onChange={(e) => setTargetDoctorId(e.target.value)}
                options={doctors.map((d) => ({ value: d.id, label: `${d.name} (${d.specialty})` }))}
              />
            )}

            {audienceType === 'department' && (
              <Select
                label="Target Department *"
                value={targetDeptId}
                onChange={(e) => setTargetDeptId(e.target.value)}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
              />
            )}

            {/* Specific configurations for Delay */}
            {broadcastType === 'delay' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
                  Delay Duration
                </label>
                <div className="flex gap-2">
                  {[10, 15, 20, 30, 45].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDelayMinutes(m)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        delayMinutes === m
                          ? 'bg-accent text-ink font-bold'
                          : 'border border-ink/20 text-ink hover:border-ink/40'
                      }`}
                    >
                      +{m}m
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Specific configurations for Closure */}
            {broadcastType === 'closure' && (
              <div className="space-y-2 p-3.5 rounded-card bg-danger/5 border border-danger/25">
                <div className="text-xs font-semibold text-danger flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Closure Schedule Scope</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Closure Start Date *"
                    type="date"
                    value={closureStart}
                    onChange={(e) => setClosureStart(e.target.value)}
                  />
                  <Input
                    label="Closure End Date *"
                    type="date"
                    value={closureEnd}
                    onChange={(e) => setClosureEnd(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-danger/80">
                  All appointments booked in this window will be highlighted for rescheduling.
                </p>
              </div>
            )}

            {/* Channels Selection */}
            <div className="p-3 rounded-card border border-ink/10 bg-base space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                Active Notification Channels
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-ink font-semibold">
                  <Lock className="w-3.5 h-3.5 text-ink/50" />
                  <span>In-App Live Push (Mandatory)</span>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.sms}
                    onChange={(e) => setChannels({ ...channels, sms: e.target.checked })}
                    className="w-4 h-4 accent-ink cursor-pointer"
                  />
                  <span>SMS / WhatsApp Text</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.email}
                    onChange={(e) => setChannels({ ...channels, email: e.target.checked })}
                    className="w-4 h-4 accent-ink cursor-pointer"
                  />
                  <span>Email Dispatch</span>
                </label>
              </div>
            </div>

            {/* Live Recipients Counter Banner */}
            <div className="p-3.5 rounded-card bg-accent/15 border border-accent/30 flex items-center justify-between text-xs text-ink">
              <span className="font-medium">Active recipients receiving this broadcast:</span>
              <span className="font-bold text-sm font-mono">{affectedCount} patients</span>
            </div>

            {/* Message Body */}
            <Textarea
              label="Broadcast Message Body *"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {/* Dispatch Action Button */}
            <div className="pt-2 border-t border-ink/10 flex justify-end">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setConfirmDialogOpen(true)}
                disabled={affectedCount === 0 || !message.trim()}
                icon={<Send className="w-4 h-4" />}
              >
                Send broadcast ({affectedCount})
              </Button>
            </div>
          </Card>
        </div>

        {/* Live Patient Device Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card padding="md" className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-ink/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-ink inline-block" />
                <span>DEVICE PREVIEW</span>
              </div>
              <h3 className="text-base font-medium text-ink mt-0.5">Patient Mobile Screen Appearance</h3>
            </div>

            {/* Phone-shaped card using ONLY palette tokens */}
            <div className="mx-auto w-[280px] rounded-[32px] border-4 border-ink bg-base p-4 shadow-xl space-y-4">
              {/* Speaker notch */}
              <div className="w-16 h-1.5 bg-ink/30 rounded-full mx-auto" />

              {/* Status bar */}
              <div className="flex justify-between text-[10px] font-mono text-ink/70 px-1">
                <span>10:30</span>
                <span>5G • 94%</span>
              </div>

              {/* Simulated push notification banner */}
              <div className="p-3 rounded-card bg-ink text-base text-xs space-y-1.5 shadow-md">
                <div className="flex items-center justify-between text-[10px] text-base/70">
                  <span className="font-bold uppercase tracking-wider">ChroniQ Patient App</span>
                  <span>Now</span>
                </div>
                <div className="font-semibold text-accent text-xs">
                  {broadcastType === 'delay' ? 'Queue Delay Notice' : 'Hospital Advisory'}
                </div>
                <p className="text-[11px] text-base/90 leading-relaxed font-sans">{message}</p>
              </div>

              {/* In-app queue card preview */}
              <div className="p-3 rounded-card bg-base border border-ink/15 text-xs space-y-2 text-ink">
                <div className="flex justify-between text-[10px] text-ink/60 font-semibold">
                  <span>YOUR VISIT TODAY</span>
                  <span className="font-mono">CARD-014</span>
                </div>
                <div className="font-bold text-sm">Dr. Anand Ramanathan</div>
                {broadcastType === 'delay' && (
                  <div className="p-2 rounded bg-accent text-ink font-semibold text-[11px] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>ETA shifted by +{delayMinutes} mins</span>
                  </div>
                )}
              </div>

              {/* Home indicator bar */}
              <div className="w-24 h-1 bg-ink/40 rounded-full mx-auto mt-6" />
            </div>
          </Card>
        </div>
      </div>

      {/* Broadcast History Table */}
      <Card padding="md" className="space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-ink/70 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-ink inline-block" />
            <span>DISPATCH LOG</span>
          </div>
          <h3 className="text-base font-medium text-ink mt-0.5">Broadcast Transmission History</h3>
        </div>

        <DataTable
          columns={columns}
          data={broadcasts}
          keyExtractor={(row) => row.id}
          defaultSortKey="sent_at"
          defaultSortDir="desc"
          defaultPageSize={5}
        />
      </Card>

      {/* Send Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleSendBroadcast}
        title="Confirm Broadcast Dispatch"
        isLoading={isSending}
        confirmLabel={`Confirm & send to ${affectedCount} patients`}
        description={
          <>
            Are you sure you want to broadcast this advisory? The message will be dispatched immediately via in-app push and selected channels.
            {broadcastType === 'delay' && (
              <span className="block mt-2 font-semibold text-ink">
                Queue ETAs for all affected patients will be shifted by +{delayMinutes} minutes.
              </span>
            )}
          </>
        }
      />
    </div>
  );
};
