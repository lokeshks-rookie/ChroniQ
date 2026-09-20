import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'phone' | 'email';
  target: string; // the new phone or email
  onVerify: (code: string) => Promise<{ success: boolean; message?: string }>;
}

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 3;

/**
 * Mock OTP verification modal. 6 boxes, auto-advance, paste support,
 * resend timer, and 3 attempts max.
 */
export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  onClose,
  type,
  target,
  onVerify,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setDigits(Array(CODE_LENGTH).fill(''));
      setError('');
      setAttempts(0);
      setIsVerifying(false);
      setResendTimer(RESEND_SECONDS);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  // Resend countdown
  useEffect(() => {
    if (!isOpen || resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError('');

    // Auto-advance
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const newDigits = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < CODE_LENGTH) {
      setError('Enter all 6 digits.');
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      setError('Too many attempts. Please close and try again.');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await onVerify(code);
      if (result.success) {
        onClose();
      } else {
        setAttempts((a) => a + 1);
        setError(result.message || 'Invalid code. Please try again.');
        setDigits(Array(CODE_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    setResendTimer(RESEND_SECONDS);
    setDigits(Array(CODE_LENGTH).fill(''));
    setError('');
    setAttempts(0);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const maskedTarget = type === 'phone'
    ? target.replace(/(\+91\s?\d{2})\d+(\d{2})/, '$1****$2')
    : target.replace(/(.{2}).+(@.+)/, '$1****$2');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify your new value"
      eyebrow={type === 'phone' ? 'PHONE VERIFICATION' : 'EMAIL VERIFICATION'}
      maxWidth="sm"
      footer={
        <div className="flex items-center gap-3 w-full">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleVerify}
            isLoading={isVerifying}
            disabled={digits.some((d) => !d)}
            className="flex-1"
          >
            Verify
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted">
        We sent a 6-digit code to <span className="font-medium text-ink">{maskedTarget}</span>.
        Enter it below. For the demo, use <span className="font-medium text-ink">123456</span>.
      </p>

      {/* OTP boxes */}
      <div className="flex items-center justify-center gap-2 py-4" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
            className="w-12 h-14 text-center text-xl font-medium bg-base border border-ink/20 rounded-card
                       focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-danger text-center" role="alert">{error}</p>
      )}

      <div className="text-center">
        {resendTimer > 0 ? (
          <p className="text-xs text-muted">
            Resend code in {resendTimer}s
          </p>
        ) : (
          <button
            onClick={handleResend}
            className="text-xs text-accent font-medium hover:underline cursor-pointer"
          >
            Resend code
          </button>
        )}
        {attempts > 0 && (
          <p className="text-xs text-muted mt-1">
            {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining
          </p>
        )}
      </div>
    </Modal>
  );
};
