import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { register, useAuthStore } from '@/store/authStore';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import AuthLayout from '@/components/auth/AuthLayout';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && consent;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const result = await register({ name, email, password });
      // Email-only accounts are marked verified immediately — token is returned directly
      if (result.token && result.user) {
        setAuth(result.user, result.token);
        navigate('/app', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      setApiError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitEnabled =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    password === confirmPassword &&
    consent &&
    !isLoading;

  return (
    <AuthLayout
      eyebrow="Join ChroniQ"
      headline="One account. Every visit, tracked."
      subhead="Set up your profile once — booking, queueing, and reminders are covered from here."
    >
      <span className="auth-eyebrow auth-eyebrow-light">
        <span className="auth-eyebrow-marker" aria-hidden="true" />
        Get started
      </span>

      <div className="auth-form-head">
        <h1 className="auth-form-title">Create your account</h1>
        <p className="auth-form-sub">Join ChroniQ to book and manage your appointments.</p>
      </div>

      {/* Info: Registration is for patients only */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '10px',
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: 1.5,
        background: 'rgba(154, 110, 86, 0.06)',
        border: '1px solid rgba(154, 110, 86, 0.15)',
        color: 'var(--color-text-muted, var(--color-muted, #694436))',
        marginBottom: '8px',
      }}>
        <span>Patient registration only — Staff, doctor, and admin accounts are created by your hospital administrator.</span>
      </div>

      {/* Google OAuth — primary CTA */}
      <GoogleAuthButton mode="register" />

      <div className="auth-divider">
        <span className="auth-divider-line" />
        <span className="auth-divider-label">Or</span>
        <span className="auth-divider-line" />
      </div>

      <form onSubmit={handleRegister} className="auth-form" noValidate>
        {/* Full Name */}
        <div>
          <label htmlFor="reg-name" className="auth-field-label">
            Full name <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <input
            id="reg-name"
            type="text"
            className={`auth-input${errors.name ? ' is-error' : ''}`}
            placeholder="John Doe"
            value={name}
            onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({ ...errors, name: '' }); }}
            autoComplete="name"
          />
          {errors.name && <div className="auth-error-msg"><AlertCircle size={12} aria-hidden="true" /> {errors.name}</div>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="auth-field-label">
            Email address <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <input
            id="reg-email"
            type="email"
            className={`auth-input${errors.email ? ' is-error' : ''}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: '' }); }}
            autoComplete="email"
          />
          {errors.email && <div className="auth-error-msg"><AlertCircle size={12} aria-hidden="true" /> {errors.email}</div>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className="auth-field-label">
            Password <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <div className="auth-field-wrap">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              className={`auth-input${errors.password ? ' is-error' : ''}`}
              style={{ paddingRight: 48 }}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: '' }); }}
              autoComplete="new-password"
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
          {errors.password && <div className="auth-error-msg"><AlertCircle size={12} aria-hidden="true" /> {errors.password}</div>}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="reg-confirm-password" className="auth-field-label">
            Confirm password <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <input
            id="reg-confirm-password"
            type={showPassword ? 'text' : 'password'}
            className={`auth-input${errors.confirmPassword ? ' is-error' : ''}`}
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' }); }}
            autoComplete="new-password"
          />
          {errors.confirmPassword && <div className="auth-error-msg"><AlertCircle size={12} aria-hidden="true" /> {errors.confirmPassword}</div>}
        </div>

        {/* Consent */}
        <div className="auth-consent">
          <input
            type="checkbox"
            id="reg-consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <label htmlFor="reg-consent">
            I agree to the <Link to="/#terms" className="auth-link" style={{ fontSize: 13 }}>Terms of Service</Link> and{' '}
            <Link to="/#privacy" className="auth-link" style={{ fontSize: 13 }}>Privacy Policy</Link>.
          </label>
        </div>

        {apiError && (
          <div className="auth-msg auth-msg--error">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        <button id="register-submit-btn" type="submit" className="auth-cta" disabled={!isSubmitEnabled}>
          <span>{isLoading ? 'Creating account…' : 'Create account'}</span>
          <span className="auth-cta-badge">
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </button>
      </form>

      <div className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </AuthLayout>
  );
}
