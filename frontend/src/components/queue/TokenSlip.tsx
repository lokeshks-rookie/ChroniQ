import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatTimeIST, formatDateIST } from '@/lib/time';

export interface TokenSlipProps {
  hospitalName: string;
  token: string;
  patientName: string;
  doctorName: string;
  departmentName: string;
  room?: string;
  position?: number;
  etaMinutes?: number;
  bookingCode?: string;
  appointmentTime?: string;
  onClose?: () => void;
}

export const TokenSlip: React.FC<TokenSlipProps> = ({
  hospitalName,
  token,
  patientName,
  doctorName,
  departmentName,
  room = 'Room 101',
  position,
  etaMinutes,
  bookingCode = 'APT-LIVE',
  appointmentTime,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center">
      {/* On-screen slip preview */}
      <div
        id="thermal-print-area"
        className="w-full max-w-[320px] bg-base border border-ink/15 rounded-card p-6 text-ink font-mono text-center shadow-md space-y-4"
      >
        {/* Header */}
        <div className="border-b border-dashed border-ink/30 pb-3">
          <div className="text-sm font-bold tracking-wider uppercase">{hospitalName}</div>
          <div className="text-[11px] text-ink/70">Outpatient Department Queue Token</div>
          <div className="text-[11px] text-ink/60 mt-0.5">
            {formatDateIST(new Date())} • {formatTimeIST(new Date())}
          </div>
        </div>

        {/* Token Big Numeral */}
        <div className="py-2">
          <div className="text-xs uppercase tracking-widest text-ink/70">Your Token</div>
          <div className="text-4xl font-extrabold tracking-widest my-1">{token}</div>
          <div className="text-xs font-semibold">{departmentName}</div>
        </div>

        {/* Details Table */}
        <div className="text-left text-xs space-y-1.5 border-t border-b border-dashed border-ink/30 py-3">
          <div className="flex justify-between">
            <span className="text-ink/70">Patient:</span>
            <span className="font-semibold text-right">{patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink/70">Doctor:</span>
            <span className="font-semibold text-right">{doctorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink/70">Location:</span>
            <span className="font-semibold text-right">{room}</span>
          </div>
          {position !== undefined && (
            <div className="flex justify-between">
              <span className="text-ink/70">Queue position:</span>
              <span className="font-bold text-right">#{position} in line</span>
            </div>
          )}
          {etaMinutes !== undefined && (
            <div className="flex justify-between">
              <span className="text-ink/70">Est. wait time:</span>
              <span className="font-bold text-right">~{etaMinutes} mins</span>
            </div>
          )}
          {appointmentTime && (
            <div className="flex justify-between">
              <span className="text-ink/70">Slot time:</span>
              <span className="font-semibold text-right">{formatTimeIST(appointmentTime)}</span>
            </div>
          )}
        </div>

        {/* QR Code for fast scanner check-in */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="p-2 bg-base border border-ink/10 rounded-lg inline-block">
            <QRCodeSVG value={bookingCode} size={100} fgColor="currentColor" />
          </div>
          <div className="text-[10px] text-ink/60 mt-1 font-mono">{bookingCode}</div>
        </div>

        {/* Footer instructions */}
        <div className="text-[10px] text-ink/60 border-t border-dashed border-ink/30 pt-2 leading-relaxed">
          Please wait in the {departmentName} waiting area until your token is called on the display board.
        </div>
      </div>

      {/* Action Buttons (hidden in print) */}
      <div className="flex items-center gap-3 mt-5 no-print">
        <Button variant="primary" size="md" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
          Print slip
        </Button>
        {onClose && (
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
};
