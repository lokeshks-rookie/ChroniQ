import { Link } from 'react-router-dom';
import { CalendarDays, Search, Clock, ChevronRight, Bell, BellDot } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { mockGetMyNextAppointment, mockGetRecentNotifications } from '@/data/mockData';
import QueueStatusWidget from '@/components/ui/QueueStatusWidget';

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const nextAppointment = mockGetMyNextAppointment();
  const notifications = mockGetRecentNotifications(4);
  const firstName = user?.name?.split(' ')[0] || 'there';

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* ── Welcome Header ── */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Hi, {firstName} 👋
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--color-muted)', fontWeight: 500 }}>
          {dateStr}
        </p>
      </div>

      {/* ── Next Appointment Card ── */}
      <div style={{
        padding: '24px', borderRadius: '16px',
        border: '1px solid rgba(154,110,86,0.1)',
        backgroundColor: 'var(--color-base)', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <CalendarDays size={16} color="var(--color-accent)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Next Appointment
          </span>
        </div>

        {nextAppointment ? (
          <>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                  {nextAppointment.doctorName}
                </p>
                <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '2px' }}>
                  {nextAppointment.specialty} • {nextAppointment.hospitalName}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <Clock size={14} color="var(--color-muted)" />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {nextAppointment.date === new Date().toISOString().split('T')[0] ? 'Today' : nextAppointment.date} at {nextAppointment.time}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
                  backgroundColor: nextAppointment.status === 'in_queue' || nextAppointment.status === 'called'
                    ? 'rgba(154,110,86,0.1)' : 'rgba(154,110,86,0.06)',
                  color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {nextAppointment.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Show live queue widget if in queue */}
            {(nextAppointment.status === 'in_queue' || nextAppointment.status === 'called') && (
              <QueueStatusWidget
                appointmentId={nextAppointment._id}
                compact={true}
              />
            )}
          </>
        ) : (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CalendarDays size={40} strokeWidth={1.2} color="var(--color-muted)" style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>
              No upcoming appointments
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '16px' }}>
              Book your first appointment and skip the waiting room.
            </p>
            <Link
              to="/app/search"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '999px',
                backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
                fontSize: '14px', fontWeight: 600, textDecoration: 'none',
              }}
            >
              <Search size={14} /> Find a doctor
            </Link>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <Link
          to="/app/search"
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '16px 20px', borderRadius: '12px',
            border: '1.5px solid rgba(154,110,86,0.12)',
            backgroundColor: 'var(--color-base)', textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
        >
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            backgroundColor: 'rgba(154,110,86,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Search size={18} color="var(--color-accent)" />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>Book appointment</p>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Find a doctor near you</p>
          </div>
        </Link>

        <Link
          to="/app/appointments"
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '16px 20px', borderRadius: '12px',
            border: '1.5px solid rgba(154,110,86,0.12)',
            backgroundColor: 'var(--color-base)', textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
        >
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            backgroundColor: 'rgba(154,110,86,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <CalendarDays size={18} color="var(--color-accent)" />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>My appointments</p>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>View upcoming & past</p>
          </div>
        </Link>
      </div>

      {/* ── Recent Activity ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
            Recent Activity
          </h2>
          <Link to="/app/notifications" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View all <ChevronRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map((n) => (
            <div
              key={n._id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '14px 16px', borderRadius: '12px',
                backgroundColor: n.read ? 'transparent' : 'rgba(154,110,86,0.04)',
                border: `1px solid ${n.read ? 'rgba(154,110,86,0.08)' : 'rgba(154,110,86,0.12)'}`,
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                backgroundColor: n.read ? 'rgba(154,110,86,0.06)' : 'rgba(154,110,86,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                marginTop: '2px',
              }}>
                {n.read ? <Bell size={14} color="var(--color-muted)" /> : <BellDot size={14} color="var(--color-accent)" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: n.read ? 500 : 600, color: 'var(--color-ink)', marginBottom: '2px' }}>
                  {n.title}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.body}
                </p>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {n.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
