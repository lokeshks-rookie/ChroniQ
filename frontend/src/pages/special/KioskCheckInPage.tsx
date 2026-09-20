import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useHospitalStore } from '@/store/hospitalStore';
import { useLang, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import {
  getCheckInEligibility,
  maskPatientName,
  maskPhoneNumber,
  type EligibilityEvaluation,
} from '@/lib/kiosk';
import {
  lookupByPhone,
  lookupByQr,
  kioskCheckIn,
  registerKioskWalkIn,
  findShortestWaitDoctor,
} from '@/services/kioskApi';
import { formatTimeIST, formatDateIST } from '@/lib/time';
import { TokenSlip } from '@/components/queue/TokenSlip';
import {
  Calendar,
  UserCheck,
  UserPlus,
  QrCode,
  Phone,
  ArrowRight,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  X,
  ShieldCheck,
  Delete,
} from 'lucide-react';
import type { Appointment, QueueEntry } from '@/types';

type KioskStep =
  | 'welcome'
  | 'find'
  | 'select'
  | 'confirm'
  | 'token'
  | 'walkin_phone'
  | 'walkin_name'
  | 'walkin_reason'
  | 'walkin_dept';

export const KioskCheckInPage: React.FC = () => {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const { lang, setLang, t } = useLang('en');

  const { hospital, departments, appointments, queue_entries } = useHospitalStore();

  const isHospitalValid = hospital.id === hospitalId;

  // UI / Kiosk Settings
  const [largeText, setLargeText] = useState<boolean>(false);
  const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);
  const [isIdleWarningOpen, setIsIdleWarningOpen] = useState<boolean>(false);
  const [idleCountdown, setIdleCountdown] = useState<number>(15);

  // Flow State (Wiped completely after session)
  const [step, setStep] = useState<KioskStep>('welcome');
  const [findMode, setFindMode] = useState<'phone' | 'qr'>('phone');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [patientNameInput, setPatientNameInput] = useState<string>('');
  const [walkInReason, setWalkInReason] = useState<string>('Fever or cold');

  // Matched appointments from lookup
  const [matchedAppointments, setMatchedAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityEvaluation | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Success Token Result
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [issuedQueueEntry, setIssuedQueueEntry] = useState<QueueEntry | null>(null);
  const [autoReturnCountdown, setAutoReturnCountdown] = useState<number>(20);

  // Hidden USB scanner input
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoReturnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Wipe all session state (Privacy Rule)
  const wipeSessionState = useCallback(() => {
    setStep('welcome');
    setFindMode('phone');
    setPhoneInput('');
    setPatientNameInput('');
    setWalkInReason('Fever or cold');
    setMatchedAppointments([]);
    setSelectedAppointment(null);
    setEligibility(null);
    setIssuedToken(null);
    setIssuedQueueEntry(null);
    setIsProcessing(false);
    setIsIdleWarningOpen(false);
    setAutoReturnCountdown(20);
  }, []);

  // 2. Idle Guard (45 seconds without touch -> 15s warning -> reset to welcome)
  const resetIdleTimer = useCallback(() => {
    if (step === 'welcome') {
      if (isIdleWarningOpen) setIsIdleWarningOpen(false);
      return;
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);

    setIsIdleWarningOpen(false);
    setIdleCountdown(15);

    // 45 seconds timeout
    idleTimerRef.current = setTimeout(() => {
      setIsIdleWarningOpen(true);
      let count = 15;
      idleIntervalRef.current = setInterval(() => {
        count--;
        setIdleCountdown(count);
        if (count <= 0) {
          if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
          wipeSessionState();
        }
      }, 1000);
    }, 45000);
  }, [step, isIdleWarningOpen, wipeSessionState]);

  useEffect(() => {
    const handleActivity = () => resetIdleTimer();
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    resetIdleTimer();

    return () => {
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
    };
  }, [resetIdleTimer]);

  // 3. Auto-return to Welcome after 20 seconds on Token screen
  useEffect(() => {
    if (step === 'token') {
      setAutoReturnCountdown(20);
      autoReturnIntervalRef.current = setInterval(() => {
        setAutoReturnCountdown((prev) => {
          if (prev <= 1) {
            if (autoReturnIntervalRef.current) clearInterval(autoReturnIntervalRef.current);
            wipeSessionState();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (autoReturnIntervalRef.current) clearInterval(autoReturnIntervalRef.current);
      };
    }
  }, [step, wipeSessionState]);

  // 4. USB Barcode Scanner listener
  useEffect(() => {
    if (step === 'find' && findMode === 'qr') {
      barcodeInputRef.current?.focus();
    }
  }, [step, findMode]);

  const handleBarcodeEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = (e.target as HTMLInputElement).value;
      if (val) {
        await handleScanPayload(val);
      }
    }
  };

  // 5. Keypad actions for phone input
  const handleKeypadPress = (digit: string) => {
    if (phoneInput.length < 10) {
      setPhoneInput((prev) => prev + digit);
    }
  };

  const handleKeypadBackspace = () => {
    setPhoneInput((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setPhoneInput('');
  };

  // 6. Execute Lookup by Phone
  const handleSearchByPhone = async () => {
    if (phoneInput.length !== 10) return;
    setIsProcessing(true);

    try {
      const matches = await lookupByPhone(hospitalId || '', phoneInput);
      setMatchedAppointments(matches);

      if (matches.length === 0) {
        setEligibility({ result: 'not_found' });
        setStep('confirm');
      } else if (matches.length === 1) {
        // Skip directly to confirm if 1 match
        const apt = matches[0];
        setSelectedAppointment(apt);
        const evalRes = getCheckInEligibility(
          apt,
          new Date().toISOString(),
          hospital.settings?.grace_period_minutes || 10
        );
        setEligibility(evalRes);
        setStep('confirm');
      } else {
        // Multiple matches: let patient select
        setStep('select');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. Select Appointment from list
  const handleSelectAppointment = (apt: Appointment) => {
    setSelectedAppointment(apt);
    const evalRes = getCheckInEligibility(
      apt,
      new Date().toISOString(),
      hospital.settings?.grace_period_minutes || 10
    );
    setEligibility(evalRes);
    setStep('confirm');
  };

  // 8. Execute Simulated Scan
  const handleSimulateScan = async () => {
    // Pick first booked appointment today
    const sample = appointments.find(
      (a) => a.hospital_id === hospitalId && a.status === 'booked'
    );
    if (sample) {
      await handleScanPayload(sample.booking_code);
    } else {
      // Pick any appointment
      const anyApt = appointments.find((a) => a.hospital_id === hospitalId);
      if (anyApt) {
        await handleScanPayload(anyApt.booking_code);
      }
    }
  };

  const handleScanPayload = async (payload: string) => {
    setIsProcessing(true);
    try {
      const match = await lookupByQr(hospitalId || '', payload);
      if (match) {
        setSelectedAppointment(match);
        const evalRes = getCheckInEligibility(
          match,
          new Date().toISOString(),
          hospital.settings?.grace_period_minutes || 10
        );
        setEligibility(evalRes);
      } else {
        setSelectedAppointment(null);
        setEligibility({ result: 'not_found' });
      }
      setStep('confirm');
    } finally {
      setIsProcessing(false);
    }
  };

  // 9. Confirm Check-In
  const handleExecuteCheckIn = async () => {
    if (!selectedAppointment) return;
    setIsProcessing(true);

    try {
      const res = await kioskCheckIn(selectedAppointment.id);
      if (res.success && res.token) {
        setIssuedToken(res.token);

        // Find created queue entry
        const qEntry = useHospitalStore
          .getState()
          .queue_entries.find((q) => q.appointment_id === selectedAppointment.id);
        setIssuedQueueEntry(qEntry || null);

        setStep('token');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 10. Walk-in Flow handlers
  const handleWalkInPhoneNext = () => {
    if (phoneInput.length !== 10) return;
    // Check if phone matches an existing patient in hospital store
    const existing = appointments.find((a) => a.patient.phone?.endsWith(phoneInput));
    if (existing) {
      setPatientNameInput(existing.patient.name);
      setStep('walkin_reason');
    } else {
      setStep('walkin_name');
    }
  };

  const handleWalkInRegister = async (deptId: string) => {
    const { doctor } = findShortestWaitDoctor(deptId);
    if (!doctor) return;

    setIsProcessing(true);
    try {
      const res = await registerKioskWalkIn({
        hospitalId: hospitalId || '',
        departmentId: deptId,
        doctorId: doctor.id,
        patientName: patientNameInput || 'Walk-in Patient',
        phone: `+91 ${phoneInput}`,
        reason: walkInReason,
      });

      if (res.success) {
        setSelectedAppointment(res.appointment);
        setIssuedToken(res.queueEntry.token);
        setIssuedQueueEntry(res.queueEntry);
        setStep('token');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Print thermal token slip
  const handlePrintSlip = () => {
    window.print();
  };

  // Full-screen not-found state if hospitalId unknown
  if (!isHospitalValid) {
    return (
      <div className="min-h-screen w-screen bg-base text-ink flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-danger">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <div className="text-xs uppercase font-bold tracking-widest text-accent">■ INVALID TERMINAL</div>
          <h1 className="text-3xl font-bold text-ink">Kiosk Terminal Offline</h1>
          <p className="text-sm text-ink/70 leading-relaxed">
            The hospital identifier <code className="text-accent">{hospitalId}</code> is not registered.
          </p>
        </div>
        <Link
          to={`/checkin/${hospital.id}`}
          className="px-6 py-3 rounded-full bg-ink text-base font-bold text-sm hover:opacity-90"
        >
          Open Default Hospital Kiosk ({hospital.name})
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-screen flex flex-col justify-between bg-base text-ink select-none ${
        largeText ? 'text-lg' : 'text-base'
      }`}
    >
      {/* 1. KIOSK TOP NAVIGATION BAR */}
      <header className="px-8 py-5 border-b border-ink/10 flex items-center justify-between gap-4 bg-base shrink-0">
        <div className="flex items-center gap-4">
          {step !== 'welcome' && (
            <button
              type="button"
              onClick={() => {
                if (step === 'select' || step === 'confirm') setStep('find');
                else if (step === 'walkin_name') setStep('walkin_phone');
                else if (step === 'walkin_reason') setStep('walkin_phone');
                else if (step === 'walkin_dept') setStep('walkin_reason');
                else wipeSessionState();
              }}
              className="h-12 px-4 rounded-full border border-ink/20 flex items-center gap-2 font-bold text-sm text-ink hover:bg-ink/5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('common.back')}</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="ChroniQ Logo"
              className="w-9 h-9 object-contain shrink-0"
            />
            <div>
              <div className="eyebrow">
                {hospital.name}
              </div>
              <div className="text-xl font-bold text-ink">ChroniQ Self-Service</div>
            </div>
          </div>
        </div>

        {/* Top-Right Tools: Language Switcher, Text Size Toggle, Need Help Button */}
        <div className="flex items-center gap-3">
          {/* Step Indicator (when in flow) */}
          {step !== 'welcome' && step !== 'token' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink/5 text-xs font-bold text-ink/70">
              <span className={step === 'find' || step.startsWith('walkin') ? 'text-ink font-black' : ''}>01 Find</span>
              <span>•</span>
              <span className={step === 'confirm' ? 'text-ink font-black' : ''}>02 Confirm</span>
              <span>•</span>
              <span>03 Token</span>
            </div>
          )}

          {/* Text Size Toggle (A / A+) */}
          <button
            type="button"
            onClick={() => setLargeText((prev) => !prev)}
            aria-label="Toggle text size"
            className="h-12 w-12 rounded-full border border-ink/20 font-bold text-sm text-ink hover:bg-ink/5 cursor-pointer flex items-center justify-center"
          >
            {largeText ? 'A+' : 'A'}
          </button>

          {/* Language Selector */}
          <div className="flex items-center p-1 rounded-full border border-ink/20 bg-base gap-1">
            {SUPPORTED_LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLang(item.code)}
                className={`h-10 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  lang === item.code ? 'bg-ink text-base' : 'text-ink/70 hover:text-ink'
                }`}
              >
                {item.nativeLabel}
              </button>
            ))}
          </div>

          {/* Need Help Button */}
          <button
            type="button"
            onClick={() => setHelpModalOpen(true)}
            className="h-12 px-5 rounded-full bg-accent/15 border border-accent/30 text-ink font-bold text-sm flex items-center gap-2 hover:bg-accent/25 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-accent" />
            <span>{t('common.need_help')}</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN KIOSK BODY */}
      <main className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto p-6 sm:p-8">
        {/* ==================================================================== */}
        {/* STEP: WELCOME SCREEN                                                 */}
        {/* ==================================================================== */}
        {step === 'welcome' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Ink Hero Band (The page's ONE feature band) */}
            <div className="p-8 sm:p-10 rounded-panel bg-ink text-base space-y-3 relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-3">
                <div className="text-xs uppercase font-bold tracking-widest text-accent flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span>■ {hospital.name.toUpperCase()}</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-base">
                  {t('kiosk.welcome_title')}
                </h2>
                <p className="text-lg text-base/80 max-w-xl leading-relaxed">
                  {t('kiosk.welcome_subtitle')}
                </p>
              </div>
              <img
                src="/logo.png"
                alt="ChroniQ Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0"
              />
            </div>

            {/* Emergency Notice Banner */}
            <div className="p-4 rounded-card bg-danger/10 border border-danger/30 text-ink flex items-center gap-3 text-sm font-semibold">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
              <span>{t('kiosk.emergency_banner')}</span>
            </div>

            {/* Two Large Choice Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Option A: Has Appointment */}
              <button
                type="button"
                onClick={() => {
                  setStep('find');
                  setFindMode('phone');
                }}
                className="p-8 rounded-panel bg-base border-2 border-ink/15 hover:border-ink transition-all text-left space-y-4 cursor-pointer group shadow-sm hover:shadow-md"
              >
                <div className="w-16 h-16 rounded-full bg-ink text-base flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-ink">
                    {t('kiosk.has_appointment_title')}
                  </h3>
                  <p className="text-sm text-ink/70 leading-relaxed">
                    {t('kiosk.has_appointment_desc')}
                  </p>
                </div>
                <div className="pt-2 flex items-center text-sm font-bold text-accent group-hover:translate-x-1 transition-transform">
                  <span>Start Check-in</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </div>
              </button>

              {/* Option B: Walk-In Consultation */}
              {hospital.settings?.walk_ins_enabled !== false ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep('walkin_phone');
                    setPhoneInput('');
                  }}
                  className="p-8 rounded-panel bg-base border-2 border-ink/15 hover:border-ink transition-all text-left space-y-4 cursor-pointer group shadow-sm hover:shadow-md"
                >
                  <div className="w-16 h-16 rounded-full bg-accent text-ink flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserPlus className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-ink">
                      {t('kiosk.no_appointment_title')}
                    </h3>
                    <p className="text-sm text-ink/70 leading-relaxed">
                      {t('kiosk.no_appointment_desc')}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center text-sm font-bold text-accent group-hover:translate-x-1 transition-transform">
                    <span>Get Walk-in Token</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </div>
                </button>
              ) : (
                <div className="p-8 rounded-panel bg-base border border-ink/10 text-left space-y-3 opacity-60">
                  <UserPlus className="w-10 h-10 text-ink/40" />
                  <h3 className="text-xl font-bold text-ink">{t('kiosk.no_appointment_title')}</h3>
                  <p className="text-xs text-ink/70">{t('kiosk.walk_in_disabled_desc')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP: PATH A - FIND APPOINTMENT (Phone Keypad or Scan QR)            */}
        {/* ==================================================================== */}
        {step === 'find' && (
          <div className="space-y-6 max-w-xl mx-auto w-full">
            {/* Mode Switcher */}
            <div className="flex p-1.5 bg-ink/5 rounded-full border border-ink/10 gap-1">
              <button
                type="button"
                onClick={() => setFindMode('phone')}
                className={`flex-1 py-3 rounded-full font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  findMode === 'phone' ? 'bg-ink text-base shadow-sm' : 'text-ink/70 hover:text-ink'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>{t('kiosk.find_by_phone')}</span>
              </button>

              <button
                type="button"
                onClick={() => setFindMode('qr')}
                className={`flex-1 py-3 rounded-full font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  findMode === 'qr' ? 'bg-ink text-base shadow-sm' : 'text-ink/70 hover:text-ink'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>{t('kiosk.find_by_qr')}</span>
              </button>
            </div>

            {/* Mode 1: Numeric Keypad for Phone */}
            {findMode === 'phone' && (
              <div className="p-8 rounded-panel bg-base border border-ink/15 space-y-6 shadow-sm">
                {/* Phone Display Box */}
                <div className="p-4 rounded-card bg-ink/5 border border-ink/10 flex items-center justify-between">
                  <span className="text-2xl font-bold font-mono text-ink/60">+91</span>
                  <span className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-ink tabular-nums">
                    {phoneInput ? phoneInput : <span className="text-ink/30">00000 00000</span>}
                  </span>
                  <span className="text-xs font-bold text-ink/60">{phoneInput.length}/10</span>
                </div>

                {/* On-screen Numeric Keypad (72-88px keys) */}
                <div className="grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      className="h-18 rounded-card bg-base border border-ink/20 text-3xl font-bold font-mono text-ink hover:bg-ink/5 active:bg-ink active:text-base transition-colors cursor-pointer flex items-center justify-center"
                    >
                      {digit}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="h-18 rounded-card bg-base border border-ink/20 text-xs uppercase font-bold text-danger hover:bg-danger/10 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-18 rounded-card bg-base border border-ink/20 text-3xl font-bold font-mono text-ink hover:bg-ink/5 active:bg-ink active:text-base transition-colors cursor-pointer flex items-center justify-center"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="h-18 rounded-card bg-base border border-ink/20 text-xl font-bold text-ink hover:bg-ink/5 active:bg-ink active:text-base transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Delete className="w-6 h-6" />
                  </button>
                </div>

                {/* Search Button (72px primary button) */}
                <button
                  type="button"
                  onClick={handleSearchByPhone}
                  disabled={phoneInput.length !== 10 || isProcessing}
                  className="w-full h-18 rounded-full bg-ink text-base font-bold text-xl flex items-center justify-center gap-3 disabled:opacity-40 cursor-pointer shadow-md hover:opacity-90"
                >
                  <span>Find My Booking</span>
                  <span className="w-8 h-8 rounded-full bg-accent text-ink flex items-center justify-center">
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </button>
              </div>
            )}

            {/* Mode 2: Scan QR Viewfinder */}
            {findMode === 'qr' && (
              <div className="p-8 rounded-panel bg-base border border-ink/15 space-y-6 text-center shadow-sm">
                <div className="relative w-56 h-56 mx-auto border-2 border-dashed border-ink/30 rounded-card flex flex-col items-center justify-center bg-base/50 overflow-hidden">
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-accent" />
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-accent" />
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-accent" />
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-accent" />

                  <QrCode className="w-16 h-16 text-ink/40 animate-pulse" />
                  <span className="text-xs font-semibold text-ink/60 mt-3">Optical Scan Zone</span>
                </div>

                <p className="text-sm font-semibold text-ink/80 leading-relaxed">
                  {t('kiosk.scan_instructions')}
                </p>

                {/* Hidden input for USB barcode scanner */}
                <input
                  ref={barcodeInputRef}
                  type="text"
                  autoComplete="off"
                  onKeyDown={handleBarcodeEnter}
                  className="opacity-0 absolute -z-10"
                />

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSimulateScan}
                    disabled={isProcessing}
                    className="h-16 px-8 rounded-full bg-accent text-ink font-bold text-base hover:opacity-90 cursor-pointer shadow-md"
                  >
                    {t('kiosk.simulate_scan_btn')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP: SELECT FROM MULTIPLE APPOINTMENTS MATCHED                     */}
        {/* ==================================================================== */}
        {step === 'select' && (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            <div className="space-y-1">
              <div className="text-xs uppercase font-bold text-accent">■ STEP 01</div>
              <h2 className="text-3xl font-bold text-ink">{t('kiosk.select_appointment')}</h2>
              <p className="text-sm text-ink/70">Multiple bookings were found for this number today.</p>
            </div>

            <div className="space-y-3">
              {matchedAppointments.map((apt) => (
                <button
                  key={apt.id}
                  type="button"
                  onClick={() => handleSelectAppointment(apt)}
                  className="w-full p-6 rounded-panel bg-base border-2 border-ink/15 hover:border-ink transition-all text-left flex items-center justify-between gap-4 cursor-pointer group shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-ink">
                      {maskPatientName(apt.patient.name)}
                    </div>
                    <div className="text-sm text-ink/70 font-semibold">
                      {apt.doctor_name} • {apt.department_name}
                    </div>
                    <div className="text-xs font-mono text-ink/60">
                      Scheduled at {formatTimeIST(apt.scheduled_start)}
                    </div>
                  </div>

                  <span className="w-10 h-10 rounded-full bg-ink/5 group-hover:bg-ink group-hover:text-base flex items-center justify-center transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP: CONFIRM APPOINTMENT & ELIGIBILITY VERIFICATION                */}
        {/* ==================================================================== */}
        {step === 'confirm' && (
          <div className="space-y-6 max-w-xl mx-auto w-full">
            <div className="space-y-1">
              <div className="text-xs uppercase font-bold text-accent">■ STEP 02</div>
              <h2 className="text-3xl font-bold text-ink">{t('kiosk.confirm_checkin')}</h2>
            </div>

            {/* If NOT FOUND */}
            {eligibility?.result === 'not_found' && (
              <div className="p-8 rounded-panel bg-base border border-ink/15 space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-danger/10 text-danger mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-ink">Appointment Not Found</h3>
                  <p className="text-sm text-ink/70">{t('eligibility.not_found')}</p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('find');
                      setPhoneInput('');
                    }}
                    className="h-16 rounded-full border border-ink/20 font-bold text-ink hover:bg-ink/5"
                  >
                    {t('common.retry')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('walkin_phone');
                      setPhoneInput('');
                    }}
                    className="h-16 rounded-full bg-ink text-base font-bold text-lg"
                  >
                    {t('eligibility.get_walkin')}
                  </button>
                </div>
              </div>
            )}

            {/* If appointment found: display masked details card */}
            {selectedAppointment && (
              <div className="p-8 rounded-panel bg-base border border-ink/15 space-y-6 shadow-sm">
                <div className="divide-y divide-ink/10 text-sm">
                  <div className="pb-3 flex items-center justify-between">
                    <span className="text-ink/60 font-semibold">Patient Name</span>
                    <span className="font-bold text-ink text-base">
                      {maskPatientName(selectedAppointment.patient.name)}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-ink/60 font-semibold">Mobile</span>
                    <span className="font-mono font-bold text-ink">
                      {maskPhoneNumber(selectedAppointment.patient.phone)}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-ink/60 font-semibold">Doctor & Chamber</span>
                    <span className="font-bold text-ink">
                      {selectedAppointment.doctor_name}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-ink/60 font-semibold">Department</span>
                    <span className="font-bold text-ink">
                      {selectedAppointment.department_name}
                    </span>
                  </div>

                  <div className="pt-3 flex items-center justify-between">
                    <span className="text-ink/60 font-semibold">Slot Time</span>
                    <span className="font-mono font-bold text-ink">
                      {formatTimeIST(selectedAppointment.scheduled_start)}
                    </span>
                  </div>
                </div>

                {/* ELIGIBILITY FEEDBACK BANNERS */}
                {eligibility?.result === 'too_early' && (
                  <div className="p-4 rounded-card bg-info/10 border border-info/30 text-xs font-semibold text-info flex items-center gap-2.5">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      {t('eligibility.too_early', {
                        time: eligibility.openTimeStr ? formatTimeIST(eligibility.openTimeStr) : '60m before',
                      })}
                    </span>
                  </div>
                )}

                {eligibility?.result === 'late' && (
                  <div className="p-4 rounded-card bg-accent/20 border border-accent/40 text-xs font-semibold text-ink flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-accent" />
                    <span>{t('eligibility.late', { min: eligibility.minutesLate || 15 })}</span>
                  </div>
                )}

                {eligibility?.result === 'already_checked_in' && (
                  <div className="p-4 rounded-card bg-success/15 border border-success/30 text-xs font-semibold text-success flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('eligibility.already_checked_in')}</span>
                  </div>
                )}

                {eligibility?.result === 'cancelled' && (
                  <div className="p-4 rounded-card bg-danger/10 border border-danger/30 text-xs font-semibold text-danger flex items-center gap-2.5">
                    <X className="w-4 h-4 shrink-0" />
                    <span>{t('eligibility.cancelled')}</span>
                  </div>
                )}

                {eligibility?.result === 'wrong_day' && (
                  <div className="p-4 rounded-card bg-accent/20 border border-accent/40 text-xs font-semibold text-ink flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 shrink-0 text-accent" />
                    <span>
                      {t('eligibility.wrong_day', {
                        day: formatDateIST(eligibility.appointmentDateStr),
                        time: formatTimeIST(eligibility.appointmentDateStr),
                      })}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2">
                  {eligibility?.result === 'eligible' || eligibility?.result === 'late' ? (
                    <button
                      type="button"
                      onClick={handleExecuteCheckIn}
                      disabled={isProcessing}
                      className="w-full h-18 rounded-full bg-ink text-base font-bold text-xl flex items-center justify-center gap-3 cursor-pointer shadow-md hover:opacity-90 disabled:opacity-50"
                    >
                      <span>{t('kiosk.check_in_btn')}</span>
                      <span className="w-8 h-8 rounded-full bg-accent text-ink flex items-center justify-center">
                        <ArrowRight className="w-5 h-5" />
                      </span>
                    </button>
                  ) : eligibility?.result === 'already_checked_in' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const q = queue_entries.find((entry) => entry.appointment_id === selectedAppointment.id);
                        setIssuedToken(q?.token || 'CARD-001');
                        setIssuedQueueEntry(q || null);
                        setStep('token');
                      }}
                      className="w-full h-18 rounded-full bg-ink text-base font-bold text-xl flex items-center justify-center gap-3 cursor-pointer shadow-md"
                    >
                      <span>View Token Details</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={wipeSessionState}
                      className="w-full h-16 rounded-full border border-ink/20 font-bold text-ink hover:bg-ink/5"
                    >
                      Return to Welcome Screen
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP: TOKEN ISSUED / SUCCESS SCREEN                                 */}
        {/* ==================================================================== */}
        {step === 'token' && selectedAppointment && issuedToken && (
          <div className="space-y-6 max-w-xl mx-auto w-full text-center animate-in zoom-in-95 duration-300">
            <div className="p-8 rounded-panel bg-base border-2 border-ink space-y-6 shadow-xl relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-success/15 border border-success/30 text-success mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <div className="text-xs uppercase font-bold text-accent">■ TOKEN ISSUED</div>
                <h2 className="text-3xl font-bold text-ink">{t('kiosk.token_ready')}</h2>
                <p className="text-sm text-ink/70">{t('kiosk.token_instructions')}</p>
              </div>

              {/* Big Numerals Token */}
              <div className="py-4 bg-ink/5 rounded-card border border-ink/10">
                <div className="text-xs font-bold uppercase tracking-widest text-ink/60">YOUR TOKEN</div>
                <div className="text-6xl sm:text-7xl font-mono font-black tracking-tight text-ink tabular-nums">
                  {issuedToken}
                </div>
              </div>

              {/* Doctor & Room */}
              <div className="grid grid-cols-2 gap-4 text-left p-4 rounded-card bg-base border border-ink/10 text-sm">
                <div>
                  <div className="text-xs text-ink/60 font-semibold">Doctor</div>
                  <div className="font-bold text-ink">{selectedAppointment.doctor_name}</div>
                </div>
                <div>
                  <div className="text-xs text-ink/60 font-semibold">Chamber / Room</div>
                  <div className="font-bold text-ink">Room 102</div>
                </div>
              </div>

              {/* Action Buttons: Print Slip & Done */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="h-16 rounded-full border-2 border-ink font-bold text-base text-ink flex items-center justify-center gap-2 hover:bg-ink/5 cursor-pointer"
                >
                  <Printer className="w-5 h-5" />
                  <span>{t('kiosk.print_slip')}</span>
                </button>

                <button
                  type="button"
                  onClick={wipeSessionState}
                  className="h-16 rounded-full bg-ink text-base font-bold text-lg hover:opacity-90 cursor-pointer shadow-md"
                >
                  {t('kiosk.finish')}
                </button>
              </div>

              {/* QR Code to track token on phone */}
              {/* TODO: Patient portal is built separately in Section 4.1/4.2 */}
              <div className="pt-2 flex flex-col items-center justify-center gap-2">
                <div className="p-2 bg-base rounded-card border border-ink/15 inline-block shadow-sm">
                  <QRCodeSVG
                    value={`${window.location.origin}/app/queue/${selectedAppointment.id}`}
                    size={100}
                    level="M"
                  />
                </div>
                <div className="text-xs font-semibold text-ink/70">
                  Track your token on your phone
                </div>
              </div>

              {/* Auto-return countdown */}
              <div className="text-xs text-ink/60 font-mono">
                {t('kiosk.auto_return_notice', { sec: autoReturnCountdown })}
              </div>
            </div>

            {/* Hidden thermal print container */}
            <div id="thermal-print-area" className="hidden print:block">
              <TokenSlip
                hospitalName={hospital.name}
                token={issuedToken}
                patientName={maskPatientName(selectedAppointment.patient.name)}
                doctorName={selectedAppointment.doctor_name}
                departmentName={selectedAppointment.department_name}
                position={issuedQueueEntry?.position || 1}
                etaMinutes={issuedQueueEntry?.eta_minutes || 10}
                bookingCode={selectedAppointment.booking_code}
                appointmentTime={selectedAppointment.scheduled_start}
                onClose={() => {}}
              />
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP: PATH B (WALK-IN) - PHONE INPUT                                */}
        {/* ==================================================================== */}
        {step === 'walkin_phone' && (
          <div className="space-y-6 max-w-xl mx-auto w-full">
            <div className="space-y-1">
              <div className="text-xs uppercase font-bold text-accent">■ WALK-IN 01</div>
              <h2 className="text-3xl font-bold text-ink">{t('walkin.enter_phone')}</h2>
              <p className="text-sm text-ink/70">Enter your 10-digit mobile number to receive queue alerts.</p>
            </div>

            <div className="p-8 rounded-panel bg-base border border-ink/15 space-y-6 shadow-sm">
              <div className="p-4 rounded-card bg-ink/5 border border-ink/10 flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-ink/60">+91</span>
                <span className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-ink tabular-nums">
                  {phoneInput ? phoneInput : <span className="text-ink/30">00000 00000</span>}
                </span>
                <span className="text-xs font-bold text-ink/60">{phoneInput.length}/10</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-18 rounded-card bg-base border border-ink/20 text-3xl font-bold font-mono text-ink hover:bg-ink/5 active:bg-ink active:text-base cursor-pointer flex items-center justify-center"
                  >
                    {digit}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-18 rounded-card bg-base border border-ink/20 text-xs uppercase font-bold text-danger hover:bg-danger/10 cursor-pointer flex items-center justify-center"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-18 rounded-card bg-base border border-ink/20 text-3xl font-bold font-mono text-ink hover:bg-ink/5 active:bg-ink active:text-base cursor-pointer flex items-center justify-center"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="h-18 rounded-card bg-base border border-ink/20 text-xl font-bold text-ink hover:bg-ink/5 cursor-pointer flex items-center justify-center"
                >
                  <Delete className="w-6 h-6" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleWalkInPhoneNext}
                disabled={phoneInput.length !== 10}
                className="w-full h-18 rounded-full bg-ink text-base font-bold text-xl flex items-center justify-center gap-3 disabled:opacity-40 cursor-pointer shadow-md hover:opacity-90"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5 text-accent" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP: PATH B (WALK-IN) - NAME INPUT (On-screen QWERTY Keyboard)    */}
        {/* ==================================================================== */}
        {step === 'walkin_name' && (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            <div className="space-y-1">
              <div className="text-xs uppercase font-bold text-accent">■ WALK-IN 02</div>
              <h2 className="text-3xl font-bold text-ink">{t('walkin.enter_name')}</h2>
              <p className="text-sm text-ink/70">Type patient full name using the on-screen keyboard.</p>
            </div>

            <div className="p-6 sm:p-8 rounded-panel bg-base border border-ink/15 space-y-6 shadow-sm">
              <div className="p-4 rounded-card bg-ink/5 border border-ink/10 text-2xl font-bold text-ink">
                {patientNameInput ? patientNameInput : <span className="text-ink/30">e.g. Ramesh Kumar</span>}
              </div>

              {/* Simple QWERTY Touch Layout */}
              <div className="space-y-2">
                {[
                  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
                  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
                ].map((row, rowIdx) => (
                  <div key={rowIdx} className="flex justify-center gap-1.5 sm:gap-2">
                    {row.map((char) => (
                      <button
                        key={char}
                        type="button"
                        onClick={() => setPatientNameInput((prev) => prev + char)}
                        className="h-14 sm:h-16 flex-1 max-w-[56px] rounded-card bg-base border border-ink/20 font-bold text-lg text-ink hover:bg-ink/5 active:bg-ink active:text-base cursor-pointer flex items-center justify-center"
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                ))}

                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPatientNameInput((prev) => prev + ' ')}
                    className="h-14 sm:h-16 flex-1 rounded-card bg-base border border-ink/20 font-bold text-sm text-ink hover:bg-ink/5 active:bg-ink active:text-base cursor-pointer flex items-center justify-center"
                  >
                    SPACE
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientNameInput((prev) => prev.slice(0, -1))}
                    className="h-14 sm:h-16 w-24 rounded-card bg-base border border-ink/20 font-bold text-sm text-ink hover:bg-ink/5 active:bg-ink active:text-base cursor-pointer flex items-center justify-center"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('walkin_reason')}
                disabled={!patientNameInput.trim()}
                className="w-full h-18 rounded-full bg-ink text-base font-bold text-xl flex items-center justify-center gap-3 disabled:opacity-40 cursor-pointer shadow-md hover:opacity-90"
              >
                <span>Select Symptoms</span>
                <ArrowRight className="w-5 h-5 text-accent" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP: PATH B (WALK-IN) - REASON SELECTION (6 Tappable Options)     */}
        {/* ==================================================================== */}
        {step === 'walkin_reason' && (
          <div className="space-y-6 max-w-xl mx-auto w-full">
            <div className="space-y-1">
              <div className="text-xs uppercase font-bold text-accent">■ WALK-IN 03</div>
              <h2 className="text-3xl font-bold text-ink">{t('walkin.select_reason')}</h2>
              <p className="text-sm text-ink/70">Tap the option that best describes your symptom.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'fever', label: t('walkin.reason_fever') },
                { key: 'pain', label: t('walkin.reason_pain') },
                { key: 'skin', label: t('walkin.reason_skin') },
                { key: 'followup', label: t('walkin.reason_followup') },
                { key: 'other', label: t('walkin.reason_other') },
                { key: 'notsure', label: t('walkin.reason_notsure') },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setWalkInReason(item.label);
                    setStep('walkin_dept');
                  }}
                  className={`p-6 rounded-panel border-2 text-left font-bold text-lg transition-all cursor-pointer shadow-sm hover:scale-[1.02] ${
                    walkInReason === item.label
                      ? 'border-ink bg-ink text-base'
                      : 'border-ink/15 bg-base text-ink hover:border-ink'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP: PATH B (WALK-IN) - DEPARTMENT SELECTION (Auto Doctor)         */}
        {/* ==================================================================== */}
        {step === 'walkin_dept' && (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            <div className="space-y-1">
              <div className="text-xs uppercase font-bold text-accent">■ WALK-IN 04</div>
              <h2 className="text-3xl font-bold text-ink">{t('walkin.select_dept')}</h2>
              <p className="text-sm text-ink/70">
                You will be automatically assigned to the available doctor with the shortest wait.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {departments
                .filter((d) => d.hospital_id === hospitalId && d.is_active)
                .map((dept) => {
                  const { doctor, estimatedWaitMinutes } = findShortestWaitDoctor(dept.id);
                  const isAvailable = Boolean(doctor);

                  return (
                    <button
                      key={dept.id}
                      type="button"
                      disabled={!isAvailable || isProcessing}
                      onClick={() => handleWalkInRegister(dept.id)}
                      className={`p-6 rounded-panel border-2 text-left space-y-3 transition-all shadow-sm ${
                        isAvailable
                          ? 'border-ink/15 bg-base text-ink hover:border-ink cursor-pointer hover:scale-[1.01]'
                          : 'border-ink/10 bg-base/50 text-ink/40 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="text-xl font-bold text-ink">{dept.name}</div>
                      <div className="text-xs text-ink/70">
                        {isAvailable ? (
                          <span className="font-semibold text-accent">
                            {t('walkin.est_wait', { wait: `~${estimatedWaitMinutes} min` })}
                          </span>
                        ) : (
                          <span className="text-danger">{t('walkin.no_doctor_available')}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </main>

      {/* 3. FOOTER INFO */}
      <footer className="px-8 py-4 border-t border-ink/10 flex items-center justify-between text-xs text-ink/60 bg-base">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ChroniQ Logo" className="w-5 h-5 object-contain shrink-0" />
          <span>ChroniQ Touch Kiosk Terminal • {hospital.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-success" />
          <span>Privacy Protected: Sessions auto-reset after completion</span>
        </div>
      </footer>

      {/* 4. "ARE YOU STILL THERE?" IDLE WARNING MODAL */}
      {isIdleWarningOpen && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-panel bg-base text-ink p-8 space-y-6 text-center shadow-2xl border border-ink/20">
            <div className="w-16 h-16 rounded-full bg-accent/20 text-accent mx-auto flex items-center justify-center animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-ink">{t('kiosk.idle_title')}</h3>
              <p className="text-sm text-ink/70 leading-relaxed">
                {t('kiosk.idle_desc', { sec: idleCountdown })}
              </p>
            </div>

            <button
              type="button"
              onClick={resetIdleTimer}
              className="w-full h-16 rounded-full bg-ink text-base font-bold text-lg hover:opacity-90 cursor-pointer shadow-md"
            >
              {t('kiosk.continue_session')}
            </button>
          </div>
        </div>
      )}

      {/* 5. "NEED HELP?" MODAL */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-panel bg-base text-ink p-8 space-y-6 text-center shadow-2xl border border-ink/20">
            <div className="w-16 h-16 rounded-full bg-info/10 text-info mx-auto flex items-center justify-center">
              <HelpCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-ink">{t('kiosk.help_modal_title')}</h3>
              <p className="text-sm text-ink/70 leading-relaxed">
                {t('kiosk.help_modal_desc')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setHelpModalOpen(false)}
              className="w-full h-16 rounded-full bg-ink text-base font-bold text-lg hover:opacity-90 cursor-pointer"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
