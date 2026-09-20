import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, CheckCircle2, FileText, IndianRupee, AlertCircle } from 'lucide-react';
import { mockGetAppointmentById, mockCancelAppointment, MockAppointment, AppointmentStatus } from '@/data/mockData';
import TokenBadge from '@/components/ui/TokenBadge';
import ErrorPage from '@/components/ui/ErrorPage';

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<MockAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const apt = mockGetAppointmentById(id);
      setAppointment(apt);
    }
    setLoading(false);
  }, [id]);

  if (loading) return null;
  if (!appointment) return <ErrorPage code={404} />;

  const handleCancel = () => {
    if (cancelModalId) {
      const success = mockCancelAppointment(cancelModalId);
      if (success) {
        setAppointment(mockGetAppointmentById(cancelModalId));
      }
      setCancelModalId(null);
    }
  };

  const isUpcoming = appointment.status === 'upcoming';
  const isInQueue = appointment.status === 'in_queue' || appointment.status === 'called';
  const isCompleted = appointment.status === 'completed';
  const isCancelled = appointment.status === 'cancelled';

  const StatusBadge = ({ status }: { status: AppointmentStatus }) => {
    let bg = 'rgba(154,110,86,0.1)';
    let color = 'var(--color-ink)';
    if (status === 'completed' || status === 'in_queue' || status === 'called') {
      bg = 'rgba(46,125,70,0.1)';
      color = 'var(--color-success)';
    } else if (status === 'cancelled') {
      bg = 'rgba(220,38,38,0.1)';
      color = '#DC2626';
    }
    return (
      <span style={{
        fontSize: '12px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px',
        backgroundColor: bg, color, textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  // Timeline steps
  const steps = [
    { id: 'booked', label: 'Booked', done: true },
    { id: 'checked_in', label: 'Checked-in', done: isInQueue || isCompleted },
    { id: 'in_queue', label: 'In Queue', done: isInQueue || isCompleted, active: appointment.status === 'in_queue' },
    { id: 'called', label: 'Called', done: appointment.status === 'called' || isCompleted, active: appointment.status === 'called' },
    { id: 'completed', label: 'Completed', done: isCompleted, active: isCompleted },
  ];

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '80px' }}>
      
      {/* ── Header ── */}
      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} style={{ 
          background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '14px', 
          fontWeight: 600, cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' 
        }}>
          &larr; Back
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
              {appointment.doctorName}
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--color-muted)' }}>
              {appointment.specialty} • {appointment.hospitalName}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
      </div>

      {/* ── Timeline ── */}
      {!isCancelled && (
        <div style={{ marginBottom: '32px', padding: '24px', borderRadius: '20px', backgroundColor: 'var(--color-base)', border: '1px solid rgba(154,110,86,0.1)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {steps.map((step, idx) => (
              <div key={step.id} style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ 
                    width: '16px', height: '16px', borderRadius: '50%', 
                    backgroundColor: step.done ? 'var(--color-success)' : 'rgba(154,110,86,0.1)',
                    border: step.active ? '4px solid rgba(46,125,70,0.2)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1
                  }} />
                  {idx < steps.length - 1 && (
                    <div style={{ width: '2px', height: '32px', backgroundColor: step.done ? 'var(--color-success)' : 'rgba(154,110,86,0.1)', margin: '-2px 0' }} />
                  )}
                </div>
                <div style={{ paddingBottom: idx < steps.length - 1 ? '16px' : '0' }}>
                  <p style={{ fontSize: '15px', fontWeight: step.active ? 700 : 500, color: step.done ? 'var(--color-ink)' : 'var(--color-muted)' }}>
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Details Card ── */}
      <div style={{
        backgroundColor: 'var(--color-base)', padding: '24px', borderRadius: '20px',
        border: '1px solid rgba(154,110,86,0.15)', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(154,110,86,0.08)', paddingBottom: '24px', marginBottom: '24px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Queue Token
            </p>
            {appointment.token ? (
              <TokenBadge token={appointment.token} size="lg" />
            ) : (
              <span style={{ fontSize: '15px', color: 'var(--color-muted)', fontStyle: 'italic' }}>Pending check-in</span>
            )}
          </div>
          <div style={{ padding: '4px', backgroundColor: 'var(--color-base)', border: '1px dashed rgba(154,110,86,0.3)', borderRadius: '12px' }}>
            <div style={{ width: '64px', height: '64px', backgroundImage: 'radial-gradient(var(--color-ink) 2px, transparent 2px)', backgroundSize: '6px 6px', opacity: 0.8 }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <CalendarDays size={20} color="var(--color-accent)" style={{ marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>Date & Time</p>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' }}>{appointment.date} at {appointment.time}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <MapPin size={20} color="var(--color-accent)" style={{ marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>Hospital</p>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>{appointment.hospitalName}</p>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(appointment.hospitalName)}`} target="_blank" rel="noreferrer" style={{ fontSize: '14px', color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
                Get directions ↗
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <FileText size={20} color="var(--color-accent)" style={{ marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>Reason for Visit</p>
              <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-ink)' }}>{appointment.reason}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <IndianRupee size={20} color="var(--color-accent)" style={{ marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>Consultation Fee</p>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' }}>₹{appointment.fee}</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(154,110,86,0.08)' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>Booking ID</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>{appointment.booking_code}</p>
        </div>
      </div>

      {/* ── Policy Note ── */}
      {isUpcoming && (
        <div style={{ padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: '12px', marginBottom: '32px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--color-ink)' }}>Cancellation Policy:</strong> Free cancellation up to 24 hours before the appointment. Later cancellations may incur a fee.
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {isUpcoming && (
          <>
            <button 
              onClick={() => setCancelModalId(appointment._id)}
              style={{
                flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: 'transparent',
                border: '1.5px solid rgba(220,38,38,0.3)', color: '#DC2626', fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Cancel Appointment
            </button>
            <Link to={`/app/book/${appointment.doctorId}`} style={{
              flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: 'transparent',
              border: '1.5px solid rgba(154,110,86,0.3)', color: 'var(--color-ink)', fontSize: '15px', fontWeight: 600, textAlign: 'center', textDecoration: 'none',
            }}>
              Reschedule
            </Link>
          </>
        )}

        {isInQueue && (
          <Link to={`/app/queue/${appointment._id}`} style={{
            width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-success)',
            color: 'var(--color-base)', fontSize: '16px', fontWeight: 700, textAlign: 'center', textDecoration: 'none',
          }}>
            Track Live Queue
          </Link>
        )}

        {isCompleted && (
          <button style={{
            width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-ink)',
            color: 'var(--color-base)', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: 'var(--font-sans)',
          }}>
            Leave a Review
          </button>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(25,8,1,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-base)', padding: '32px', borderRadius: '24px',
            maxWidth: '400px', width: '100%', boxShadow: '0 20px 40px rgba(25,8,1,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={24} color="#DC2626" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-ink)' }}>Cancel Appointment?</h3>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '32px', lineHeight: 1.5 }}>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setCancelModalId(null)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-ink)', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Keep it
              </button>
              <button 
                onClick={handleCancel}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#DC2626',
                  color: 'white', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
