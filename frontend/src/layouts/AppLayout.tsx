import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Search, CalendarDays, Bell, User, Users, FileText,
  HelpCircle, LogOut, Menu, X, ChevronDown, MoreHorizontal
} from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { DesktopSidebar } from '@/components/layout/Sidebar';
import { useNotificationsStore } from '@/store/notificationsStore';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app' },
  { icon: Search, label: 'Find a Doctor', href: '/app/search' },
  { icon: CalendarDays, label: 'Appointments', href: '/app/appointments' },
  { icon: Bell, label: 'Notifications', href: '/app/notifications' },
  { icon: Users, label: 'Family', href: '/app/family' },
  { icon: FileText, label: 'Records', href: '/app/records' },
  { icon: User, label: 'Profile', href: '/app/profile' },
  { icon: HelpCircle, label: 'Help', href: '/app/help' },
];

// Bottom tab bar shows these 5 primary items on mobile
const BOTTOM_NAV = [
  { icon: LayoutDashboard, label: 'Home', href: '/app' },
  { icon: Search, label: 'Search', href: '/app/search' },
  { icon: CalendarDays, label: 'Appts', href: '/app/appointments' },
  { icon: Bell, label: 'Alerts', href: '/app/notifications' },
  { icon: MoreHorizontal, label: 'More', href: '__more__' },
];

export default function AppLayout() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const { unreadCount, startPolling } = useNotificationsStore();

  useEffect(() => {
    const cleanup = startPolling();
    return cleanup;
  }, [startPolling]);

  // Close menus on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setUserMenuOpen(false);
    setMoreMenuOpen(false);
  }, [location.pathname]);

  // Route guard: redirect unauthenticated users
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isActive = (href: string) =>
    href === '/app' ? location.pathname === '/app' : location.pathname.startsWith(href);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--color-base)' }}>
      <DesktopSidebar
        navItems={NAV.map(n => ({ ...n, badge: n.label === 'Notifications' ? unreadCount : 0 }))}
        isActive={isActive}
        onLogout={handleLogout}
      />

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* ── Top Bar ── */}
        <header style={{
          height: '64px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 24px',
          borderBottom: '1px solid rgba(154,110,86,0.1)',
          backgroundColor: 'var(--color-base)', position: 'sticky', top: 0, zIndex: 40,
        }}>
          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center rounded-lg cursor-pointer text-ink"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            style={{
              width: '40px', height: '40px',
              border: 'none', backgroundColor: 'transparent',
            }}
          >
            {mobileDrawerOpen ? <X size={22} /> : <Menu size={22} />}
          </button>


          {/* Spacer for desktop */}
          <div className="hidden md:block" style={{ flex: 1 }} />

          {/* Right side: notification bell + user avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              to="/app/notifications"
              style={{
                width: '40px', height: '40px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'transparent', border: 'none', position: 'relative',
                color: 'var(--color-ink)', textDecoration: 'none',
              }}
            >
              <Bell size={20} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '6px', right: '6px',
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: 'var(--color-accent)',
                }} />
              )}
            </Link>

            {/* User dropdown */}
            <Dropdown
              align="right"
              width="w-48"
              options={[
                {
                  value: 'profile',
                  label: 'Profile',
                  icon: <User size={16} />,
                  onClick: () => navigate('/app/profile'),
                },
                {
                  value: 'logout',
                  label: 'Log out',
                  icon: <LogOut size={16} />,
                  destructive: true,
                  divider: true,
                  onClick: handleLogout,
                },
              ]}
              renderTrigger={({ toggle, isOpen, ref }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={toggle}
                  className={cn(
                    'h-8 px-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 transition-all duration-150 cursor-pointer select-none',
                    'bg-base text-ink border border-ink/15 hover:border-accent/40 hover:bg-cream/10',
                    isOpen && 'border-accent/50 bg-cream/15 ring-2 ring-accent/20',
                    'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent/30'
                  )}
                >
                  <span className="w-5 h-5 rounded-full bg-ink text-base flex items-center justify-center text-[10px] font-bold shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <span className="hidden sm:inline text-xs font-semibold">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown
                    size={14}
                    strokeWidth={2}
                    className={cn(
                      'text-muted transition-transform duration-200',
                      isOpen && 'rotate-180 text-accent'
                    )}
                  />
                </button>
              )}
            />
          </div>
        </header>

        {/* ── Mobile Drawer Overlay ── */}
        {mobileDrawerOpen && (
          <div
            className="md:hidden"
            style={{
              position: 'fixed', inset: 0, top: '64px', zIndex: 35,
              backgroundColor: 'rgba(25,8,1,0.3)', backdropFilter: 'blur(4px)',
            }}
            onClick={() => setMobileDrawerOpen(false)}
          >
            <nav
              style={{
                width: '280px', height: '100%', backgroundColor: 'var(--color-ink)',
                padding: '16px 12px', overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {NAV.map(({ icon: Icon, label, href }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    to={href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px', borderRadius: '10px',
                      fontSize: '15px', fontWeight: active ? 600 : 500,
                      color: active ? 'var(--color-base)' : 'rgba(253,249,240,0.65)',
                      backgroundColor: active ? 'rgba(253,249,240,0.1)' : 'transparent',
                      textDecoration: 'none', marginBottom: '2px',
                    }}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* ── Page Content ── */}
        <main style={{ flex: 1, minHeight: 0, padding: '20px 24px', paddingBottom: '96px', overflowY: 'auto' }}>
          <Outlet />
        </main>

      </div>
    </div>
  );
}
