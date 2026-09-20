import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Activity, UserCog,
  Building2, Users, BarChart2, Settings, Bell, LogOut, ClipboardCheck, DoorOpen
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { DesktopSidebar } from '@/components/layout/Sidebar';

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
  const location = useLocation();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#F5F0E8' }}>
      <DesktopSidebar
        navItems={NAV}
        isActive={(href) => href === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(href)}
        onLogout={() => { clearAuth(); navigate('/'); }}
        subtitle="Hospital Admin"
      />

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
