import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, CalendarDays, MapPin, Download, Share2 } from 'lucide-react';
import type { MockAppointment } from '@/data/mockData';
import TokenBadge from '@/components/ui/TokenBadge';

export default function BookingSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { appointment?: MockAppointment };
  const appointment = state?.appointment;

  useEffect(() => {
    if (!appointment) {
      navigate('/app', { replace: true });
    }
  }, [appointment, navigate]);

  if (!appointment) return null;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: '40px', paddingBottom: '80px', textAlign: 'center' }}>
      {/* ── Success Icon ── */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '24px', margin: '0 auto 24px',
        backgroundColor: 'rgba(46,125,70,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid rgba(46,125,70,0.2)',
      }}>
        <CheckCircle2 size={40} color="var(--color-success)" strokeWidth={2} />
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
        Booking Confirmed
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '32px' }}>
        Your appointment has been successfully booked. You'll receive a reminder 2 hours before your slot.
      </p>

      {/* ── Queue Token ── */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
          Your Queue Token
        </p>
        <TokenBadge token={appointment.token} size="lg" />
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '12px' }}>
          Show this token at the reception when you arrive.
        </p>
      </div>

      {/* ── Appointment Card ── */}
      <div style={{
        backgroundColor: 'var(--color-base)', padding: '24px', borderRadius: '20px',
        border: '1px solid rgba(154,110,86,0.15)', boxShadow: '0 8px 32px rgba(25,8,1,0.04)',
        textAlign: 'left', marginBottom: '32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(154,110,86,0.08)', paddingBottom: '16px', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '2px' }}>{appointment.doctorName}</p>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>{appointment.specialty}</p>
          </div>
          <div style={{ padding: '4px', backgroundColor: 'var(--color-base)', border: '1px dashed rgba(154,110,86,0.3)', borderRadius: '8px' }}>
            {/* Fake QR Code */}
            <div style={{ width: '48px', height: '48px', backgroundImage: 'radial-gradient(var(--color-ink) 2px, transparent 2px)', backgroundSize: '6px 6px', opacity: 0.8 }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CalendarDays size={18} color="var(--color-muted)" style={{ marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>Date & Time</p>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>{appointment.date} at {appointment.time}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <MapPin size={18} color="var(--color-muted)" style={{ marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>Hospital</p>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '2px' }}>{appointment.hospitalName}</p>
              <p style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: 500 }}>Get directions</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(154,110,86,0.08)' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '2px' }}>Patient</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>{appointment.patientName}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '2px' }}>Booking ID</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>{appointment.booking_code}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Secondary Actions ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button style={{
          flex: 1, padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          backgroundColor: 'transparent', border: '1.5px solid rgba(154,110,86,0.2)', color: 'var(--color-ink)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>
          <Download size={16} /> Add to calendar
        </button>
        <button style={{
          flex: 1, padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          backgroundColor: 'transparent', border: '1.5px solid rgba(154,110,86,0.2)', color: 'var(--color-ink)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>
          <Share2 size={16} /> Share details
        </button>
      </div>

      {/* ── Primary Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link to={`/app/queue/${appointment._id}`} style={{
          padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
          fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'block',
        }}>
          View appointment
        </Link>
        <Link to="/app" style={{
          padding: '16px', borderRadius: '12px', backgroundColor: 'transparent', color: 'var(--color-ink)',
          fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'block',
        }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
