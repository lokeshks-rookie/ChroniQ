import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { useHospitalStore } from '@/store/hospitalStore';
import { saveDoctorSchedule, addDoctorLeave, deleteDoctorLeave } from '@/services/adminApi';
import { validateDoctorSchedule } from '@/lib/validation';
import { formatDateIST } from '@/lib/time';
import {
  Calendar,
  Clock,
  Copy,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type { WeeklyRule } from '@/types';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DoctorSchedulePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    doctors,
    departments,
    doctor_schedules,
    doctor_leaves,
  } = useHospitalStore();

  const doctor = doctors.find((d) => d.id === id);
  const department = departments.find((d) => d.id === doctor?.department_id);
  const existingSchedule = doctor_schedules.find((s) => s.doctor_id === id);

  const [activeTab, setActiveTab] = useState<'template' | 'leaves' | 'overrides' | 'preview'>('template');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Schedule editable state
  const [slotMinutes, setSlotMinutes] = useState<number>(existingSchedule?.slot_minutes || 15);
  const [weeklyRules, setWeeklyRules] = useState<WeeklyRule[]>(() => {
    if (existingSchedule?.weekly && existingSchedule.weekly.length > 0) {
      return JSON.parse(JSON.stringify(existingSchedule.weekly));
    }
    // Default 7 days
    return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      weekday: day,
      start: '09:00',
      end: day === 5 ? '13:00' : '17:00',
      breaks: day < 5 ? [{ start: '13:00', end: '14:00' }] : [],
    }));
  });

  // Working day toggles (which days doctor works)
  const [workingDays, setWorkingDays] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: false };
    existingSchedule?.weekly.forEach((r) => {
      map[r.weekday] = true;
    });
    return map;
  });

  // Leave addition state
  const [leaveFrom, setLeaveFrom] = useState('2026-09-25');
  const [leaveTo, setLeaveTo] = useState('2026-09-26');
  const [leaveReason, setLeaveReason] = useState('Clinical conference');

  // Override date and slot grid state
  const [overrideDate, setOverrideDate] = useState('2026-09-22');
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set(['10:15']));

  // Calculate live slot count for a day
  const calculateDaySlots = (rule: WeeklyRule, slotMin: number) => {
    const [startH, startM] = rule.start.split(':').map(Number);
    const [endH, endM] = rule.end.split(':').map(Number);
    const totalMins = endH * 60 + endM - (startH * 60 + startM);
    if (totalMins <= 0) return 0;

    let breakMins = 0;
    rule.breaks.forEach((b) => {
      const [bStartH, bStartM] = b.start.split(':').map(Number);
      const [bEndH, bEndM] = b.end.split(':').map(Number);
      breakMins += Math.max(0, bEndH * 60 + bEndM - (bStartH * 60 + bStartM));
    });

    return Math.max(0, Math.floor((totalMins - breakMins) / slotMin));
  };

  // Copy Monday configuration to Tue-Fri
  const handleCopyMondayToWeekdays = () => {
    const monRule = weeklyRules.find((r) => r.weekday === 0);
    if (!monRule) return;

    const updated = weeklyRules.map((r) => {
      if (r.weekday >= 1 && r.weekday <= 4) {
        return {
          ...r,
          start: monRule.start,
          end: monRule.end,
          breaks: JSON.parse(JSON.stringify(monRule.breaks)),
        };
      }
      return r;
    });

    setWeeklyRules(updated);
    setWorkingDays((prev) => ({ ...prev, 1: true, 2: true, 3: true, 4: true }));
    setIsDirty(true);
  };

  // Add break to day
  const handleAddBreak = (weekday: number) => {
    const updated = weeklyRules.map((r) => {
      if (r.weekday === weekday) {
        return {
          ...r,
          breaks: [...r.breaks, { start: '15:00', end: '15:30' }],
        };
      }
      return r;
    });
    setWeeklyRules(updated);
    setIsDirty(true);
  };

  // Remove break from day
  const handleRemoveBreak = (weekday: number, breakIdx: number) => {
    const updated = weeklyRules.map((r) => {
      if (r.weekday === weekday) {
        return {
          ...r,
          breaks: r.breaks.filter((_, idx) => idx !== breakIdx),
        };
      }
      return r;
    });
    setWeeklyRules(updated);
    setIsDirty(true);
  };

  // Save Schedule with pure function validation
  const handleSaveSchedule = async () => {
    const activeRules = weeklyRules.filter((r) => workingDays[r.weekday]);
    const validation = validateDoctorSchedule(activeRules);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    setIsSaving(true);
    try {
      if (!doctor) return;
      await saveDoctorSchedule({
        id: existingSchedule?.id || `sched_${doctor.id}`,
        doctor_id: doctor.id,
        hospital_id: doctor.hospital_id,
        slot_minutes: slotMinutes,
        weekly: activeRules,
        updated_at: new Date().toISOString(),
      });
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (existingSchedule?.weekly) {
      setWeeklyRules(JSON.parse(JSON.stringify(existingSchedule.weekly)));
      setSlotMinutes(existingSchedule.slot_minutes);
    }
    setValidationErrors([]);
    setIsDirty(false);
  };

  // Leaves management
  const doctorLeaves = doctor_leaves.filter((l) => l.doctor_id === id);

  const handleAddLeave = async () => {
    if (!doctor) return;
    await addDoctorLeave({
      doctor_id: doctor.id,
      date_from: new Date(leaveFrom).toISOString(),
      date_to: new Date(leaveTo).toISOString(),
      reason: leaveReason,
    });
  };

  const handleDeleteLeave = async (leaveId: string) => {
    await deleteDoctorLeave(leaveId);
  };

  if (!doctor) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Doctor not found</h2>
        <Button variant="secondary" size="md" className="mt-4" onClick={() => navigate('/admin/doctors')}>
          Back to Doctors
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Doctor Summary & Breadcrumb */}
      <PageHeader
        breadcrumbs={[
          { label: 'Doctors', path: '/admin/doctors' },
          { label: doctor.name, path: `/admin/doctors/${doctor.id}/schedule` },
          { label: 'Schedule' },
        ]}
        eyebrow="SCHEDULE"
        title={`${doctor.name} — Schedule & Availability`}
        description={`Configure weekly shift templates, break slots, leave exceptions, and override slot availability for ${department?.name || 'OPD'}.`}
      />

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'template', label: 'Weekly template', icon: <Calendar className="w-4 h-4" /> },
          { id: 'leaves', label: 'Leave & holidays', icon: <Clock className="w-4 h-4" />, count: doctorLeaves.length },
          { id: 'overrides', label: 'Slot overrides', icon: <Lock className="w-4 h-4" /> },
          { id: 'preview', label: '14-Day preview', icon: <CheckCircle2 className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* Validation Errors Alert */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-card bg-danger/10 border border-danger/30 text-xs text-danger space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Schedule configuration errors:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* TAB 1: Weekly Template */}
      {activeTab === 'template' && (
        <div className="space-y-6">
          <Card padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                  Slot Duration:
                </span>
                <div className="w-32">
                  <Select
                    value={slotMinutes}
                    onChange={(e) => {
                      setSlotMinutes(Number(e.target.value));
                      setIsDirty(true);
                    }}
                    options={[
                      { value: 10, label: '10 mins' },
                      { value: 15, label: '15 mins' },
                      { value: 20, label: '20 mins' },
                      { value: 30, label: '30 mins' },
                    ]}
                  />
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyMondayToWeekdays}
                icon={<Copy className="w-3.5 h-3.5" />}
              >
                Copy Monday to weekdays
              </Button>
            </div>

            {/* 7 Days Row List */}
            <div className="divide-y divide-ink/10">
              {DAY_NAMES.map((dayName, weekday) => {
                const isWorking = workingDays[weekday] ?? false;
                const rule = weeklyRules.find((r) => r.weekday === weekday) || {
                  weekday,
                  start: '09:00',
                  end: '17:00',
                  breaks: [],
                };
                const totalSlots = isWorking ? calculateDaySlots(rule, slotMinutes) : 0;

                // Timeline bar calculation (06:00 to 22:00 = 16 hours = 960 mins)
                const DAY_START_MIN = 6 * 60;
                const DAY_TOTAL_MIN = 16 * 60;

                const [startH, startM] = rule.start.split(':').map(Number);
                const [endH, endM] = rule.end.split(':').map(Number);
                const shiftStartMin = startH * 60 + startM;
                const shiftEndMin = endH * 60 + endM;

                const shiftLeftPct = Math.max(0, ((shiftStartMin - DAY_START_MIN) / DAY_TOTAL_MIN) * 100);
                const shiftWidthPct = Math.min(100, ((shiftEndMin - shiftStartMin) / DAY_TOTAL_MIN) * 100);

                return (
                  <div key={weekday} className="py-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-40">
                        <input
                          type="checkbox"
                          checked={isWorking}
                          onChange={(e) => {
                            setWorkingDays((prev) => ({ ...prev, [weekday]: e.target.checked }));
                            setIsDirty(true);
                          }}
                          className="w-4 h-4 rounded accent-ink cursor-pointer"
                        />
                        <span className={`text-sm font-semibold ${isWorking ? 'text-ink' : 'text-ink/40'}`}>
                          {dayName}
                        </span>
                      </div>

                      {isWorking ? (
                        <div className="flex flex-wrap items-center gap-3 flex-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-ink/60">Shift:</span>
                            <input
                              type="time"
                              value={rule.start}
                              onChange={(e) => {
                                const updated = weeklyRules.map((r) =>
                                  r.weekday === weekday ? { ...r, start: e.target.value } : r
                                );
                                setWeeklyRules(updated);
                                setIsDirty(true);
                              }}
                              className="px-2 py-1 rounded border border-ink/20 bg-base text-ink font-mono text-xs"
                            />
                            <span>–</span>
                            <input
                              type="time"
                              value={rule.end}
                              onChange={(e) => {
                                const updated = weeklyRules.map((r) =>
                                  r.weekday === weekday ? { ...r, end: e.target.value } : r
                                );
                                setWeeklyRules(updated);
                                setIsDirty(true);
                              }}
                              className="px-2 py-1 rounded border border-ink/20 bg-base text-ink font-mono text-xs"
                            />
                          </div>

                          {/* Breaks */}
                          {rule.breaks.map((b, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-1 px-2 py-1 rounded bg-accent/15 border border-accent/30 text-ink">
                              <span>Break:</span>
                              <span className="font-mono">{b.start}–{b.end}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveBreak(weekday, bIdx)}
                                className="ml-1 text-danger hover:opacity-80 cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => handleAddBreak(weekday)}
                            className="px-2 py-1 rounded border border-dashed border-ink/30 text-ink/70 hover:text-ink text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add break</span>
                          </button>

                          <span className="ml-auto font-mono text-xs font-semibold px-2 py-0.5 rounded bg-ink/5 text-ink">
                            {totalSlots} bookable slots
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-ink/40 italic flex-1">Off / Not practicing</div>
                      )}
                    </div>

                    {/* Interactive 06:00 to 22:00 Timeline Bar */}
                    {isWorking && (
                      <div className="relative h-6 bg-base rounded-md border border-ink/15 overflow-hidden flex items-center">
                        {/* Time markers (06:00, 10:00, 14:00, 18:00, 22:00) */}
                        <div className="absolute inset-0 flex justify-between px-2 text-[9px] text-ink/30 pointer-events-none select-none">
                          <span>06:00</span>
                          <span>10:00</span>
                          <span>14:00</span>
                          <span>18:00</span>
                          <span>22:00</span>
                        </div>

                        {/* Work Block in Ink */}
                        <div
                          style={{ left: `${shiftLeftPct}%`, width: `${shiftWidthPct}%` }}
                          className="absolute h-full bg-ink flex items-center justify-center text-[10px] text-base font-semibold"
                          title={`Shift: ${rule.start} – ${rule.end}`}
                        >
                          <span className="truncate px-1">Working shift</span>
                        </div>

                        {/* Break Blocks in Accent */}
                        {rule.breaks.map((b, bIdx) => {
                          const [bStartH, bStartM] = b.start.split(':').map(Number);
                          const [bEndH, bEndM] = b.end.split(':').map(Number);
                          const bStartMin = bStartH * 60 + bStartM;
                          const bEndMin = bEndH * 60 + bEndM;

                          const bLeftPct = Math.max(0, ((bStartMin - DAY_START_MIN) / DAY_TOTAL_MIN) * 100);
                          const bWidthPct = Math.min(100, ((bEndMin - bStartMin) / DAY_TOTAL_MIN) * 100);

                          return (
                            <div
                              key={bIdx}
                              style={{ left: `${bLeftPct}%`, width: `${bWidthPct}%` }}
                              className="absolute h-full bg-accent text-ink font-semibold flex items-center justify-center text-[9px] z-10"
                              title={`Break: ${b.start} – ${b.end}`}
                            >
                              Break
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Leave & Holidays */}
      {activeTab === 'leaves' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Card padding="md">
              <h3 className="text-base font-semibold text-ink mb-3">Scheduled Doctor Leaves</h3>
              <div className="divide-y divide-ink/10 text-xs">
                {doctorLeaves.length === 0 ? (
                  <div className="py-6 text-center text-ink/50">No leave dates currently scheduled</div>
                ) : (
                  doctorLeaves.map((leave) => (
                    <div key={leave.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-ink">
                          {formatDateIST(leave.date_from)} – {formatDateIST(leave.date_to)}
                        </div>
                        <div className="text-ink/70 mt-0.5">{leave.reason || 'Personal Leave'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLeave(leave.id)}
                        className="p-1.5 text-danger hover:bg-danger/10 rounded cursor-pointer"
                        title="Delete leave block"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card padding="md" className="space-y-4">
              <h3 className="text-base font-semibold text-ink">Book New Leave Period</h3>
              <div className="space-y-3">
                <Input
                  label="From Date *"
                  type="date"
                  value={leaveFrom}
                  onChange={(e) => setLeaveFrom(e.target.value)}
                />
                <Input
                  label="To Date *"
                  type="date"
                  value={leaveTo}
                  onChange={(e) => setLeaveTo(e.target.value)}
                />
                <Input
                  label="Reason"
                  placeholder="e.g. Annual Medical Conference"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                />
                <Button variant="primary" size="md" onClick={handleAddLeave}>
                  Add leave block
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: Slot Overrides */}
      {activeTab === 'overrides' && (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Day-Specific Slot Blocking</h3>
              <p className="text-xs text-ink/65">Toggle individual slots blocked or available on specific calendar dates.</p>
            </div>
            <div className="w-44">
              <Input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
            {[
              '09:00', '09:15', '09:30', '09:45',
              '10:00', '10:15', '10:30', '10:45',
              '11:00', '11:15', '11:30', '11:45',
              '14:00', '14:15', '14:30', '14:45',
              '15:00', '15:15', '15:30', '15:45',
            ].map((slot) => {
              const isBlocked = blockedSlots.has(slot);
              const isBooked = slot === '09:30'; // sample booked slot

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isBooked}
                  onClick={() => {
                    const next = new Set(blockedSlots);
                    if (next.has(slot)) next.delete(slot);
                    else next.add(slot);
                    setBlockedSlots(next);
                  }}
                  className={`p-3 rounded-card text-xs font-mono font-medium border text-center transition-colors cursor-pointer ${
                    isBooked
                      ? 'bg-ink text-base border-ink cursor-not-allowed opacity-80'
                      : isBlocked
                      ? 'bg-danger/15 text-danger border-danger/30'
                      : 'bg-base text-ink border-ink/20 hover:border-ink/40'
                  }`}
                >
                  <div className="font-bold">{slot}</div>
                  <div className="text-[10px] mt-0.5">
                    {isBooked ? 'Booked (Ravi S.)' : isBlocked ? 'Blocked' : 'Open'}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* TAB 4: 14-Day Preview */}
      {activeTab === 'preview' && (
        <Card padding="md" className="space-y-4">
          <h3 className="text-base font-semibold text-ink">Upcoming 14 Days Slot Inventory</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[...Array(14)].map((_, idx) => {
              const d = new Date();
              d.setDate(d.getDate() + idx);
              const dayOfWeek = d.getDay();
              const isWorking = dayOfWeek !== 0; // Sun off
              const slots = isWorking ? (dayOfWeek === 6 ? 16 : 28) : 0;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-card border text-center ${
                    isWorking ? 'border-ink/15 bg-base' : 'border-ink/10 bg-ink/5 opacity-50'
                  }`}
                >
                  <div className="text-xs text-ink/65 uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-base font-bold text-ink mt-0.5">{d.getDate()}</div>
                  <div className="text-[11px] font-mono mt-1 font-semibold text-accent">
                    {isWorking ? `${slots} slots` : 'Off'}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Sticky Save Bar (Appears when dirty) */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-ink text-base px-6 py-3.5 rounded-full border border-base/20 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3">
          <span className="text-xs font-semibold text-base/90">
            You have unsaved changes in this schedule.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleDiscard} className="text-base hover:bg-base/10">
              Discard
            </Button>
            <Button
              variant="inverted"
              size="sm"
              onClick={handleSaveSchedule}
              isLoading={isSaving}
            >
              Save schedule
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
