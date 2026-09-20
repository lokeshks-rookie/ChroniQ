import { useState, useEffect } from 'react';
import { Activity, Clock, Users, ArrowRight } from 'lucide-react';
import { mockGetAppointmentById, mockQueueStream, type AppointmentStatus } from '@/data/mockData';
import { Link } from 'react-router-dom';

interface QueueStatusWidgetProps {
  appointmentId: string;
  compact?: boolean;
}

/**
 * Shared live-queue status widget.
 * Uses mockQueueStream to simulate live updates.
 */
export default function QueueStatusWidget({
  appointmentId,
  compact = false
}: QueueStatusWidgetProps) {
  const [position, setPosition] = useState<number | null>(null);
  const [eta, setEta] = useState<string>('');
  const [status, setStatus] = useState<AppointmentStatus | null>(null);
  const [token, setToken] = useState<string>('');
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [room, setRoom] = useState<string>('Room 4'); // mock room

  useEffect(() => {
    // Initial fetch
    const apt = mockGetAppointmentById(appointmentId);
    if (apt) {
      setPosition(apt.queuePosition || 0);
      setEta(apt.eta || '');
      setStatus(apt.status);
      setToken(apt.token || '');
      // Mock check-in time 30 mins ago
      const d = new Date();
      d.setMinutes(d.getMinutes() - 30);
      setCheckInTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    // Subscribe to mock stream
    const unsubscribe = mockQueueStream(appointmentId, (data) => {
      setPosition(data.position);
      setEta(data.eta);
      setStatus(data.status);
    });

    return () => unsubscribe();
  }, [appointmentId]);

  if (!status) return null;

  const isCalled = status === 'called' || position === 0;

  // COMPACT MODE (For Dashboard)
  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px 20px', borderRadius: '12px',
        backgroundColor: isCalled ? 'rgba(46,125,70,0.08)' : 'rgba(154,110,86,0.06)',
        border: `1.5px solid ${isCalled ? 'rgba(46,125,70,0.2)' : 'rgba(154,110,86,0.12)'}`,
      }}>
        {/* Pulsing indicator */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          backgroundColor: isCalled ? 'var(--color-success)' : 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          animation: isCalled ? 'pulse 1.5s infinite' : 'none',
        }}>
          <Activity size={20} color="var(--color-base)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{
              fontSize: '13px', fontWeight: 700,
              color: isCalled ? 'var(--color-success)' : 'var(--color-ink)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {isCalled ? 'Your turn!' : 'In Queue'}
            </span>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              padding: '2px 8px', borderRadius: '6px',
              backgroundColor: isCalled ? 'var(--color-success)' : 'var(--color-ink)',
              color: 'var(--color-base)',
            }}>
              {token}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-muted)', fontWeight: 500 }}>
            {isCalled ? "Please proceed to the doctor's room" : `Position: ${position} • ETA: ${eta}`}
          </div>
        </div>

        {!isCalled && (
          <Link to={`/app/queue/${appointmentId}`} style={{
            padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-surface)',
            color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none'
          }}>
            <ArrowRight size={18} />
          </Link>
        )}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  // FULL MODE (For Queue Tracker Page)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Large Status Area */}
      <div style={{
        padding: '32px 24px', borderRadius: '24px', textAlign: 'center',
        backgroundColor: isCalled ? 'rgba(46,125,70,0.08)' : 'rgba(154,110,86,0.06)',
        border: `2px solid ${isCalled ? 'rgba(46,125,70,0.2)' : 'rgba(154,110,86,0.15)'}`,
      }}>
        {/* Token Badge */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'inline-block', padding: '8px 16px', borderRadius: '12px',
            backgroundColor: isCalled ? 'var(--color-success)' : 'var(--color-ink)',
            color: 'var(--color-base)', fontSize: '32px', fontWeight: 800,
            letterSpacing: '0.05em'
          }}>
            {token}
          </div>
        </div>

        {/* Human Readable Status */}
        {isCalled ? (
          <div>
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '64px', height: '64px', borderRadius: '16px',
              backgroundColor: 'var(--color-success)', color: 'var(--color-base)',
              marginBottom: '16px', animation: 'pulse 1.5s infinite'
            }}>
              <Activity size={32} />
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-success)', marginBottom: '8px' }}>
              You're being called!
            </h2>
            <p style={{ fontSize: '18px', color: 'var(--color-ink)', fontWeight: 500 }}>
              Please proceed immediately to <strong>{room}</strong>.
            </p>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '48px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '4px', lineHeight: 1 }}>
              {position}
            </h2>
            <p style={{ fontSize: '18px', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '32px' }}>
              Patients ahead of you
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Clock size={24} color="var(--color-accent)" />
                <span style={{ fontSize: '14px', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Est. Wait</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-ink)' }}>{eta}</span>
              </div>
              <div style={{ width: '1px', height: '48px', backgroundColor: 'rgba(154,110,86,0.2)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Users size={24} color="var(--color-accent)" />
                <span style={{ fontSize: '14px', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-ink)' }}>Waiting</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mini Status Timeline */}
      <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: 'var(--color-surface)', border: '1px solid rgba(154,110,86,0.1)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '16px' }}>Timeline</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
              <div style={{ width: '2px', height: '32px', backgroundColor: 'var(--color-success)', marginTop: '4px' }} />
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>Checked in</p>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{checkInTime}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }} />
              <div style={{ width: '2px', height: '32px', backgroundColor: isCalled ? 'var(--color-success)' : 'rgba(154,110,86,0.2)', marginTop: '4px' }} />
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>In queue</p>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Currently waiting</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isCalled ? 'var(--color-success)' : 'rgba(154,110,86,0.2)' }} />
            </div>
            <div style={{ opacity: isCalled ? 1 : 0.5 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>Called</p>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Proceed to doctor</p>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
