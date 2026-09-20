import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Activity, UserCog,
  Building2, Users, BarChart2, Settings, Bell, LogOut, ClipboardCheck, DoorOpen
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: CalendarDays, label: 'Appointments', href: '/admin/appointments' },
  { icon: Activity, label: 'Live Queue', href: '/admin/queue' },
  { icon: ClipboardCheck, label: 'Check-in', href: '/admin/checkin' },
  { icon: DoorOpen, label: 'Walk-in', href: '/admin/walk-in' },
  { icon: UserCog, label: 'Doctors', href: '/admin/doctors' },
  { icon: Building2, label: 'Departments', href: '/admin/departments' },
  { icon: Users, label: 'Patients', href: '/admin/patients' },
  { icon: BarChart2, label: 'Reports', href: '/admin/reports' },
  { icon: Bell, label: 'Broadcasts', href: '/admin/notifications' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function AdminLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F0E8' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '256px',
          flexShrink: 0,
          backgroundColor: 'var(--color-ink)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 12px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
        className="hidden md:flex"
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 8px',
            marginBottom: '8px',
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="6.5" y="2" width="3" height="12" rx="1.5" fill="#FDF9F0" />
              <rect x="2" y="6.5" width="12" height="3" rx="1.5" fill="#FDF9F0" />
            </svg>
          </span>
          <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--color-base)', letterSpacing: '-0.02em' }}>
            ChroniQ
          </span>
        </Link>
        <p
          style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(253,249,240,0.3)',
            padding: '0 12px',
            marginBottom: '20px',
          }}
        >
          Hospital Admin
        </p>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              to={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 500,
                color: 'rgba(253,249,240,0.65)',
                textDecoration: 'none',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.backgroundColor = 'rgba(253,249,240,0.08)';
                el.style.color = 'var(--color-base)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.backgroundColor = 'transparent';
                el.style.color = 'rgba(253,249,240,0.65)';
              }}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(253,249,240,0.08)' }}>
          <p style={{ fontSize: '12px', color: 'rgba(253,249,240,0.45)', padding: '0 12px 12px' }}>
            {user?.name}
          </p>
          <button
            onClick={() => { clearAuth(); navigate('/'); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '10px',
              fontSize: '13.5px',
              fontWeight: 500,
              color: 'rgba(253,249,240,0.5)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <LogOut size={16} strokeWidth={1.8} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}
