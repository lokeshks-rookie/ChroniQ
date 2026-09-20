import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Bell, Activity, Info, CheckCheck } from 'lucide-react';
import { useNotificationsStore } from '@/store/notificationsStore';
import type { MockNotification } from '@/data/mockData';

export default function NotificationsPage() {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } = useNotificationsStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = (notif: MockNotification) => {
    if (!notif.read) {
      markAsRead(notif._id);
    }
    
    // Navigate based on type
    if (notif.type === 'queue_update' || notif.type === 'general') { // treating general as queue update for demo if it had a token, but mostly queue_update goes to tracker
      // Since mock notification doesn't have an appointment ID directly, we'll route to dashboard for demo if missing,
      // or to the first active appointment if it was real. We'll use a placeholder or route to a known ID for demo.
      // In a real app, notif.appointmentId would exist.
      navigate('/app/queue/apt-001'); 
    } else if (notif.type === 'booking_confirmed' || notif.type === 'reminder') {
      navigate('/app/appointments/apt-002');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed': return <CheckCircle2 size={20} color="var(--color-success)" />;
      case 'reminder': return <Bell size={20} color="var(--color-accent)" />;
      case 'queue_update': return <Activity size={20} color="var(--color-ink)" />;
      case 'general': return <Info size={20} color="var(--color-muted)" />;
      default: return <Bell size={20} color="var(--color-muted)" />;
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '80px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Notifications
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', fontWeight: 500 }}>
            Stay updated on your appointments and queue status.
          </p>
        </div>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px',
              backgroundColor: 'var(--color-surface)', border: '1px solid rgba(154,110,86,0.2)',
              color: 'var(--color-ink)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            <CheckCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-surface)', borderRadius: '24px', border: '1px dashed rgba(154,110,86,0.2)' }}>
            <Bell size={48} strokeWidth={1.2} color="var(--color-muted)" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
              No notifications yet
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>
              We'll let you know when there are updates.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif._id} 
              onClick={() => handleNotificationClick(notif)}
              style={{
                display: 'flex', gap: '16px', padding: '20px', borderRadius: '16px',
                backgroundColor: notif.read ? 'transparent' : 'var(--color-base)',
                border: notif.read ? '1px solid transparent' : '1px solid rgba(154,110,86,0.15)',
                boxShadow: notif.read ? 'none' : '0 4px 20px rgba(25,8,1,0.02)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden'
              }}
            >
              {!notif.read && (
                <div style={{ position: 'absolute', top: '24px', left: '12px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
              )}
              
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: notif.read ? '0' : '8px'
              }}>
                {getIcon(notif.type)}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)' }}>{notif.title}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{notif.time}</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
                  {notif.body}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
