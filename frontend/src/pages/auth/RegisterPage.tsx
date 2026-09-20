import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { mockRegister } from '@/store/authStore';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10) newErrors.phone = 'Enter a valid 10-digit phone number';
    
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
      await mockRegister({ name, phone, email, password });
      
      // Navigate to OTP verification, passing required state structure
      navigate('/verify-otp', { 
        state: { 
          identifier: phone, 
          channel: 'phone', 
          purpose: 'verify-account', 
          redirect: null 
        },
        replace: true 
      });
      
    } catch (err: any) {
      setApiError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Only enable the button if all basic checks look somewhat complete to avoid premature clicking
  const isSubmitEnabled = 
    name.trim().length > 0 && 
    phone.trim().length >= 10 && 
    password.length >= 8 && 
    password === confirmPassword && 
    consent && 
    !isLoading;

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
        .auth-input.error {
          border-color: #DC2626;
        }
        .auth-input:focus {
          outline: none;
          border-color: var(--color-accent);
        }
        .auth-input.error:focus {
          border-color: #DC2626;
        }
        .auth-input::placeholder {
          color: var(--color-muted);
        }
        .auth-card {
          width: 100%;
          max-width: 480px;
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
        .input-error-msg {
          color: #DC2626;
          font-size: 12px;
          font-weight: 500;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
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
            Create your account
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', textAlign: 'center', marginBottom: '32px' }}>
            Join ChroniQ to book and manage appointments.
          </p>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Full Name */}
            <div>
              <label htmlFor="name" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Full name <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <input
                id="name"
                type="text"
                className={`auth-input ${errors.name ? 'error' : ''}`}
                placeholder="John Doe"
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({...errors, name: ''}); }}
              />
              {errors.name && <div className="input-error-msg"><AlertCircle size={12} /> {errors.name}</div>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Phone number <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <input
                id="phone"
                type="tel"
                className={`auth-input ${errors.phone ? 'error' : ''}`}
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors({...errors, phone: ''}); }}
              />
              {errors.phone && <div className="input-error-msg"><AlertCircle size={12} /> {errors.phone}</div>}
            </div>

            {/* Email (Optional) */}
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Email <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                id="email"
                type="email"
                className={`auth-input ${errors.email ? 'error' : ''}`}
                placeholder="john@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({...errors, email: ''}); }}
              />
              {errors.email && <div className="input-error-msg"><AlertCircle size={12} /> {errors.email}</div>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Password <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input ${errors.password ? 'error' : ''}`}
                  placeholder="At least 8 characters"
                  style={{ paddingRight: '48px' }}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({...errors, password: ''}); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <div className="input-error-msg"><AlertCircle size={12} /> {errors.password}</div>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Confirm password <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                className={`auth-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors({...errors, confirmPassword: ''}); }}
              />
              {errors.confirmPassword && <div className="input-error-msg"><AlertCircle size={12} /> {errors.confirmPassword}</div>}
            </div>

            {/* Consent Checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ 
                  marginTop: '2px', width: '16px', height: '16px', 
                  accentColor: 'var(--color-accent)', cursor: 'pointer' 
                }}
              />
              <label htmlFor="consent" style={{ fontSize: '13px', color: 'var(--color-ink)', lineHeight: 1.5, cursor: 'pointer' }}>
                I agree to the <Link to="/#terms" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link> and <Link to="/#privacy" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>.
              </label>
            </div>

            {/* API Error State */}
            {apiError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
                borderRadius: '8px', backgroundColor: 'rgba(220,38,38,0.05)',
                border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626'
              }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{apiError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isSubmitEnabled}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
                border: 'none', fontSize: '15px', fontWeight: 700, 
                cursor: !isSubmitEnabled ? 'not-allowed' : 'pointer',
                opacity: !isSubmitEnabled ? 0.5 : 1, 
                transition: 'background-color 0.2s, opacity 0.2s',
                marginTop: '12px'
              }}
            >
              {isLoading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          {/* Login Link */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-muted)' }}>Already have an account? </span>
            <Link to="/login" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', textDecoration: 'none' }}>
              Log in
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
