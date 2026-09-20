import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

/**
 * /display/:hospitalId/:deptId
 * Full-screen TV waiting-hall display board — real-time "Now serving" board.
 * This stub shows the shell; SSE integration comes in a later iteration.
 */
export default function DisplayBoardPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-ink)',
        color: 'var(--color-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: '24px',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '18px',
          backgroundColor: 'rgba(154,110,86,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Activity size={36} color="var(--color-accent)" strokeWidth={1.5} />
      </div>

      <div>
        <p className="eyebrow eyebrow-light" style={{ marginBottom: '12px' }}>
          ■ /display/:hospitalId/:deptId
        </p>
        <h1
          style={{
            fontSize: 'clamp(32px, 6vw, 72px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: 'var(--color-base)',
            marginBottom: '16px',
          }}
        >
          Waiting Hall Display
        </h1>
        <p style={{ fontSize: '16px', color: 'rgba(253,249,240,0.55)', maxWidth: '480px', margin: '0 auto' }}>
          Full-screen TV board — now serving token, next tokens, per-doctor status, live via SSE.
        </p>
      </div>

      <Link
        to="/"
        style={{
          padding: '10px 20px',
          borderRadius: '999px',
          border: '1px solid rgba(253,249,240,0.2)',
          color: 'rgba(253,249,240,0.65)',
          fontSize: '14px',
          textDecoration: 'none',
        }}
      >
        ← Back to home
      </Link>
    </div>
  );
}
