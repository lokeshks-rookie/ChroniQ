import React, { useState, useEffect } from 'react';
import type { QueueEntry, Appointment } from '@/types';
import { Button } from '@/components/ui/Button';
import { TiltCard } from '@/components/ui/tilt-card';
import { formatElapsedSeconds } from '@/lib/time';
import { Play, Check, RotateCcw, UserX, PhoneCall } from 'lucide-react';

export interface NowServingCardProps {
  currentEntry?: QueueEntry | null;
  currentAppointment?: Appointment | null;
  countdownSeconds?: number;
  waitingCount: number;
  onCallNext: () => void;
  onCallAgain: () => void;
  onStartConsultation: () => void;
  onCompleteConsultation: () => void;
  onMarkNoShow: () => void;
}

export const NowServingCard: React.FC<NowServingCardProps> = ({
  currentEntry,
  currentAppointment,
  countdownSeconds = 120,
  waitingCount,
  onCallNext,
  onCallAgain,
  onStartConsultation,
  onCompleteConsultation,
  onMarkNoShow,
}) => {
  const [elapsed, setElapsed] = useState(0);

  // Elapsed timer when in consultation
  useEffect(() => {
    if (currentEntry?.status === 'in_consultation' && currentEntry.started_at) {
      const startMs = new Date(currentEntry.started_at).getTime();
      const update = () => {
        const sec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setElapsed(sec);
      };
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsed(0);
    }
  }, [currentEntry?.status, currentEntry?.started_at]);

  const patientName = currentAppointment?.patient.name;

  // Case 1: Active Consultation
  if (currentEntry && currentEntry.status === 'in_consultation') {
    return (
      <TiltCard
        tiltLimit={10}
        scale={1.03}
        className="bg-ink text-base rounded-card p-5 border border-ink/20 flex flex-col justify-between min-h-[220px] shadow-lg"
      >
        <div>
          <div className="flex items-center justify-between text-xs text-base/70">
            <span className="uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-accent inline-block" />
              NOW IN CONSULTATION
            </span>
            <span className="font-mono text-accent font-semibold flex items-center gap-1">
              <Play className="w-3 h-3 fill-accent" />
              {formatElapsedSeconds(elapsed)}
            </span>
          </div>

          <div className="my-2">
            <div className="text-4xl lg:text-5xl font-extrabold tracking-widest font-mono text-base tabular-nums">
              {currentEntry.token}
            </div>
            <div className="text-base font-medium text-base/90 mt-1 truncate">
              {patientName || 'Patient'}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-base/15 flex items-center justify-between gap-3">
          <span className="text-xs text-base/60">Active encounter</span>
          <Button
            variant="inverted"
            size="md"
            onClick={onCompleteConsultation}
            icon={<Check className="w-4 h-4 text-ink" />}
          >
            Complete
          </Button>
        </div>
      </TiltCard>
    );
  }

  // Case 2: Called (Waiting for patient to walk in)
  if (currentEntry && currentEntry.status === 'called') {
    const isSecondCall = currentEntry.call_count >= 2;

    return (
      <TiltCard
        tiltLimit={10}
        scale={1.03}
        className="bg-ink text-base rounded-card p-5 border border-accent ring-1 ring-accent/50 flex flex-col justify-between min-h-[220px] shadow-lg"
      >
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="uppercase tracking-widest font-bold text-accent flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
              TURN CALLED ({currentEntry.call_count}x)
            </span>
            <span className="font-mono text-xs bg-accent text-ink px-2 py-0.5 rounded font-bold">
              {formatElapsedSeconds(countdownSeconds)}
            </span>
          </div>

          <div className="my-2">
            <div className="text-4xl lg:text-5xl font-extrabold tracking-widest font-mono text-base tabular-nums">
              {currentEntry.token}
            </div>
            <div className="text-base font-medium text-base/90 mt-1 truncate">
              {patientName || 'Patient'}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-base/15 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCallAgain}
              className="px-3 py-1.5 rounded-full border border-base/30 text-xs font-medium text-base hover:bg-base/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Call again</span>
            </button>

            <button
              type="button"
              onClick={onMarkNoShow}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                isSecondCall
                  ? 'bg-danger text-base border-danger'
                  : 'border-base/30 text-base hover:bg-danger/20'
              }`}
            >
              <UserX className="w-3 h-3" />
              <span>{isSecondCall ? 'Confirm no-show' : 'No-show'}</span>
            </button>
          </div>

          <Button
            variant="inverted"
            size="md"
            onClick={onStartConsultation}
            icon={<Play className="w-4 h-4 text-ink fill-ink" />}
          >
            Start
          </Button>
        </div>
      </TiltCard>
    );
  }

  // Case 3: Idle / Ready for next patient
  return (
    <TiltCard
      tiltLimit={10}
      scale={1.03}
      className="bg-ink text-base rounded-card p-5 border border-ink/20 flex flex-col justify-between min-h-[220px] shadow-lg"
    >
      <div>
        <div className="flex items-center justify-between text-xs text-base/60">
          <span className="uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-base/40 inline-block" />
            NOW SERVING
          </span>
          <span>{waitingCount} waiting</span>
        </div>

        <div className="my-4">
          <div className="text-3xl font-bold tracking-tight text-base/40 font-mono">
            IDLE
          </div>
          <p className="text-xs text-base/70 mt-1">
            {waitingCount > 0 ? 'Next patient ready to be summoned.' : 'Queue currently empty.'}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-base/15 flex items-center justify-end">
        <Button
          variant="inverted"
          size="md"
          disabled={waitingCount === 0}
          onClick={onCallNext}
          icon={<PhoneCall className="w-4 h-4 text-ink" />}
        >
          Call next
        </Button>
      </div>
    </TiltCard>
  );
};
