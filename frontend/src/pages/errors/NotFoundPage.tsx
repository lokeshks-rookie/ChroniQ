import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        backgroundColor: 'var(--color-base)',
      }}
    >
      <p className="eyebrow" style={{ marginBottom: '16px' }}>■ 404</p>
      <h1
        style={{
          fontSize: 'clamp(56px, 12vw, 120px)',
          fontWeight: 800,
          color: 'var(--color-ink)',
          letterSpacing: '-0.06em',
          lineHeight: 1,
          marginBottom: '8px',
        }}
      >
        404
      </h1>
      <p
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--color-ink)',
          marginBottom: '8px',
          letterSpacing: '-0.01em',
        }}
      >
        Page not found
      </p>
      <p
        style={{
          fontSize: '15px',
          color: 'var(--color-muted)',
          maxWidth: '380px',
          marginBottom: '40px',
          lineHeight: 1.6,
        }}
      >
        The page you're looking for doesn't exist, or it may have moved. Let's get you back.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 28px',
          borderRadius: '999px',
          backgroundColor: 'var(--color-ink)',
          color: 'var(--color-base)',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        ← Back to home
      </Link>
    </div>
  );
}
