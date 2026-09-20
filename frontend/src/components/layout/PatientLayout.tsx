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

          <div className="relative" ref={avatarMenuRef}>
            <button
              onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              className="p-1 cursor-pointer"
              aria-label="Account menu"
            >
              <Avatar name={patient.name} size="sm" />
            </button>

            {avatarMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-base border border-ink/15 rounded-card shadow-xl z-50 py-2">
                <div className="px-4 py-2 border-b border-ink/10">
                  <p className="text-sm font-medium text-ink">{patient.name}</p>
                  <p className="text-xs text-muted">{patient.phone}</p>
                </div>
                {avatarMenuItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-ink/5 transition-colors"
                    onClick={() => setAvatarMenuOpen(false)}
                  >
                    <item.icon className="w-4 h-4 text-muted" strokeWidth={1.75} />
                    {item.label}
                  </NavLink>
                ))}
                <div className="border-t border-ink/10 mt-1 pt-1">
                  <button
                    onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-ink/5 transition-colors w-full cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-muted" strokeWidth={1.75} />
                    Demo role
                    <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${roleSwitcherOpen ? 'rotate-180' : ''}`} strokeWidth={1.75} />
                  </button>
                  {roleSwitcherOpen && (
                    <div className="mx-2 mb-1 bg-ink/5 rounded-lg overflow-hidden">
                      {(['hospital_admin', 'receptionist', 'doctor', 'patient'] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleSwitch(role)}
                          className={`flex items-center gap-2 px-3 py-2 text-xs w-full hover:bg-ink/10 transition-colors cursor-pointer ${
                            currentRole === role ? 'text-accent font-semibold' : 'text-ink'
                          }`}
                        >
                          {role === 'hospital_admin' && <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />}
                          {role === 'receptionist' && <User className="w-3.5 h-3.5" strokeWidth={1.75} />}
                          {role === 'doctor' && <Stethoscope className="w-3.5 h-3.5" strokeWidth={1.75} />}
                          {role === 'patient' && <User className="w-3.5 h-3.5" strokeWidth={1.75} />}
                          {{
                            hospital_admin: 'Hospital admin',
                            receptionist: 'Receptionist',
                            doctor: 'Doctor',
                            patient: 'Patient',
                          }[role]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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

          {/* Avatar menu */}
          <div className="relative" ref={avatarMenuRef}>
            <button
              onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-ink/5 transition-colors cursor-pointer"
              aria-label="Account menu"
            >
              <Avatar name={patient.name} size="sm" />
              <span className="text-sm font-medium text-ink max-w-32 truncate">{patient.name}</span>
              <ChevronDown className={`w-4 h-4 text-muted transition-transform ${avatarMenuOpen ? 'rotate-180' : ''}`} strokeWidth={1.75} />
            </button>

            {avatarMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-base border border-ink/15 rounded-card shadow-xl z-50 py-2">
                <div className="px-4 py-2 border-b border-ink/10">
                  <p className="text-sm font-medium text-ink">{patient.name}</p>
                  <p className="text-xs text-muted">{patient.email || patient.phone}</p>
                </div>
                {avatarMenuItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        isActive ? 'text-accent font-medium' : 'text-ink hover:bg-ink/5'
                      }`
                    }
                    onClick={() => setAvatarMenuOpen(false)}
                  >
                    <item.icon className="w-4 h-4" strokeWidth={1.75} />
                    {item.label}
                  </NavLink>
                ))}
                <div className="border-t border-ink/10 mt-1 pt-1">
                  <button
                    onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-ink/5 transition-colors w-full cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-muted" strokeWidth={1.75} />
                    Demo role
                    <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${roleSwitcherOpen ? 'rotate-180' : ''}`} strokeWidth={1.75} />
                  </button>
                  {roleSwitcherOpen && (
                    <div className="mx-2 mb-1 bg-ink/5 rounded-lg overflow-hidden">
                      {(['hospital_admin', 'receptionist', 'doctor', 'patient'] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleSwitch(role)}
                          className={`flex items-center gap-2 px-3 py-2 text-xs w-full hover:bg-ink/10 transition-colors cursor-pointer ${
                            currentRole === role ? 'text-accent font-semibold' : 'text-ink'
                          }`}
                        >
                          {role === 'hospital_admin' && <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />}
                          {role === 'receptionist' && <User className="w-3.5 h-3.5" strokeWidth={1.75} />}
                          {role === 'doctor' && <Stethoscope className="w-3.5 h-3.5" strokeWidth={1.75} />}
                          {role === 'patient' && <User className="w-3.5 h-3.5" strokeWidth={1.75} />}
                          {{
                            hospital_admin: 'Hospital admin',
                            receptionist: 'Receptionist',
                            doctor: 'Doctor',
                            patient: 'Patient',
                          }[role]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
