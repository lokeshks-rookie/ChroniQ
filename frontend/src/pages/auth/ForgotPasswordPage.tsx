import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { mockRequestPasswordReset } from '@/store/authStore';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError('Please enter your phone number or email.');
      return;
    }

    setIsLoading(true);
    try {
      await mockRequestPasswordReset(identifier);
      const channel = identifier.includes('@') ? 'email' : 'phone';
      navigate('/verify-otp', {
        state: { identifier, channel, purpose: 'reset-password' },
        replace: true,
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

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
            Reset your password
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', textAlign: 'center', marginBottom: '32px', lineHeight: 1.5 }}>
            Enter your phone number or email and we'll send you a verification code.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label htmlFor="identifier" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Phone or email
              </label>
              <input
                id="identifier" type="text" className="auth-input"
                placeholder="Enter your phone or email"
                value={identifier} onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{error}</span>
              </div>
            )}

            <button
              type="submit" disabled={isLoading}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
                border: 'none', fontSize: '15px', fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.2s', marginTop: '8px',
              }}
            >
              {isLoading ? 'Sending...' : 'Send reset code'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link to="/login" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', textDecoration: 'none' }}>
              ← Back to login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
