import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuthStore, mockVerifyOtp } from '@/store/authStore';

interface RouteState {
  identifier?: string;
  channel?: 'phone' | 'email';
  purpose?: string;
  redirect?: string | null;
}

function maskIdentifier(identifier: string, channel: 'phone' | 'email') {
  if (!identifier) return '';
  if (channel === 'email') {
    const parts = identifier.split('@');
    if (parts.length !== 2) return identifier;
    const name = parts[0];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : '***';
    return `${maskedName}@${parts[1]}`;
  } else {
    // Phone masking
    const digits = identifier.replace(/\D/g, '');
    if (digits.length < 4) return identifier;
    return `+91 XXXXX ${digits.slice(-4)}`;
  }
}

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  
  // Safe extraction of state
  const state = (location.state as RouteState) || {};
  const identifier = state.identifier || '';
  const channel = state.channel || 'phone';
  const purpose = state.purpose || 'verify-account';
  const redirect = state.redirect || null;

  // ── Redirect if directly accessed ──
  useEffect(() => {
    if (!identifier) {
      navigate('/register', { replace: true });
    }
  }, [identifier, navigate]);

  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Timer ──
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const handleResend = () => {
    if (timeLeft > 0) return;
    setTimeLeft(30);
    setError(null);
    // (In a real app, call mockResendOtp(identifier))
  };

  // ── OTP Input Logic ──
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (index < 5 && value) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    const newCode = [...code];
    pasted.split('').forEach((char, i) => {
      newCode[i] = char;
    });
    setCode(newCode);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // ── Verification ──
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    setIsLoading(true);
    setError(null);
    try {
      const { user, token } = await mockVerifyOtp(identifier, fullCode);

      if (purpose === 'reset-password') {
        navigate('/reset-password', { replace: true, state: { token, identifier } });
        return;
      }

      // purpose === 'verify-account'
      setAuth(user, token);

      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        navigate(redirect, { replace: true });
        return;
      }

      switch (user.role) {
        case 'patient': navigate('/app', { replace: true }); break;
        case 'receptionist':
        case 'hospital_admin': navigate('/admin', { replace: true }); break;
        case 'doctor': navigate('/doctor', { replace: true }); break;
        case 'super_admin': navigate('/super', { replace: true }); break;
        default: navigate('/app', { replace: true }); break;
      }

    } catch (err: any) {
      setError(err.message || 'Verification failed');
      // Clear code on error to force re-entry
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const isComplete = code.join('').length === 6;

  // Don't render the form if redirecting
  if (!identifier) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-base)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .otp-input {
          width: 48px;
          height: 56px;
          border-radius: 12px;
          border: 1.5px solid rgba(154,110,86,0.2);
          background-color: var(--color-base);
          color: var(--color-ink);
          font-family: var(--font-sans);
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        @media (max-width: 400px) {
          .otp-input {
            width: 42px;
            height: 50px;
            font-size: 20px;
          }
        }
        .otp-input:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(154,110,86,0.1);
        }
        .auth-card {
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          background: var(--color-base);
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 12px 40px rgba(25,8,1,0.06);
          border: 1px solid rgba(154,110,86,0.1);
        }
        @media (max-width: 640px) {
          .auth-card {
            padding: 32px 24px;
            box-shadow: none;
            border: none;
            background: transparent;
          }
        }
      `}</style>

      {/* ── Minimal Top Bar ── */}
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: 'var(--color-ink)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="6.5" y="2" width="3" height="12" rx="1.5" fill="#FDF9F0" />
              <rect x="2" y="6.5" width="12" height="3" rx="1.5" fill="#FDF9F0" />
            </svg>
          </span>
          <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            ChroniQ
          </span>
        </Link>
      </header>

      {/* ── Centered Auth Card ── */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', paddingBottom: '80px' }}>
        <div className="auth-card">
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '8px', textAlign: 'center' }}>
            Verify your account
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', textAlign: 'center', marginBottom: '32px', lineHeight: 1.5 }}>
            Code sent to <strong style={{ color: 'var(--color-ink)' }}>{maskIdentifier(identifier, channel)}</strong>.<br />
            <span style={{ fontSize: '13px' }}>(Hint: use "123456" to pass)</span>
          </p>

          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* OTP Input Boxes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  className="otp-input"
                  value={digit}
                  onChange={(e) => handleChange(e, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  onPaste={handlePaste}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {/* Error State */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
                borderRadius: '8px', backgroundColor: 'rgba(220,38,38,0.05)',
                border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626'
              }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isComplete || isLoading}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
                border: 'none', fontSize: '15px', fontWeight: 700, 
                cursor: (!isComplete || isLoading) ? 'not-allowed' : 'pointer',
                opacity: (!isComplete || isLoading) ? 0.5 : 1, 
                transition: 'background-color 0.2s, opacity 0.2s',
              }}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          {/* Resend & Change Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
            
            {timeLeft > 0 ? (
              <span style={{ fontSize: '14px', color: 'var(--color-muted)', fontWeight: 500 }}>
                Resend code in {timeLeft}s
              </span>
            ) : (
              <button
                onClick={handleResend}
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600, color: 'var(--color-accent)'
                }}
              >
                Resend code
              </button>
            )}

            <Link to="/register" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)', textDecoration: 'none' }}>
              Change {channel === 'email' ? 'email' : 'number'}?
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
