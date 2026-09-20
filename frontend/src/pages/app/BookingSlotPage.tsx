import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getDoctorById, getHospitalById, getSlots14Day, mockHoldSlot, mockReleaseSlot, type SlotGridDay, type BookingSlot } from '@/data/mockData';
import { useBookingStore } from '@/store/bookingStore';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function BookingSlotPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const store = useBookingStore();

  const doctor = doctorId ? getDoctorById(doctorId) : null;
  const hospital = doctor ? getHospitalById(doctor.hospitalId) : null;
  const slotDays = doctorId ? getSlots14Day(doctorId) : [];

  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [holdExpiry, setHoldExpiry] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');
  const [isHolding, setIsHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateStripRef = useRef<HTMLDivElement>(null);

  // Initialize booking store on mount
  useEffect(() => {
    if (doctor) store.initBooking(doctor);
  }, [doctorId]);

  // Countdown timer
  useEffect(() => {
    if (!holdExpiry) { setCountdown(''); return; }
    const tick = () => {
      const remaining = holdExpiry - Date.now();
      if (remaining <= 0) {
        setCountdown('0:00');
        setHoldExpiry(null);
        setSelectedSlotId(null);
        store.setSlot('', '', '');
        store.setHoldExpiry(0);
        setError('Your hold expired. Please select another slot.');
        if (selectedSlotId) mockReleaseSlot(selectedSlotId);
      } else {
        setCountdown(formatCountdown(remaining));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [holdExpiry]);

  if (!doctor || !hospital) {
    navigate('/app/search', { replace: true });
    return null;
  }

  const currentDay: SlotGridDay = slotDays[selectedDayIdx];
  const availableOnDay = currentDay?.slots.filter((s) => s.state === 'available').length || 0;

  const handleSelectSlot = async (slot: BookingSlot) => {
    if (slot.state !== 'available' || isHolding) return;
    setError(null);
    setIsHolding(true);

    // Release previous hold
    if (selectedSlotId) {
      await mockReleaseSlot(selectedSlotId);
    }

    try {
      const result = await mockHoldSlot(slot.id);
      setSelectedSlotId(slot.id);
      setHoldExpiry(result.expiry);
      store.setSlot(slot.id, currentDay.date, slot.time);
      store.setHoldExpiry(result.expiry);
    } catch (err: any) {
      setError(err.message || 'Failed to hold slot.');
      setSelectedSlotId(null);
    } finally {
      setIsHolding(false);
    }
  };

  const handleContinue = () => {
    if (!selectedSlotId || !holdExpiry || holdExpiry <= Date.now()) return;
    navigate('/app/book/details');
  };

  const slotStateStyles: Record<string, { bg: string; border: string; color: string; label: string }> = {
    available: { bg: 'rgba(46,125,70,0.06)', border: 'rgba(46,125,70,0.2)', color: 'var(--color-success)', label: 'Available' },
    held: { bg: 'rgba(154,110,86,0.06)', border: 'rgba(154,110,86,0.15)', color: 'var(--color-muted)', label: 'Held' },
    booked: { bg: 'rgba(192,57,43,0.04)', border: 'rgba(192,57,43,0.1)', color: 'var(--color-muted)', label: 'Booked' },
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* ── Sticky Summary Header ── */}
      <div style={{
        position: 'sticky', top: '64px', zIndex: 20,
        backgroundColor: 'var(--color-base)', padding: '16px 0',
        borderBottom: '1px solid rgba(154,110,86,0.08)', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)' }}>{doctor.name}</p>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{hospital.name} • ₹{doctor.fee}</p>
          </div>
          {countdown && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: 'rgba(154,110,86,0.08)',
              border: '1px solid rgba(154,110,86,0.15)',
            }}>
              <Clock size={14} color="var(--color-accent)" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>
                {countdown}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Date Strip ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)', flex: 1 }}>Select a date</h2>
          <button onClick={() => dateStripRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
            style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(154,110,86,0.15)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => dateStripRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
            style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(154,110,86,0.15)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div ref={dateStripRef} style={{
          display: 'flex', gap: '8px', overflowX: 'auto', scrollSnapType: 'x mandatory',
          paddingBottom: '4px', scrollbarWidth: 'none',
        }}>
          {slotDays.map((day, idx) => {
            const openCount = day.slots.filter((s) => s.state === 'available').length;
            const active = idx === selectedDayIdx;
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDayIdx(idx)}
                disabled={openCount === 0}
                style={{
                  flexShrink: 0, scrollSnapAlign: 'start',
                  width: '80px', padding: '12px 8px', borderRadius: '12px',
                  border: `1.5px solid ${active ? 'var(--color-ink)' : 'rgba(154,110,86,0.12)'}`,
                  backgroundColor: active ? 'var(--color-ink)' : 'var(--color-base)',
                  color: active ? 'var(--color-base)' : openCount === 0 ? 'var(--color-muted)' : 'var(--color-ink)',
                  cursor: openCount === 0 ? 'not-allowed' : 'pointer',
                  opacity: openCount === 0 ? 0.4 : 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{day.dayOfWeek}</span>
                <span style={{ fontSize: '20px', fontWeight: 800 }}>{day.dayNum}</span>
                <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.7 }}>{openCount} open</span>
              </button>
            );
          })}
        </div>
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

      {/* ── Time Slot Grid ── */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
          {currentDay?.label} — {availableOnDay} slot{availableOnDay !== 1 ? 's' : ''} available
        </h2>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {Object.entries(slotStateStyles).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: val.bg, border: `1px solid ${val.border}` }} />
              <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 500 }}>{val.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: 'var(--color-ink)' }} />
            <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 500 }}>Selected</span>
          </div>
        </div>

        {currentDay?.slots.length === 0 ? (
          <p style={{ padding: '32px', textAlign: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>No slots on this day.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
            {currentDay?.slots.map((slot) => {
              const isSelected = slot.id === selectedSlotId;
              const styles = isSelected
                ? { bg: 'var(--color-ink)', border: 'var(--color-ink)', color: 'var(--color-base)' }
                : slotStateStyles[slot.state] || slotStateStyles.available;
              const isClickable = slot.state === 'available' && !isHolding;

              return (
                <button
                  key={slot.id}
                  onClick={() => handleSelectSlot(slot)}
                  disabled={!isClickable && !isSelected}
                  style={{
                    padding: '12px 8px', borderRadius: '10px',
                    border: `1.5px solid ${styles.border}`,
                    backgroundColor: styles.bg, color: isSelected ? styles.color : styles.color,
                    cursor: isClickable ? 'pointer' : 'default',
                    opacity: (slot.state === 'booked' || slot.state === 'held') && !isSelected ? 0.6 : 1,
                    fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>{slot.time}</span>
                  <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {isSelected ? 'Selected' : slotStateStyles[slot.state]?.label || slot.state}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Continue Button ── */}
      <div style={{
        position: 'sticky', bottom: '80px', padding: '16px 0',
        backgroundColor: 'var(--color-base)',
      }}>
        <button
          onClick={handleContinue}
          disabled={!selectedSlotId || !holdExpiry || isHolding}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
            border: 'none', fontSize: '15px', fontWeight: 700,
            cursor: !selectedSlotId ? 'not-allowed' : 'pointer',
            opacity: !selectedSlotId ? 0.5 : 1, transition: 'opacity 0.2s',
          }}
        >
          {isHolding ? 'Holding slot...' : 'Continue to details'}
        </button>
      </div>
    </div>
  );
}
