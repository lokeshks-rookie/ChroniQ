import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
  RotateCcw,
  Menu,
  X,
  UserCheck,
  ChevronDown,
  Stethoscope,
  ExternalLink,
  Copy,
  Check,
  User,
  LogOut,
} from 'lucide-react';
import { getNavConfigForRole } from './navConfig';
import { DesktopSidebar } from './Sidebar';
import { useAuthStore } from '@/store/authStore';
import { useHospitalStore } from '@/store/hospitalStore';
import { useUiStore } from '@/store/uiStore';
import { getLiveClockIST } from '@/lib/time';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { Avatar } from '@/components/ui/Avatar';
import { DoctorAvailabilityChip } from '@/components/ui/StatusBadge';
import { TiltCard } from '@/components/ui/tilt-card';
import { Dropdown, DropdownOption } from '@/components/ui/Dropdown';
import { cn } from '@/lib/utils';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, currentDoctorId, setRole, setDoctorId, hasCapability, user, clearAuth } = useAuthStore();
  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };
  const {
    hospital,
    queue_entries,
    doctors,
    departments,
    getDoctorEffectiveStatus,
    resetDemoData,
    tickSimulation,
    fetchHospitalData,
  } = useHospitalStore();
  const { alerts, liveAnnouncement, addToast } = useUiStore();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [liveClock, setLiveClock] = useState(getLiveClockIST());
  const [displayPopoverOpen, setDisplayPopoverOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);


  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLink(text);
      addToast({ title: 'Link copied', description: `${title} copied to clipboard`, variant: 'success' });
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const currentDoctor = doctors.find((d) => d.id === (currentDoctorId || 'doc_card_2')) || doctors[0];
  const doctorDept = departments.find((dep) => dep.id === currentDoctor?.department_id);
  const effectiveStatus = getDoctorEffectiveStatus(currentDoctor?.id || '');

  // Calculate live waiting count (scoped if doctor)
  const waitingPatientsCount = currentRole === 'doctor'
    ? queue_entries.filter((q) => q.doctor_id === currentDoctor?.id && q.status === 'waiting').length
    : queue_entries.filter((q) => q.status === 'waiting').length;

  // Unread alerts (scoped if doctor)
  const unreadAlerts = alerts.filter(
    (a) => !a.dismissed && (currentRole !== 'doctor' || !a.doctor_id || a.doctor_id === currentDoctor?.id)
  );

  // Fetch live hospital data from backend on mount and role change
  useEffect(() => {
    fetchHospitalData();
  }, [currentRole]);

  // Ticker for clock and simulated queue movements
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveClock(getLiveClockIST());
      tickSimulation();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickSimulation]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
    setAlertsOpen(false);
    setRoleMenuOpen(false);
  }, [location.pathname]);

  const currentNavGroups = getNavConfigForRole(currentRole);

  const renderNavContent = () => (
    <div className="flex flex-col flex-1 min-h-0 text-base select-none" style={{ gap: 0 }}>
      <div className="space-y-6 flex-1">
        {/* Nav Groups */}
        <nav className="space-y-5 flex-1 pr-1">
          {currentNavGroups.map((group) => {
            const isSuper = currentRole === 'super_admin' || user?.role === 'super_admin';
            // Filter items by role capability and super-admin scope
            const visibleItems = group.items.filter((item) => {
              if (item.superAdminOnly && !isSuper) return false;
              return hasCapability(item.capability);
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.eyebrow} className="space-y-2">
                <div className="text-[10px] font-semibold tracking-widest text-base/40 uppercase px-3">
                  {group.eyebrow}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    if (item.openInNewTab) {
                      if (item.id === 'screen-display') {
                        return (
                          <div key={item.id} className="space-y-1">
                            <div className="flex items-center justify-between px-3 py-2.5 rounded-[10px] text-sm text-base/65 hover:text-base hover:bg-base/5 transition-colors font-medium">
                              <button
                                type="button"
                                onClick={() => setDisplayPopoverOpen((prev) => !prev)}
                                className="flex items-center gap-3 flex-1 text-left"
                              >
                                {item.icon && <item.icon size={17} strokeWidth={1.8} />}
                                <span>{item.label}</span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 ml-auto transition-transform ${
                                    displayPopoverOpen ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                              <button
                                type="button"
                                title="Copy link to All departments display"
                                onClick={() =>
                                  copyToClipboard(
                                    `${window.location.origin}/display/${hospital.id}/all`,
                                    'Display board link'
                                  )
                                }
                                className="p-1 rounded-full text-base/60 hover:text-base hover:bg-base/10 ml-1"
                              >
                                {copiedLink === `${window.location.origin}/display/${hospital.id}/all` ? (
                                  <Check className="w-3.5 h-3.5 text-accent" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {displayPopoverOpen && (
                              <div className="ml-4 p-2 rounded-card bg-base/5 border border-base/10 space-y-1 text-xs">
                                <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-base/10">
                                  <a
                                    href={`/display/${hospital.id}/all`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-base hover:underline flex-1 truncate"
                                  >
                                    <span>All departments</span>
                                    <ExternalLink className="w-3 h-3 text-base/60 shrink-0" />
                                  </a>
                                  <button
                                    type="button"
                                    title="Copy link"
                                    onClick={() =>
                                      copyToClipboard(
                                        `${window.location.origin}/display/${hospital.id}/all`,
                                        'All departments display link'
                                      )
                                    }
                                    className="p-1 text-base/60 hover:text-base"
                                  >
                                    {copiedLink === `${window.location.origin}/display/${hospital.id}/all` ? (
                                      <Check className="w-3 h-3 text-accent" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                {departments.map((dep) => (
                                  <div
                                    key={dep.id}
                                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-base/10"
                                  >
                                    <a
                                      href={`/display/${hospital.id}/${dep.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 text-base/80 hover:text-base hover:underline flex-1 truncate"
                                    >
                                      <span className="truncate">{dep.name}</span>
                                      <ExternalLink className="w-3 h-3 text-base/60 shrink-0" />
                                    </a>
                                    <button
                                      type="button"
                                      title={`Copy link for ${dep.name}`}
                                      onClick={() =>
                                        copyToClipboard(
                                          `${window.location.origin}/display/${hospital.id}/${dep.id}`,
                                          `${dep.name} display link`
                                        )
                                      }
                                      className="p-1 text-base/60 hover:text-base"
                                    >
                                      {copiedLink === `${window.location.origin}/display/${hospital.id}/${dep.id}` ? (
                                        <Check className="w-3 h-3 text-accent" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Kiosk link
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-3 py-2.5 rounded-[10px] text-sm text-base/65 hover:text-base hover:bg-base/5 transition-colors font-medium"
                        >
                          <a
                            href={`/checkin/${hospital.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 flex-1"
                          >
                            {item.icon && <item.icon size={17} strokeWidth={1.8} />}
                            <span>{item.label}</span>
                            <ExternalLink className="w-3.5 h-3.5 ml-1 text-base/50" />
                          </a>
                          <button
                            type="button"
                            title="Copy kiosk link"
                            onClick={() =>
                              copyToClipboard(
                                `${window.location.origin}/checkin/${hospital.id}`,
                                'Kiosk check-in link'
                              )
                            }
                            className="p-1 rounded-full text-base/60 hover:text-base hover:bg-base/10 ml-1"
                          >
                            {copiedLink === `${window.location.origin}/checkin/${hospital.id}` ? (
                              <Check className="w-3.5 h-3.5 text-accent" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      );
                    }

                    const isExact = item.path === '/admin' || item.path === '/doctor';
                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        end={isExact}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2.5 rounded-[10px] text-sm transition-colors relative ${
                            isActive
                              ? 'bg-base/10 text-base font-semibold'
                              : 'text-base/65 hover:text-base hover:bg-base/5 font-medium'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3">
                              {item.icon && <item.icon size={17} strokeWidth={1.8} />}
                              <span>{item.label}</span>
                            </div>

                            {item.showQueueCount && waitingPatientsCount > 0 && (
                              <span
                                className={`text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center absolute right-3 ${
                                  isActive ? 'bg-accent text-ink' : 'bg-accent text-ink'
                                }`}
                              >
                                {waitingPatientsCount}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {currentRole === 'doctor' && currentDoctor && (
        <div className="pt-4 border-t border-base/10">
          <div className="p-3 rounded-card bg-base/5 border border-base/10 space-y-2">
            <div className="flex items-center gap-2.5">
              <Avatar name={currentDoctor.name} photoUrl={currentDoctor.photo_url} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-base truncate">{currentDoctor.name}</div>
                <div className="text-[11px] text-base/60 truncate">
                  {doctorDept?.name} • {currentDoctor.room}
                </div>
              </div>
            </div>
            <div className="pt-1.5 border-t border-base/10 flex items-center justify-between text-xs">
              <span className="text-[10px] text-base/50 uppercase tracking-wider font-semibold">Status</span>
              <div className="scale-90 origin-right">
                <DoctorAvailabilityChip
                  status={effectiveStatus.status}
                  lateMinutes={effectiveStatus.lateMinutes}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-base text-ink flex antialiased">
      {/* Accessible screen reader announcement region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

        {/* Desktop Sidebar — uses shared DesktopSidebar shell */}
        <DesktopSidebar
          title="CHRONIQ"
          headerBadge={
            <span
              className="text-[11px] uppercase font-semibold tracking-wider shrink-0"
              style={{ color: 'var(--color-ink-light, rgba(253, 249, 240, 0.75))' }}
            >
              {currentRole === 'doctor'
                ? 'Doctor'
                : currentRole === 'receptionist'
                ? 'Reception'
                : currentRole === 'super_admin'
                ? 'Super Admin'
                : 'Admin'}
            </span>
          }
          onLogout={handleLogout}
        >
          {renderNavContent()}
        </DesktopSidebar>

        {/* Mobile / Tablet Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-ink/60 transition-opacity backdrop-blur-[1px]"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative w-[280px] bg-ink text-base h-full shadow-2xl flex flex-col z-10 p-4">
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1.5 text-base/70 hover:text-base cursor-pointer"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto mt-6">
                {renderNavContent()}
              </div>
              <div className="pt-3 mt-auto border-t border-base/10">
                {user?.name && (
                  <p className="text-xs text-base/40 px-3 pb-2 truncate">{user.name}</p>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-sm font-medium text-base/65 hover:text-base hover:bg-base/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Topbar (base, hairline bottom border) */}
          <header className="h-16 bg-base border-b border-ink/10 flex-shrink-0 z-40 px-4 md:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2 rounded-lg text-ink hover:bg-ink/5 cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="lg:hidden flex items-center gap-2">
                <img src="/logo.png" alt="ChroniQ Logo" className="w-6 h-6 object-contain" />
              </div>

              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-ink/75 font-mono">
                  <Clock className="w-3.5 h-3.5 text-ink/60" />
                  <span>{liveClock}</span>
                </div>
              </div>
            </div>

            {/* Right Topbar Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Alerts Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAlertsOpen(!alertsOpen)}
                  className="relative p-2 rounded-full border border-ink/15 text-ink hover:bg-ink/5 transition-colors cursor-pointer"
                  aria-label="View live alerts"
                >
                  <Bell className="w-4 h-4" />
                  {unreadAlerts.length > 0 && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-danger border-2 border-base" />
                  )}
                </button>

                {/* Alerts Popover */}
                {alertsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setAlertsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-base border border-ink/15 rounded-card shadow-2xl p-4 z-50 space-y-3">
                      <div className="flex items-center justify-between border-b border-ink/10 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-ink">
                          Live alerts ({unreadAlerts.length})
                        </span>
                        <span className="text-[11px] text-ink/60">Updated real-time</span>
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-2.5">
                        {unreadAlerts.length === 0 ? (
                          <div className="text-xs text-ink/60 py-4 text-center">
                            No active warnings or advisories.
                          </div>
                        ) : (
                          unreadAlerts.map((alert) => (
                            <TiltCard
                              key={alert.id}
                              tiltLimit={8}
                              scale={1.02}
                              perspective={800}
                              className="p-3 rounded-lg border border-ink/10 bg-base space-y-1.5 text-xs shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-ink">{alert.title}</span>
                                <span className="text-[10px] text-ink/60">{alert.time}</span>
                              </div>
                              <p className="text-ink/80 leading-relaxed">{alert.message}</p>
                              {alert.actionUrl && (
                                <a
                                  href={alert.actionUrl}
                                  onClick={() => setAlertsOpen(false)}
                                  className="inline-block font-semibold text-accent hover:underline pt-1"
                                >
                                  {alert.actionLabel || 'View'} →
                                </a>
                              )}
                            </TiltCard>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User / Demo Role Switcher */}
              <div className="flex items-center gap-2">
                {currentRole === 'doctor' && (
                  <Dropdown
                    value={currentDoctorId || 'doc_card_2'}
                    onChange={(val) => {
                      setDoctorId(val);
                      setRole('doctor', val);
                    }}
                    options={doctors.map((d) => ({
                      value: d.id,
                      label: d.name,
                      sublabel: departments.find((dep) => dep.id === d.department_id)?.name || 'General',
                    }))}
                    width="w-64"
                    align="right"
                    triggerClassName="text-xs h-8"
                  />
                )}

                <Dropdown
                  value={currentRole}
                  align="right"
                  width="w-64"
                  options={[
                    {
                      value: 'hospital_admin',
                      label: 'Hospital Admin',
                      sublabel: 'Operations & Management',
                      icon: <UserCheck className="w-3.5 h-3.5" />,
                      onClick: () => {
                        setRole('hospital_admin');
                        navigate('/admin');
                      },
                    },
                    {
                      value: 'receptionist',
                      label: 'Receptionist',
                      sublabel: 'Desk & Check-in',
                      icon: <UserCheck className="w-3.5 h-3.5" />,
                      onClick: () => {
                        setRole('receptionist');
                        navigate('/admin');
                      },
                    },
                    {
                      value: 'doctor',
                      label: 'Doctor (Specialist)',
                      sublabel: currentDoctor?.name || 'Specialist Queue',
                      icon: <Stethoscope className="w-3.5 h-3.5" />,
                      onClick: () => {
                        setRole('doctor', currentDoctorId || 'doc_card_2');
                        navigate('/doctor');
                      },
                    },
                    {
                      value: 'patient',
                      label: 'Patient (Portal)',
                      sublabel: 'Consumer Experience',
                      icon: <User className="w-3.5 h-3.5" />,
                      onClick: () => {
                        setRole('patient');
                        navigate('/app/profile');
                      },
                    },
                    {
                      value: 'reset',
                      label: 'Reset demo data',
                      icon: <RotateCcw className="w-3.5 h-3.5" />,
                      destructive: true,
                      divider: true,
                      onClick: () => {
                        resetDemoData();
                      },
                    },
                  ]}
                  renderTrigger={({ toggle, isOpen, ref }) => (
                    <button
                      ref={ref}
                      type="button"
                      onClick={toggle}
                      className={cn(
                        'h-8 px-2.5 rounded-full text-xs font-medium inline-flex items-center gap-2 transition-all duration-150 cursor-pointer select-none',
                        'bg-base text-ink border border-ink/15 hover:border-accent/40 hover:bg-cream/10',
                        isOpen && 'border-accent/50 bg-cream/15 ring-2 ring-accent/20',
                        'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent/30'
                      )}
                    >
                      <div className="w-5 h-5 rounded-full bg-cream text-ink flex items-center justify-center font-bold text-[9px] shrink-0">
                        {currentRole === 'doctor' ? 'DR' : currentRole === 'hospital_admin' ? 'HA' : 'RC'}
                      </div>
                      <div className="hidden sm:block text-left">
                        <div className="font-medium truncate max-w-[120px] leading-tight">
                          {currentRole === 'doctor'
                            ? (currentDoctor?.name || 'Doctor')
                            : currentRole === 'hospital_admin'
                            ? 'Admin'
                            : 'Reception'}
                        </div>
                      </div>
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
            </div>
          </header>

          {/* Page Body Viewport with independent scroll */}
          <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
            <div className="max-w-[1440px] w-full mx-auto">
              <Outlet />
            </div>
          </main>
        </div>

      {/* Global Floating Toast Stack */}
      <ToastContainer />
    </div>
  );
};
