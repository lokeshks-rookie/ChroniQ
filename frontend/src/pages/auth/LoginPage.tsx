import { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, User, ShieldCheck, UserCheck, Stethoscope } from 'lucide-react';
import { useAuthStore, login } from '@/store/authStore';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import AuthLayout from '@/components/auth/AuthLayout';

type LoginRole = 'patient' | 'admin' | 'receptionist' | 'doctor';

const ROLE_TABS: { key: LoginRole; label: string; icon: React.ElementType; hint: string }[] = [
  { key: 'patient', label: 'Patient', icon: User, hint: 'Book appointments and track your queue.' },
  { key: 'admin', label: 'Admin', icon: ShieldCheck, hint: 'Manage hospital operations and staff.' },
  { key: 'receptionist', label: 'Reception', icon: UserCheck, hint: 'Handle check-ins and walk-ins.' },
  { key: 'doctor', label: 'Doctor', icon: Stethoscope, hint: 'View your queue and manage consultations.' },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<LoginRole>('patient');
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

  const activeTab = ROLE_TABS.find((t) => t.key === selectedRole)!;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Please enter your email or phone and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { user, token } = await login(identifier, password);
      setAuth(user, token);

      const redirect = searchParams.get('redirect');
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
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      headline="Care for chronic conditions, without the chronic wait."
      subhead="ChroniQ keeps your appointments, queue position, and reminders in one place."
    >
      <span className="auth-eyebrow auth-eyebrow-light">
        <span className="auth-eyebrow-marker" aria-hidden="true" />
        Log in
      </span>

      <div className="auth-form-head">
        <h1 className="auth-form-title">Welcome back</h1>
        <p className="auth-form-sub">Select your role and sign in to continue.</p>
      </div>

      {/* ── Role Selector Tabs ── */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '8px',
        padding: '4px',
        borderRadius: '14px',
        background: 'rgba(25, 8, 1, 0.04)',
        border: '1px solid rgba(25, 8, 1, 0.08)',
      }}>
        {ROLE_TABS.map((tab) => {
          const isActive = selectedRole === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setSelectedRole(tab.key); setError(null); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 8px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                background: isActive ? 'var(--color-ink)' : 'transparent',
                color: isActive ? 'var(--color-base)' : 'var(--color-ink)',
                opacity: isActive ? 1 : 0.6,
                transition: 'all 0.2s ease',
              }}
            >
              <tab.icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
              <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Role hint */}
      <p style={{
        fontSize: '12px',
        color: 'var(--color-text-muted, var(--color-muted, #694436))',
        margin: '0 0 20px',
        lineHeight: 1.4,
        textAlign: 'center',
      }}>
        {activeTab.hint}
      </p>

      {passwordResetSuccess && (
        <div className="auth-msg auth-msg--success" style={{ marginBottom: 24 }}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Password reset successfully. Log in with your new password.</span>
        </div>
      )}

      {/* Google OAuth — only for patient role */}
      {selectedRole === 'patient' && (
        <>
          <GoogleAuthButton mode="login" />
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-label">Or</span>
            <span className="auth-divider-line" />
          </div>
        </>
      )}

      {/* Info for non-patient roles */}
      {selectedRole !== 'patient' && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '12px 14px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 500,
          lineHeight: 1.4,
          background: 'rgba(154, 110, 86, 0.06)',
          border: '1px solid rgba(154, 110, 86, 0.15)',
          color: 'var(--color-ink)',
          marginBottom: '20px',
        }}>
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--color-accent)' }} />
          <span>Staff and admin accounts are provisioned by your hospital administrator. Use the credentials provided to you.</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="auth-form" noValidate>
        <div>
          <label htmlFor="login-identifier" className="auth-field-label">Email or phone</label>
          <input
            id="login-identifier"
            type="text"
            className="auth-input"
            placeholder="Enter your email or phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div>
          <div className="auth-field-row">
            <label htmlFor="login-password" className="auth-field-label" style={{ marginBottom: 0 }}>Password</label>
          </div>
          <div className="auth-field-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              style={{ paddingRight: 48 }}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-input-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="auth-msg auth-msg--error">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <button id="login-submit-btn" type="submit" className="auth-cta" disabled={isLoading}>
          <span>{isLoading ? 'Logging in…' : 'Log in'}</span>
          <span className="auth-cta-badge">
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </button>
      </form>

      <div className="auth-switch">
        Don&apos;t have an account? <Link to="/register">Register</Link>
      </div>
    </AuthLayout>
  );
}
