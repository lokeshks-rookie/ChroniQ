import { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuthStore, login } from '@/store/authStore';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import AuthLayout from '@/components/auth/AuthLayout';

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
        <p className="auth-form-sub">Enter your details to access your queue and appointments.</p>
      </div>

      {passwordResetSuccess && (
        <div className="auth-msg auth-msg--success" style={{ marginBottom: 24 }}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Password reset successfully. Log in with your new password.</span>
        </div>
      )}

      {/* Google OAuth — primary CTA */}
      <GoogleAuthButton mode="login" />

      <div className="auth-divider">
        <span className="auth-divider-line" />
        <span className="auth-divider-label">Or</span>
        <span className="auth-divider-line" />
      </div>

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
