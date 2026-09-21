import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Bell, ShieldCheck, type LucideIcon } from 'lucide-react';

interface AuthLayoutProps {
  /** Small tracked-uppercase label above the marketing headline, e.g. "Welcome back" */
  eyebrow: string;
  /** Marketing headline on the ink panel — sentence case, benefit-first, no exclamation points */
  headline: string;
  /** One-line supporting copy under the headline */
  subhead: string;
  /** The form-side content: eyebrow, h1, form, divider, footer link, etc. */
  children: ReactNode;
}

interface Feature {
  Icon: LucideIcon;
  label: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    Icon: Clock,
    label: 'Real-time queue status',
    desc: 'See exactly where you stand, updated the moment it changes.',
  },
  {
    Icon: Bell,
    label: 'Turn alerts',
    desc: 'Get notified as your turn gets close — no refreshing, no guessing.',
  },
  {
    Icon: ShieldCheck,
    label: 'Verified access',
    desc: 'Secure accounts with Google OAuth and role-based access for every user type.',
  },
];

export default function AuthLayout({ eyebrow, headline, subhead, children }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <style>{`
        .auth-shell {
          min-height: 100vh;
          display: flex;
          background: var(--color-base);
          color: var(--color-ink);
          font-family: var(--font-sans, 'General Sans', 'Inter', sans-serif);
        }

        /* ---------- Brand panel (left, ink) ---------- */
        .auth-brand {
          width: 44%;
          min-width: 420px;
          background: var(--color-ink);
          color: var(--color-base);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 56px;
        }
        .auth-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          width: fit-content;
        }
        .auth-logo-mark {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: var(--color-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .auth-logo-word {
          font-weight: 700;
          font-size: 19px;
          color: var(--color-base);
          letter-spacing: -0.01em;
        }
        .auth-brand-body {
          margin: auto 0;
          padding: 64px 0;
          max-width: 420px;
        }
        .auth-brand-headline {
          font-size: 44px;
          font-weight: 500;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--color-base);
          margin: 0 0 16px;
        }
        .auth-brand-sub {
          font-size: 16px;
          line-height: 1.6;
          color: rgba(253, 249, 240, 0.68);
          margin: 0 0 40px;
          max-width: 380px;
        }
        .auth-feature-list { display: flex; flex-direction: column; gap: 20px; }
        .auth-feature-row { display: flex; gap: 14px; align-items: flex-start; }
        .auth-feature-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          flex-shrink: 0;
          background: rgba(154, 110, 86, 0.16);
          color: var(--color-accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-feature-label { font-size: 14px; font-weight: 600; color: var(--color-base); margin-bottom: 2px; }
        .auth-feature-desc { font-size: 13px; line-height: 1.5; color: rgba(253, 249, 240, 0.56); margin: 0; }

        /* ---------- Eyebrow (used on both panels) ---------- */
        .auth-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-accent);
          margin: 0 0 20px;
        }
        .auth-eyebrow-marker { width: 6px; height: 6px; background: var(--color-accent); flex-shrink: 0; }
        .auth-eyebrow-light { color: var(--color-text-muted, var(--color-muted, #694436)); }

        /* ---------- Form panel (right, base) ---------- */
        .auth-panel { flex: 1; display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
        .auth-panel-inner { width: 100%; max-width: 420px; }

        .auth-form-head { margin-bottom: 32px; }
        .auth-form-title { font-size: 40px; font-weight: 500; letter-spacing: -0.01em; color: var(--color-ink); margin: 0 0 10px; }
        .auth-form-sub { font-size: 15px; line-height: 1.5; color: var(--color-text-muted, var(--color-muted, #694436)); margin: 0; }

        .auth-form { display: flex; flex-direction: column; gap: 20px; }
        .auth-field-label { display: block; font-size: 13px; font-weight: 600; color: var(--color-ink); margin-bottom: 8px; }
        .auth-field-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .auth-field-wrap { position: relative; }

        .auth-input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1.5px solid rgba(25, 8, 1, 0.14);
          background: var(--color-base);
          color: var(--color-ink);
          font-family: inherit;
          font-size: 15px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
        }
        .auth-input::placeholder { color: rgba(105, 68, 54, 0.5); }
        .auth-input:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(154, 110, 86, 0.16); }
        .auth-input.is-error { border-color: var(--color-danger, #C0392B); }
        .auth-input.is-error:focus { box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.14); }

        .auth-input-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: var(--color-text-muted, var(--color-muted, #694436));
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }
        .auth-input-toggle:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

        .auth-link { font-size: 13px; font-weight: 600; color: var(--color-accent); text-decoration: none; }
        .auth-link:hover { text-decoration: underline; }

        .auth-msg { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; line-height: 1.4; }
        .auth-msg svg { flex-shrink: 0; margin-top: 1px; }
        .auth-msg--error { background: rgba(192, 57, 43, 0.06); border: 1px solid rgba(192, 57, 43, 0.22); color: var(--color-danger, #C0392B); }
        .auth-msg--success { background: rgba(46, 125, 70, 0.06); border: 1px solid rgba(46, 125, 70, 0.2); color: var(--color-success, #2E7D46); }
        .auth-error-msg { display: flex; align-items: center; gap: 4px; color: var(--color-danger, #C0392B); font-size: 12px; font-weight: 500; margin-top: 6px; }

        .auth-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 6px 6px 6px 26px;
          border: none;
          border-radius: 999px;
          background: var(--color-ink);
          color: var(--color-base);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 4px;
        }
        .auth-cta:disabled { opacity: 0.55; cursor: not-allowed; }
        .auth-cta:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }
        .auth-cta-badge {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--color-accent);
          color: var(--color-ink);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }
        .auth-cta:hover:not(:disabled) .auth-cta-badge { transform: rotate(45deg); }

        .auth-divider { display: flex; align-items: center; gap: 16px; margin: 28px 0; }
        .auth-divider-line { flex: 1; height: 1px; background: rgba(25, 8, 1, 0.1); }
        .auth-divider-label { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; color: var(--color-text-muted, var(--color-muted, #694436)); text-transform: uppercase; }

        .auth-switch { text-align: center; margin-top: 32px; font-size: 14px; color: var(--color-text-muted, var(--color-muted, #694436)); }
        .auth-switch a { color: var(--color-ink); font-weight: 600; text-decoration: none; }
        .auth-switch a:hover { text-decoration: underline; }

        .auth-consent { display: flex; align-items: flex-start; gap: 12px; margin-top: 4px; }
        .auth-consent input { margin-top: 2px; width: 16px; height: 16px; accent-color: var(--color-accent); cursor: pointer; flex-shrink: 0; }
        .auth-consent label { font-size: 13px; color: var(--color-ink); line-height: 1.5; cursor: pointer; }

        @media (max-width: 960px) {
          .auth-shell { flex-direction: column; }
          .auth-brand { width: 100%; min-width: 0; padding: 40px 24px; }
          .auth-brand-body { margin: 32px 0; padding: 0; }
          .auth-brand-headline { font-size: 30px; }
          .auth-form-title { font-size: 28px; }
          .auth-panel { padding: 40px 24px 64px; }
        }
        @media (max-width: 640px) {
          .auth-feature-list { display: none; }
          .auth-brand-sub { margin-bottom: 0; }
          .auth-brand { padding: 32px 20px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-cta-badge, .auth-input { transition: none; }
        }
      `}</style>

      <aside className="auth-brand">
        <Link to="/" className="auth-logo">
          <span className="auth-logo-mark">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="6.5" y="2" width="3" height="12" rx="1.5" fill="var(--color-ink)" />
              <rect x="2" y="6.5" width="12" height="3" rx="1.5" fill="var(--color-ink)" />
            </svg>
          </span>
          <span className="auth-logo-word">ChroniQ</span>
        </Link>

        <div className="auth-brand-body">
          <span className="auth-eyebrow">
            <span className="auth-eyebrow-marker" aria-hidden="true" />
            {eyebrow}
          </span>
          <p className="auth-brand-headline">{headline}</p>
          <p className="auth-brand-sub">{subhead}</p>

          <div className="auth-feature-list">
            {FEATURES.map((f) => (
              <div className="auth-feature-row" key={f.label}>
                <span className="auth-feature-icon">
                  <f.Icon size={16} strokeWidth={2} aria-hidden="true" />
                </span>
                <div>
                  <p className="auth-feature-label">{f.label}</p>
                  <p className="auth-feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-panel-inner">{children}</div>
      </main>
    </div>
  );
}
