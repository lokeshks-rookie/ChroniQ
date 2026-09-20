import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { mockResetPassword } from '@/store/authStore';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { token?: string; identifier?: string }) || {};
  const identifier = state.identifier || state.token || '';

  // Redirect if no state from OTP step
  if (!identifier) {
    navigate('/forgot-password', { replace: true });
    return null;
  }

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await mockResetPassword(identifier, password);
      navigate('/login', {
        replace: true,
        state: { passwordResetSuccess: true },
      });
    } catch (err: any) {
      setError(err.message || 'Reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitEnabled = password.length >= 8 && password === confirmPassword && !isLoading;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-base)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .auth-input {
          width: 100%; padding: 14px 16px; border-radius: 12px;
          border: 1.5px solid rgba(154,110,86,0.2); background-color: var(--color-base);
          color: var(--color-ink); font-family: var(--font-sans); font-size: 15px;
          transition: border-color 0.2s;
        }
        .auth-input:focus { outline: none; border-color: var(--color-accent); }
        .auth-input::placeholder { color: var(--color-muted); }
        .auth-card {
          width: 100%; max-width: 440px; margin: 0 auto; background: var(--color-base);
          padding: 40px; border-radius: 24px; box-shadow: 0 12px 40px rgba(25,8,1,0.06);
          border: 1px solid rgba(154,110,86,0.1);
        }
        @media (max-width: 640px) {
          .auth-card { padding: 32px 24px; box-shadow: none; border: none; background: transparent; }
        }
      `}</style>

      {/* ── Minimal Top Bar ── */}
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="6.5" y="2" width="3" height="12" rx="1.5" fill="#FDF9F0" />
              <rect x="2" y="6.5" width="12" height="3" rx="1.5" fill="#FDF9F0" />
            </svg>
          </span>
          <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>ChroniQ</span>
        </Link>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', paddingBottom: '80px' }}>
        <div className="auth-card">
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '8px', textAlign: 'center' }}>
            Set a new password
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', textAlign: 'center', marginBottom: '32px', lineHeight: 1.5 }}>
            Choose a strong password for your account.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* New Password */}
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                New password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password" type={showPassword ? 'text' : 'password'} className="auth-input"
                  placeholder="At least 8 characters" style={{ paddingRight: '48px' }}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', padding: '4px' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Confirm new password
              </label>
              <input
                id="confirmPassword" type={showPassword ? 'text' : 'password'} className="auth-input"
                placeholder="Re-enter password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && password === confirmPassword && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'var(--color-success)', fontSize: '12px', fontWeight: 500 }}>
                  <CheckCircle2 size={12} /> Passwords match
                </div>
              )}
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{error}</span>
              </div>
            )}

            <button
              type="submit" disabled={!isSubmitEnabled}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
                border: 'none', fontSize: '15px', fontWeight: 700,
                cursor: !isSubmitEnabled ? 'not-allowed' : 'pointer',
                opacity: !isSubmitEnabled ? 0.5 : 1, transition: 'opacity 0.2s', marginTop: '8px',
              }}
            >
              {isLoading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
