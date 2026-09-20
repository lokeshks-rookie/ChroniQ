import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, Search, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { mockGetMyAppointments, type MockAppointment, type AppointmentStatus } from '@/data/mockData';
import { bookingApi } from '@/services/api';
import TokenBadge from '@/components/ui/TokenBadge';

type TabType = 'upcoming' | 'past' | 'cancelled';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<MockAppointment[]>([...mockGetMyAppointments()]);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await bookingApi.getMyAppointments();
      const raw = res.data || [];
      if (raw.length > 0) {
        const mapped: MockAppointment[] = raw.map((a: any) => ({
          _id: a.id || a.booking_code,
          doctorId: a.doctor_id,
          hospitalId: a.hospital_id,
          doctorName: a.doctor_name,
          hospitalName: a.hospital_name,
          specialty: a.department_name || '',
          date: a.scheduled_start ? a.scheduled_start.split('T')[0] : '',
          time: a.scheduled_start ? a.scheduled_start.split('T')[1]?.slice(0, 5) : '',
          status: a.status === 'booked' ? 'upcoming' : a.status,
          token: a.token,
          booking_code: a.booking_code,
          reason: a.reason,
          patientName: a.patient?.name || '',
          fee: a.fee || 0,
        }));
        setAppointments(mapped);
      }
    } catch (err) {
      console.warn('Backend load failed, using local appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Group appointments
  const grouped = useMemo(() => {
    const upcoming: MockAppointment[] = [];
    const past: MockAppointment[] = [];
    const cancelled: MockAppointment[] = [];

    appointments.forEach((apt) => {
      if (apt.status === 'cancelled') {
        cancelled.push(apt);
      } else if (apt.status === 'completed') {
        past.push(apt);
      } else {
        // upcoming, in_queue, called
        upcoming.push(apt);
      }
    });

    return { upcoming, past, cancelled };
  }, [appointments]);

  const activeAppointments = grouped[activeTab];

  const handleCancel = async () => {
    if (cancelModalId) {
      try {
        await bookingApi.cancel(cancelModalId, { reason: 'Patient cancelled' });
      } catch (e) {
        console.warn('Backend cancel error:', e);
      }
      await loadAppointments();
      setToastMessage('Appointment cancelled successfully.');
      setTimeout(() => setToastMessage(null), 3000);
      setCancelModalId(null);
    }
  };

  const StatusBadge = ({ status }: { status: AppointmentStatus }) => {
    let bg = 'rgba(154,110,86,0.1)';
    let color = 'var(--color-ink)';
    
    if (status === 'completed') {
      bg = 'rgba(46,125,70,0.1)';
      color = 'var(--color-success)';
    } else if (status === 'cancelled') {
      bg = 'rgba(220,38,38,0.1)';
      color = '#DC2626';
    } else if (status === 'in_queue' || status === 'called') {
      bg = 'rgba(46,125,70,0.1)';
      color = 'var(--color-success)';
    }

    return (
      <span style={{
        fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
        backgroundColor: bg, color, textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '960px', paddingBottom: '80px' }}>
      
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          My Appointments
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--color-muted)', fontWeight: 500 }}>
          Manage your bookings and view past visits.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
        
        {(['upcoming', 'past', 'cancelled'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '999px', whiteSpace: 'nowrap',
              backgroundColor: activeTab === tab ? 'var(--color-ink)' : 'var(--color-surface)',
              border: `1px solid ${activeTab === tab ? 'var(--color-ink)' : 'rgba(154,110,86,0.15)'}`,
              color: activeTab === tab ? 'var(--color-base)' : 'var(--color-ink)',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ textTransform: 'capitalize' }}>{tab}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
              backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.2)' : 'rgba(154,110,86,0.1)',
              color: activeTab === tab ? 'var(--color-base)' : 'var(--color-ink)',
            }}>
              {grouped[tab].length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-surface)', borderRadius: '24px', border: '1px dashed rgba(154,110,86,0.2)' }}>
            <CalendarDays size={48} strokeWidth={1.2} color="var(--color-muted)" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
              No {activeTab} appointments
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '24px', maxWidth: '300px', margin: '0 auto 24px' }}>
              {activeTab === 'upcoming' ? "You don't have any upcoming visits. Book one now to skip the waiting room." : "Nothing to see here yet."}
            </p>
            {activeTab === 'upcoming' && (
              <Link to="/app/search" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px', borderRadius: '999px',
                backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
                fontSize: '14px', fontWeight: 600, textDecoration: 'none',
              }}>
                <Search size={16} /> Find a doctor
              </Link>
            )}
          </div>
        ) : (
          activeAppointments.map((apt) => (
            <div key={apt._id} style={{
              backgroundColor: 'var(--color-base)', borderRadius: '20px',
              border: '1px solid rgba(154,110,86,0.15)', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '20px',
              boxShadow: '0 4px 20px rgba(25,8,1,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <Link to={`/app/appointments/${apt._id}`} style={{ textDecoration: 'none' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                      {apt.doctorName}
                    </h3>
                  </Link>
                  <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '12px' }}>
                    {apt.specialty} • {apt.hospitalName}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CalendarDays size={14} color="var(--color-muted)" />
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>{apt.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="var(--color-muted)" />
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>{apt.time}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                  <StatusBadge status={apt.status} />
                  {apt.token && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Token</span>
                      <TokenBadge token={apt.token} size="sm" />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Divider */}
              <div style={{ height: '1px', backgroundColor: 'rgba(154,110,86,0.1)' }} />

              {/* Card Actions */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {activeTab === 'upcoming' && (
                  <>
                    {(apt.status === 'in_queue' || apt.status === 'called') ? (
                      <Link to={`/app/queue/${apt._id}`} style={{
                        flex: 1, minWidth: '140px', padding: '10px 16px', borderRadius: '10px',
                        backgroundColor: 'var(--color-success)', color: 'var(--color-base)',
                        fontSize: '14px', fontWeight: 600, textAlign: 'center', textDecoration: 'none',
                      }}>
                        Track Live Queue
                      </Link>
                    ) : (
                      <>
                        <button 
                          onClick={() => setCancelModalId(apt._id)}
                          style={{
                            flex: 1, minWidth: '120px', padding: '10px 16px', borderRadius: '10px',
                            backgroundColor: 'transparent', border: '1.5px solid rgba(220,38,38,0.2)',
                            color: '#DC2626', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => navigate(`/app/book/${apt.doctorId}`)} // TODO: implement proper reschedule mode instead of fresh booking
                          style={{
                            flex: 1, minWidth: '120px', padding: '10px 16px', borderRadius: '10px',
                            backgroundColor: 'transparent', border: '1.5px solid rgba(154,110,86,0.2)',
                            color: 'var(--color-ink)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                          }}
                        >
                          Reschedule
                        </button>
                      </>
                    )}
                  </>
                )}

                {activeTab === 'past' && (
                  <>
                    <Link to={`/app/book/${apt.doctorId}`} style={{
                      flex: 1, minWidth: '140px', padding: '10px 16px', borderRadius: '10px',
                      backgroundColor: 'rgba(154,110,86,0.06)', border: '1px solid rgba(154,110,86,0.1)',
                      color: 'var(--color-ink)', fontSize: '14px', fontWeight: 600, textAlign: 'center', textDecoration: 'none',
                    }}>
                      Book again
                    </Link>
                    <button style={{
                      flex: 1, minWidth: '140px', padding: '10px 16px', borderRadius: '10px',
                      backgroundColor: 'transparent', border: '1px solid rgba(154,110,86,0.2)',
                      color: 'var(--color-ink)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}>
                      Leave a review
                    </button>
                  </>
                )}

                {activeTab === 'cancelled' && (
                  <Link to={`/app/book/${apt.doctorId}`} style={{
                    flex: 1, minWidth: '140px', padding: '10px 16px', borderRadius: '10px',
                    backgroundColor: 'rgba(154,110,86,0.06)', border: '1px solid rgba(154,110,86,0.1)',
                    color: 'var(--color-ink)', fontSize: '14px', fontWeight: 600, textAlign: 'center', textDecoration: 'none',
                  }}>
                    Book again
                  </Link>
                )}
                
                <Link to={`/app/appointments/${apt._id}`} style={{
                  padding: '10px', borderRadius: '10px', backgroundColor: 'transparent',
                  color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ChevronRight size={20} />
                </Link>
              </div>
            </div>
          ))
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

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
          padding: '12px 24px', borderRadius: '999px', fontSize: '14px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100,
          boxShadow: '0 8px 32px rgba(25,8,1,0.15)', animation: 'slideUp 0.3s ease-out'
        }}>
          <CheckCircle2 size={16} />
          {toastMessage}
          <style>{`
            @keyframes slideUp {
              from { transform: translate(-50%, 100%); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
