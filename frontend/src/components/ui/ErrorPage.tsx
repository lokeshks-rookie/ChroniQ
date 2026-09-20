import { Link } from 'react-router-dom';
import { SearchX, Lock, AlertTriangle } from 'lucide-react';

interface ErrorPageProps {
  code?: 404 | 403 | 500;
  title?: string;
  message?: string;
}

const DEFAULTS: Record<number, { title: string; message: string; Icon: typeof SearchX }> = {
  404: {
    title: 'Page not found',
    message: "The page you're looking for doesn't exist or has been moved.",
    Icon: SearchX,
  },
  403: {
    title: 'Access denied',
    message: "You don't have permission to view this page.",
    Icon: Lock,
  },
  500: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    Icon: AlertTriangle,
  },
};

export default function ErrorPage({ code = 404, title, message }: ErrorPageProps) {
  const cfg = DEFAULTS[code] || DEFAULTS[404];
  const Icon = cfg.Icon;
  const finalTitle = title || cfg.title;
  const finalMessage = message || cfg.message;

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--color-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '48px 24px',
    }}>
      {/* Icon */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '20px',
        backgroundColor: 'rgba(154,110,86,0.08)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: '32px',
      }}>
        <Icon size={36} strokeWidth={1.5} color="var(--color-accent)" />
      </div>

      {/* Code */}
      <p style={{
        fontSize: 'clamp(64px, 12vw, 120px)', fontWeight: 800,
        color: 'var(--color-ink)', letterSpacing: '-0.06em', lineHeight: 1,
        marginBottom: '8px', opacity: 0.1,
      }}>
        {code}
      </p>

      {/* Title */}
      <h1 style={{
        fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)',
        marginBottom: '8px', letterSpacing: '-0.02em',
      }}>
        {finalTitle}
      </h1>

      {/* Message */}
      <p style={{
        fontSize: '15px', color: 'var(--color-muted)',
        maxWidth: '400px', marginBottom: '40px', lineHeight: 1.6,
      }}>
        {finalMessage}
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 28px', borderRadius: '999px',
            backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
            fontSize: '14px', fontWeight: 600, textDecoration: 'none',
          }}
        >
          ← Go to homepage
        </Link>
        {code === 500 && (
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px', borderRadius: '999px',
              backgroundColor: 'transparent', color: 'var(--color-ink)',
              border: '1.5px solid rgba(154,110,86,0.2)',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
