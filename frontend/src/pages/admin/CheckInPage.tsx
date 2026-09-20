import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TokenSlip } from '@/components/queue/TokenSlip';
import { useHospitalStore } from '@/store/hospitalStore';
import { checkInAppointment } from '@/services/adminApi';
import { isGracePeriodExceeded } from '@/lib/queue';
import { formatTimeIST, formatDateIST } from '@/lib/time';
import {
  QrCode,
  Phone,
  Hash,
  Scan,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Printer,
  Sparkles,
  Info,
} from 'lucide-react';
import type { Appointment } from '@/types';

export const CheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('code');

  const {
    hospital,
    appointments,
    queue_entries,
  } = useHospitalStore();

  const [lookupMode, setLookupMode] = useState<'qr' | 'phone' | 'code'>('qr');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedAppointments, setMatchedAppointments] = useState<Appointment[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    appointment: Appointment;
    token: string;
    position?: number;
    etaMinutes?: number;
    isLate?: boolean;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mode change
  useEffect(() => {
    inputRef.current?.focus();
  }, [lookupMode]);

  // Deep-link from other pages (e.g. ?code=APT-XYZ)
  useEffect(() => {
    if (queryCode) {
      setLookupMode('code');
      setSearchQuery(queryCode);
      performLookup(queryCode, 'code');
    }
  }, [queryCode]);

  // Counters for side panel
  const totalBookedToday = appointments.filter((a) => a.type === 'booked').length;
  const arrivedToday = appointments.filter(
    (a) => a.status === 'checked_in' || a.status === 'in_queue' || a.status === 'in_consultation' || a.status === 'completed'
  ).length;
  const yetToArrive = Math.max(0, totalBookedToday - arrivedToday);

  // Live list of today's arrivals
  const recentArrivals = queue_entries
    .filter((q) => q.checked_in_at)
    .sort((a, b) => new Date(b.checked_in_at!).getTime() - new Date(a.checked_in_at!).getTime())
    .slice(0, 6);

  const performLookup = (query: string, mode: 'qr' | 'phone' | 'code') => {
    setHasSearched(true);
    setCheckInResult(null);
    const clean = query.trim().toLowerCase();
    if (!clean) {
      setMatchedAppointments([]);
      return;
    }

    let matches: Appointment[] = [];
    if (mode === 'qr' || mode === 'code') {
      matches = appointments.filter((a) => a.booking_code.toLowerCase() === clean);
    } else if (mode === 'phone') {
      const digits = clean.replace(/\D/g, '');
      matches = appointments.filter((a) => {
        const pDigits = a.patient.phone?.replace(/\D/g, '') || '';
        return pDigits.includes(digits);
      });
    }

    setMatchedAppointments(matches);
  };

  const handleSimulateScan = () => {
    // Pick a random booked appointment that has not yet checked in
    const bookedPending = appointments.filter((a) => a.status === 'booked');
    const target = bookedPending.length > 0 ? bookedPending[Math.floor(Math.random() * bookedPending.length)] : appointments[0];
    if (target) {
      setSearchQuery(target.booking_code);
      performLookup(target.booking_code, 'qr');
    }
  };

  const handleCheckIn = async (appointmentId: string) => {
    setIsCheckingIn(true);
    try {
      const res = await checkInAppointment(appointmentId);
      const apt = appointments.find((a) => a.id === appointmentId);
      if (res.success && res.token && apt) {
        setCheckInResult({
          appointment: apt,
          token: res.token,
          position: res.position,
          etaMinutes: res.etaMinutes,
          isLate: res.isLate,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CHECK-IN"
        title="Patient Arrival Desk"
        description="Self-service barcode validation, mobile number family lookup, and automatic token assignment."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Left Desk Section (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card padding="lg">
            {/* Lookup Mode Selection Tabs */}
            <div className="flex items-center gap-2 border-b border-ink/10 pb-4 mb-4">
              {[
                { id: 'qr', label: 'Scan QR Code', icon: <QrCode className="w-4 h-4" /> },
                { id: 'phone', label: 'Mobile Number', icon: <Phone className="w-4 h-4" /> },
                { id: 'code', label: 'Booking Code / ID', icon: <Hash className="w-4 h-4" /> },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setLookupMode(m.id as any);
                    setSearchQuery('');
                    setMatchedAppointments([]);
                    setHasSearched(false);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                    lookupMode === m.id
                      ? 'bg-ink text-base'
                      : 'bg-base text-ink border border-ink/20 hover:border-ink/40'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Scan QR Viewfinder */}
            {lookupMode === 'qr' && (
              <div className="p-6 rounded-panel border border-dashed border-ink/25 bg-base/50 flex flex-col items-center justify-center text-center space-y-4 my-2">
                <div className="relative w-48 h-48 border-2 border-ink/20 rounded-card flex items-center justify-center bg-base overflow-hidden">
                  {/* Viewfinder corner accents */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-accent" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-accent" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-accent" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-accent" />
                  <Scan className="w-12 h-12 text-ink/30 animate-pulse" />
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-ink">Ready for barcode / QR scanner</h4>
                  <p className="text-xs text-ink/65 mt-0.5">
                    Connect USB or Bluetooth scanner and scan the patient's appointment slip.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSimulateScan}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Simulate scan (pick booked patient)
                  </Button>
                </div>
              </div>
            )}

            {/* Input Form for Manual Scanner or Phone */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                performLookup(searchQuery, lookupMode);
              }}
              className="mt-4 flex gap-2"
            >
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lookupMode === 'qr'
                    ? 'Scanner keystroke buffer (or enter code)...'
                    : lookupMode === 'phone'
                    ? 'Enter 10-digit phone number...'
                    : 'Enter booking code (e.g. APT-7K3Q9)...'
                }
                className="font-mono"
              />
              <Button variant="secondary" size="md" type="submit">
                Find
              </Button>
            </form>
          </Card>

          {/* Search Results Display */}
          {hasSearched && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink/70">
                <span>Matching Appointments ({matchedAppointments.length})</span>
              </div>

              {matchedAppointments.length === 0 ? (
                <Card padding="lg" className="text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-accent mx-auto" />
                  <h4 className="text-base font-medium text-ink">No matching booking found</h4>
                  <p className="text-xs text-ink/65 max-w-sm mx-auto">
                    No scheduled appointment matches the provided identifier. The patient can be registered as a walk-in.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/admin/walk-in')}
                  >
                    Register as walk-in patient
                  </Button>
                </Card>
              ) : (
                matchedAppointments.map((apt) => {
                  const isCheckedIn =
                    apt.status === 'checked_in' ||
                    apt.status === 'in_queue' ||
                    apt.status === 'in_consultation' ||
                    apt.status === 'completed';
                  const isCancelled = apt.status === 'cancelled';
                  const existingQ = queue_entries.find((q) => q.appointment_id === apt.id);

                  // Check grace period late arrival
                  const isLate = isGracePeriodExceeded(
                    apt.scheduled_start,
                    new Date().toISOString(),
                    hospital.settings.grace_period_minutes
                  );

                  return (
                    <Card key={apt.id} padding="md" className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-ink">{apt.patient.name}</h3>
                            <StatusBadge status={apt.status} size="sm" />
                          </div>
                          <div className="text-xs text-ink/65 mt-0.5">
                            {apt.patient.age ? `${apt.patient.age}y` : ''} • {apt.patient.gender} • {apt.patient.phone}
                          </div>
                        </div>

                        <div className="text-right text-xs">
                          <div className="font-mono font-bold text-sm text-ink">{apt.booking_code}</div>
                          <div className="text-ink/60">{formatDateIST(apt.scheduled_start)}</div>
                        </div>
                      </div>

                      {/* Appointment Metadata */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-ink/60">Doctor:</span>
                          <div className="font-medium text-ink">{apt.doctor_name}</div>
                        </div>
                        <div>
                          <span className="text-ink/60">Department:</span>
                          <div className="font-medium text-ink">{apt.department_name}</div>
                        </div>
                        <div>
                          <span className="text-ink/60">Scheduled slot:</span>
                          <div className="font-medium text-ink font-mono">
                            {formatTimeIST(apt.scheduled_start)}
                          </div>
                        </div>
                      </div>

                      {/* Late Arrival Policy Warning Banner */}
                      {!isCheckedIn && !isCancelled && isLate && (
                        <div className="p-3 rounded-card bg-info/10 border border-info/25 text-xs text-info flex items-start gap-2">
                          <Info className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <strong>Late Arrival:</strong> The patient arrived more than {hospital.settings.grace_period_minutes} minutes past their slot. Per policy, their place is reset behind the current queue.
                          </div>
                        </div>
                      )}

                      {/* Already Checked In Guard */}
                      {isCheckedIn && (
                        <div className="p-3 rounded-card bg-accent/15 border border-accent/30 text-xs text-ink flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-accent" />
                            <span>
                              Already checked in with token <strong>{existingQ?.token}</strong>.
                            </span>
                          </div>
                          {existingQ?.position && (
                            <span className="font-bold">Position #{existingQ.position} in line</span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-ink/10">
                        {!isCheckedIn && !isCancelled ? (
                          <Button
                            variant="primary"
                            size="md"
                            isLoading={isCheckingIn}
                            onClick={() => handleCheckIn(apt.id)}
                            icon={<UserCheck className="w-4 h-4" />}
                          >
                            Mark arrived & issue token
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              if (existingQ) {
                                setCheckInResult({
                                  appointment: apt,
                                  token: existingQ.token,
                                  position: existingQ.position,
                                  etaMinutes: existingQ.eta_minutes,
                                });
                              }
                            }}
                            icon={<Printer className="w-3.5 h-3.5" />}
                          >
                            Print token slip
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Ticket Slip Modal / Success Panel */}
          {checkInResult && (
            <Card padding="md" className="space-y-4">
              <div className="p-3 bg-success/10 border border-success/30 rounded-card text-xs text-success flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Arrival confirmed! Token successfully issued and queued.</span>
              </div>

              <TokenSlip
                hospitalName={hospital.name}
                token={checkInResult.token}
                patientName={checkInResult.appointment.patient.name}
                doctorName={checkInResult.appointment.doctor_name}
                departmentName={checkInResult.appointment.department_name}
                position={checkInResult.position}
                etaMinutes={checkInResult.etaMinutes}
                bookingCode={checkInResult.appointment.booking_code}
                appointmentTime={checkInResult.appointment.scheduled_start}
                onClose={() => setCheckInResult(null)}
              />
            </Card>
          )}
        </div>

        {/* Side Panel: Counters and Live Arrival Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Daily Counters */}
          <Card padding="md" className="space-y-3">
            <div className="text-xs uppercase tracking-wider font-semibold text-ink/70 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-ink inline-block" />
              <span>TODAY'S ARRIVALS</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-card bg-ink/5 border border-ink/10">
                <div className="text-2xl font-bold font-mono text-ink">{totalBookedToday}</div>
                <div className="text-[10px] text-ink/65 uppercase mt-0.5">Expected</div>
              </div>
              <div className="p-3 rounded-card bg-ink text-base">
                <div className="text-2xl font-bold font-mono text-base">{arrivedToday}</div>
                <div className="text-[10px] text-base/70 uppercase mt-0.5">Arrived</div>
              </div>
              <div className="p-3 rounded-card bg-ink/5 border border-ink/10">
                <div className="text-2xl font-bold font-mono text-ink">{yetToArrive}</div>
                <div className="text-[10px] text-ink/65 uppercase mt-0.5">Pending</div>
              </div>
            </div>
          </Card>

          {/* Recent Arrivals List */}
          <Card padding="md" className="space-y-3">
            <div className="text-xs uppercase tracking-wider font-semibold text-ink/70 flex items-center justify-between">
              <span>Live arrival timeline</span>
              <span className="text-[10px] text-ink/50">Today</span>
            </div>

            <div className="divide-y divide-ink/10 text-xs">
              {recentArrivals.length === 0 ? (
                <div className="py-4 text-center text-ink/50">No check-ins recorded yet</div>
              ) : (
                recentArrivals.map((q) => {
                  const apt = appointments.find((a) => a.id === q.appointment_id);
                  return (
                    <div key={q.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-ink">{apt?.patient.name || 'Patient'}</span>
                          {apt?.created_via === 'kiosk' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-accent/20 text-ink border border-accent/40">
                              Kiosk
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink/60">
                          {formatTimeIST(q.checked_in_at)} • {apt?.department_name}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink/5 text-ink">
                        {q.token}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckInPage;
