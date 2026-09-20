import { useParams, useNavigate } from 'react-router-dom';
import QueueStatusWidget from '@/components/ui/QueueStatusWidget';

export default function QueueTrackerPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  if (!appointmentId) return null;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '80px' }}>
      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} style={{ 
          background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '14px', 
          fontWeight: 600, cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' 
        }}>
          &larr; Back
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          Live Queue Tracker
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>
          Track your wait time in real-time. We'll notify you when it's your turn.
        </p>
      </div>

      <QueueStatusWidget appointmentId={appointmentId} compact={false} />
    </div>
  );
}
