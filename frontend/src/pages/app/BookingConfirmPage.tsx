import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, AlertCircle, CalendarDays, User, FileText, CheckCircle2 } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import { mockConfirmBooking } from '@/data/mockData';
import { getHospitalById } from '@/data/mockData';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function BookingConfirmPage() {
  const navigate = useNavigate();
  const store = useBookingStore();

  const [countdown, setCountdown] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if missing data
  useEffect(() => {
    if (!store.doctor || !store.slotId || !store.reason) {
      navigate('/app/search', { replace: true });
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!store.holdExpiry) return;
    const tick = () => {
      const remaining = (store.holdExpiry || 0) - Date.now();
      if (remaining <= 0) {
        setCountdown('0:00');
        navigate(`/app/book/${store.doctor?._id}`, { replace: true });
      } else {
        setCountdown(formatCountdown(remaining));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [store.holdExpiry]);

  if (!store.doctor || !store.slotId || !store.reason) return null;

  const hospital = getHospitalById(store.doctor.hospitalId);

  const handleConfirm = async () => {
    if (!store.doctor || !store.slotId) return;
    if (isSubmitting || (store.holdExpiry || 0) <= Date.now()) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await mockConfirmBooking({
        doctorId: store.doctor._id,
        slotId: store.slotId,
        date: store.slotDate || '',
        time: store.slotTime || '',
        patientName: store.visitForName,
        reason: store.reason,
        symptoms: store.symptoms,
      });
      store.clearBooking();
      navigate('/app/book/success', { replace: true, state: { appointment: result.appointment } });
    } catch (err: any) {
      setError(err.message || 'Failed to confirm booking.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '24px' }}>
        Review & Confirm
      </h1>

      {/* ── Summary Card ── */}
      <div style={{
        backgroundColor: 'var(--color-base)', padding: '24px', borderRadius: '16px',
        border: '1px solid rgba(154,110,86,0.12)', marginBottom: '24px',
      }}>
        {/* Doctor & Time */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(154,110,86,0.08)', paddingBottom: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '2px' }}>{store.doctor.name}</p>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>{store.doctor.specialty} • {hospital?.name}</p>
          </div>
          <Link to={`/app/book/${store.doctor._id}`} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Edit</Link>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '20px' }}>
          <CalendarDays size={18} color="var(--color-muted)" style={{ marginTop: '2px' }} />
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>Date & Time</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>{store.slotDate} at {store.slotTime}</p>
          </div>
        </div>

        {/* Patient Details */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '20px' }}>
          <User size={18} color="var(--color-muted)" style={{ marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>Patient</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>{store.visitForName}</p>
          </div>
          <Link to="/app/book/details" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}>Edit</Link>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <FileText size={18} color="var(--color-muted)" style={{ marginTop: '2px' }} />
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>Reason for visit</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>{store.reason}</p>
            {store.symptoms && (
              <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '4px' }}>{store.symptoms}</p>
            )}
            {store.attachedFile && (
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-accent)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Attached: {store.attachedFile.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Fee & Policy ── */}
      <div style={{
        backgroundColor: 'rgba(154,110,86,0.03)', padding: '20px 24px', borderRadius: '16px',
        border: '1px solid rgba(154,110,86,0.08)', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>Consultation Fee</span>
          <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-ink)' }}>₹{store.doctor.fee}</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
          Pay at the clinic after your consultation.
          <br /><br />
          <strong>Cancellation Policy:</strong> Please cancel at least 2 hours prior to your appointment if you cannot make it, to allow other patients to book this slot.
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
          borderRadius: '8px', backgroundColor: 'rgba(220,38,38,0.05)',
          border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', marginBottom: '20px',
        }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* ── Sticky Confirm ── */}
      <div style={{
        position: 'sticky', bottom: '80px', padding: '16px 0',
        backgroundColor: 'var(--color-base)', borderTop: '1px solid rgba(154,110,86,0.08)',
        display: 'flex', gap: '16px', alignItems: 'center',
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Slot held for
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="var(--color-accent)" />
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>
              {countdown}
            </span>
          </div>
        </div>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting || countdown === '0:00'}
          style={{
            flex: 2, padding: '16px', borderRadius: '12px',
            backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
            border: 'none', fontSize: '15px', fontWeight: 700,
            cursor: isSubmitting || countdown === '0:00' ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || countdown === '0:00' ? 0.7 : 1, transition: 'opacity 0.2s',
          }}
        >
          {isSubmitting ? 'Confirming...' : 'Confirm booking'}
        </button>
      </div>
    </div>
  );
}
