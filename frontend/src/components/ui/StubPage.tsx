import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';

interface StubPageProps {
  title: string;
  description?: string;
  route?: string;
}

/** Branded placeholder shown for pages not yet implemented */
export default function StubPage({
  title,
  description = 'This page is coming soon as part of the full ChroniQ build.',
  route,
}: StubPageProps) {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--color-base)',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          backgroundColor: 'rgba(154,110,86,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <Construction size={28} color="var(--color-accent)" strokeWidth={1.8} />
      </div>

      {route && (
        <p className="eyebrow" style={{ marginBottom: '12px' }}>
          ■ {route}
        </p>
      )}

      <h1
        style={{
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 700,
          color: 'var(--color-ink)',
          letterSpacing: '-0.025em',
          marginBottom: '12px',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: '15px',
          color: 'var(--color-muted)',
          maxWidth: '400px',
          lineHeight: 1.65,
          marginBottom: '36px',
        }}
      >
        {description}
      </p>

      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '11px 24px',
          borderRadius: '999px',
          backgroundColor: 'var(--color-ink)',
          color: 'var(--color-base)',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'opacity 0.2s',
        }}
      >
        ← Back to home
      </Link>
    </div>
  );
}
