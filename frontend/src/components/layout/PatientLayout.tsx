import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  CalendarDays,
  Bell,
  User,
  ChevronLeft,
  ChevronDown,

  Users,
  FileText,
  HelpCircle,
  Stethoscope,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePatientStore } from '@/store/patientStore';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown, DropdownOption } from '@/components/ui/Dropdown';
import { cn } from '@/lib/utils';

// ==========================================
// Data-driven nav config so pages 10–19 can plug in later
// ==========================================

export interface PatientNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  showInBottomBar?: boolean; // default false
  showInAvatarMenu?: boolean; // default false
}

export const patientNavConfig: PatientNavItem[] = [
  // Bottom bar items (pages 10-19 — TODO)
  { id: 'home', label: 'Home', path: '/app', icon: Home, showInBottomBar: true },
  { id: 'find', label: 'Find', path: '/app/search', icon: Search, showInBottomBar: true },
  { id: 'appointments', label: 'Appointments', path: '/app/appointments', icon: CalendarDays, showInBottomBar: true },
  { id: 'alerts', label: 'Alerts', path: '/app/notifications', icon: Bell, showInBottomBar: true },
  { id: 'profile', label: 'Profile', path: '/app/profile', icon: User, showInBottomBar: true, showInAvatarMenu: true },
  // Avatar menu items
  { id: 'family', label: 'Family members', path: '/app/family', icon: Users, showInAvatarMenu: true },
  { id: 'records', label: 'Visit history', path: '/app/records', icon: FileText, showInAvatarMenu: true },
  { id: 'help', label: 'Help', path: '/app/help', icon: HelpCircle, showInAvatarMenu: true },
];

const bottomBarItems = patientNavConfig.filter((i) => i.showInBottomBar);
const avatarMenuItems = patientNavConfig.filter((i) => i.showInAvatarMenu);

// Page title mapping
const pageTitles: Record<string, string> = {
  '/app': 'Home',
  '/app/search': 'Find a doctor',
  '/app/appointments': 'Appointments',
  '/app/notifications': 'Alerts',
  '/app/profile': 'Your profile',
  '/app/family': 'Family',
  '/app/records': 'Your records',
  '/app/help': 'Help',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Check for review route
  if (pathname.startsWith('/app/reviews/')) return 'Rate your visit';
  // Fallback for sub-routes
  for (const [route, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(route) && route !== '/app') return title;
  }
  return 'ChroniQ';
}

export const PatientLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, setRole } = useAuthStore();
  const patient = usePatientStore((s) => s.patient);
  const fetchPatientData = usePatientStore((s) => s.fetchPatientData);

  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(location.pathname);
  const isSubPage = !['/app', '/app/search', '/app/appointments', '/app/notifications', '/app/profile'].includes(location.pathname);

  // Fetch live patient data from backend
  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  // Close menus on route change
  useEffect(() => {
    setAvatarMenuOpen(false);
    setRoleSwitcherOpen(false);
  }, [location.pathname]);

  // Close avatar menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
        setRoleSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-switch to patient role when entering the patient portal
  useEffect(() => {
    if (currentRole !== 'patient') {
      setRole('patient');
    }
  }, [currentRole, setRole]);

  const handleRoleSwitch = (role: 'hospital_admin' | 'receptionist' | 'doctor' | 'patient') => {
    setRole(role);
    setRoleSwitcherOpen(false);
    setAvatarMenuOpen(false);
    if (role === 'doctor') navigate('/doctor');
    else if (role === 'patient') navigate('/app');
    else navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* ========== MOBILE TOP BAR (< 1024px) ========== */}
      <header className="lg:hidden sticky top-0 z-40 bg-base border-b border-ink/10">
        <div className="flex items-center justify-between h-14 px-4">
          {isSubPage ? (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-lg hover:bg-ink/5 transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-ink" strokeWidth={1.75} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="ChroniQ" className="w-7 h-7 object-contain" />
              <span className="text-base font-medium text-ink">ChroniQ</span>
            </div>
          )}

          <span className="text-sm font-medium text-ink truncate mx-4">
            {isSubPage ? pageTitle : ''}
          </span>

          <Dropdown
            align="right"
            width="w-56"
            options={[
              ...avatarMenuItems.map((item) => ({
                value: item.id,
                label: item.label,
                icon: <item.icon className="w-4 h-4" strokeWidth={1.75} />,
                onClick: () => navigate(item.path),
              })),
              {
                value: 'role_admin',
                label: 'Switch to Admin',
                icon: <ShieldCheck className="w-4 h-4 text-accent" />,
                divider: true,
                onClick: () => handleRoleSwitch('hospital_admin'),
              },
              {
                value: 'role_doctor',
                label: 'Switch to Doctor',
                icon: <Stethoscope className="w-4 h-4 text-accent" />,
                onClick: () => handleRoleSwitch('doctor'),
              },
            ]}
            renderTrigger={({ toggle, ref }) => (
              <button
                ref={ref}
                type="button"
                onClick={toggle}
                className="p-1 cursor-pointer rounded-full hover:ring-2 hover:ring-accent/40 transition-all"
                aria-label="Account menu"
              >
                <Avatar name={patient.name} size="sm" />
              </button>
            )}
          />
        </div>
      </header>

      {/* ========== DESKTOP TOP NAV (≥ 1024px) ========== */}
      <header className="hidden lg:block sticky top-0 z-40 bg-base border-b border-ink/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="ChroniQ" className="w-8 h-8 object-contain" />
            <span className="text-lg font-medium text-ink">ChroniQ</span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {bottomBarItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === '/app'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-ink'
                      : 'text-ink hover:bg-ink/5'
                  }`
                }
              >
                <item.icon className="w-4 h-4" strokeWidth={1.75} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop Avatar menu */}
          <Dropdown
            align="right"
            width="w-60"
            options={[
              ...avatarMenuItems.map((item) => ({
                value: item.id,
                label: item.label,
                icon: <item.icon className="w-4 h-4" strokeWidth={1.75} />,
                onClick: () => navigate(item.path),
              })),
              {
                value: 'role_admin',
                label: 'Switch to Admin',
                icon: <ShieldCheck className="w-4 h-4 text-accent" />,
                divider: true,
                onClick: () => handleRoleSwitch('hospital_admin'),
              },
              {
                value: 'role_doctor',
                label: 'Switch to Doctor',
                icon: <Stethoscope className="w-4 h-4 text-accent" />,
                onClick: () => handleRoleSwitch('doctor'),
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
                aria-label="Account menu"
              >
                <Avatar name={patient.name} size="sm" />
                <span className="text-xs font-semibold text-ink max-w-32 truncate">{patient.name}</span>
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

      {/* ========== MAIN CONTENT ========== */}
      <main className="flex-1 pb-20 lg:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </main>

      {/* ========== MOBILE BOTTOM TAB BAR (< 1024px) ========== */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-base border-t border-ink/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch justify-around" style={{ height: '64px' }}>
          {bottomBarItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/app'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <item.icon className="w-5 h-5" strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Toast container */}
      <ToastContainer />

      {/* Live announcement region for screen readers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
    </div>
  );
};
