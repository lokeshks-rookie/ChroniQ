import { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore, mockLogin } from '@/store/authStore';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const passwordResetSuccess = (location.state as any)?.passwordResetSuccess === true;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Please enter your email or phone and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { user, token } = await mockLogin(identifier, password);
      setAuth(user, token);

      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        navigate(redirect, { replace: true });
        return;
      }

      if (!user.is_verified) {
        navigate('/verify-otp', { 
          replace: true, 
          state: { 
            identifier: user.phone || identifier, 
            channel: 'phone', 
            purpose: 'verify-account', 
            redirect: redirect 
          } 
        });
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
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-base)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .auth-input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1.5px solid rgba(154,110,86,0.2);
          background-color: var(--color-base);
          color: var(--color-ink);
          font-family: var(--font-sans);
          font-size: 15px;
          transition: border-color 0.2s;
        }
        .auth-input:focus {
          outline: none;
          border-color: var(--color-accent);
        }
        .auth-input::placeholder {
          color: var(--color-muted);
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
            Log in to ChroniQ
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', textAlign: 'center', marginBottom: '32px' }}>
            Welcome back. Please enter your details.
          </p>

          {passwordResetSuccess && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
              borderRadius: '8px', backgroundColor: 'rgba(46,125,70,0.06)',
              border: '1px solid rgba(46,125,70,0.2)', color: 'var(--color-success)',
              marginBottom: '24px',
            }}>
              <CheckCircle2 size={16} />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Password reset successfully. Log in with your new password.</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Email / Phone Field */}
            <div>
              <label htmlFor="identifier" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Email or phone
              </label>
              <input
                id="identifier"
                type="text"
                className="auth-input"
                placeholder="Enter your email or phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="password" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Enter your password"
                  style={{ paddingRight: '48px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
              disabled={isLoading}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
                border: 'none', fontSize: '15px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1, transition: 'background-color 0.2s',
                marginTop: '8px'
              }}
            >
              {isLoading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '28px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(154,110,86,0.15)' }} />
            <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(154,110,86,0.15)' }} />
          </div>

          {/* Google Button */}
          <button
            disabled
            title="Coming soon"
            style={{
              width: '100%', padding: '14px', borderRadius: '12px',
              backgroundColor: 'transparent', color: 'var(--color-muted)',
              border: '1.5px solid rgba(154,110,86,0.15)', fontSize: '15px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              cursor: 'not-allowed', opacity: 0.7
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.79 15.72 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.72 17.57C14.73 18.23 13.48 18.63 12 18.63C9.14 18.63 6.71 16.7 5.84 14.12H2.18V16.96C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
              <path d="M5.84 14.12C5.62 13.47 5.49 12.75 5.49 12C5.49 11.25 5.62 10.53 5.84 9.88V7.04H2.18C1.43 8.54 1 10.21 1 12C1 13.79 1.43 15.46 2.18 16.96L5.84 14.12Z" fill="#FBBC05"/>
              <path d="M12 5.38C13.62 5.38 15.06 5.93 16.2 7.02L19.36 3.86C17.45 2.08 14.97 1 12 1C7.7 1 3.99 3.47 2.18 7.04L5.84 9.88C6.71 7.3 9.14 5.38 12 5.38Z" fill="#EA4335"/>
            </svg>
            Continue with Google <span style={{ fontSize: '11px', backgroundColor: 'rgba(154,110,86,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Coming soon</span>
          </button>

          {/* Register Link */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-muted)' }}>Don't have an account? </span>
            <Link to="/register" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', textDecoration: 'none' }}>
              Register
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
