import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
  Play,
  Pause,
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
} from 'lucide-react';
import { getNavConfigForRole } from './navConfig';
import { useAuthStore } from '@/store/authStore';
import { useHospitalStore } from '@/store/hospitalStore';
import { useUiStore } from '@/store/uiStore';
import { getLiveClockIST } from '@/lib/time';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { Avatar } from '@/components/ui/Avatar';
import { DoctorAvailabilityChip } from '@/components/ui/StatusBadge';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, currentDoctorId, setRole, setDoctorId, hasCapability } = useAuthStore();
  const {
    hospital,
    queue_entries,
    doctors,
    departments,
    getDoctorEffectiveStatus,
    isSimulationPaused,
    toggleSimulation,
    resetDemoData,
    tickSimulation,
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
    <div className="flex flex-col h-full justify-between p-6 text-base select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="pb-4 border-b border-base/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="ChroniQ Logo"
                className="w-8 h-8 object-contain shrink-0"
              />
              <span className="text-2xl font-semibold tracking-tight text-base font-sans">
                ChroniQ
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-accent text-ink">
              {currentRole === 'doctor' ? 'Doctor' : currentRole === 'receptionist' ? 'Reception' : 'Admin'}
            </span>
          </div>
          <div className="text-xs text-base/70 mt-1 truncate">{hospital.name}</div>
        </div>

        {/* Nav Groups */}
        <nav className="space-y-6 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
          {currentNavGroups.map((group) => {
            // Filter items by role capability
            const visibleItems = group.items.filter((item) => hasCapability(item.capability));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.eyebrow} className="space-y-2">
                <div className="text-[11px] font-semibold tracking-wider text-base/40 uppercase px-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-base/40 inline-block" />
                  <span>{group.eyebrow}</span>
                </div>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    if (item.openInNewTab) {
                      if (item.id === 'screen-display') {
                        return (
                          <div key={item.id} className="space-y-1">
                            <div className="flex items-center justify-between px-3 py-2 rounded-full text-sm text-base/80 hover:text-base hover:bg-base/5 transition-colors">
                              <button
                                type="button"
                                onClick={() => setDisplayPopoverOpen((prev) => !prev)}
                                className="flex items-center gap-2.5 flex-1 text-left"
                              >
                                <span className="w-1.5 h-1.5 shrink-0 bg-base/60" />
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
                              <div className="ml-4 p-2 rounded-card bg-base/10 border border-base/15 space-y-1 text-xs">
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
                          className="flex items-center justify-between px-3 py-2 rounded-full text-sm text-base/80 hover:text-base hover:bg-base/5 transition-colors"
                        >
                          <a
                            href={`/checkin/${hospital.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 flex-1"
                          >
                            <span className="w-1.5 h-1.5 shrink-0 bg-base/60" />
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
                          `flex items-center justify-between px-3 py-2 rounded-full text-sm transition-colors ${
                            isActive
                              ? 'bg-accent text-ink font-semibold'
                              : 'text-base/80 hover:text-base hover:bg-base/5 font-normal'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-1.5 h-1.5 shrink-0 transition-colors ${
                                  isActive ? 'bg-ink' : 'bg-base/60'
                                }`}
                              />
                              <span>{item.label}</span>
                            </div>

                            {item.showQueueCount && waitingPatientsCount > 0 && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-bold tabular-nums ${
                                  isActive ? 'bg-ink text-base' : 'bg-accent text-ink'
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

      <div className="space-y-3 pt-4 border-t border-base/10">
        {/* Doctor Card at bottom of sidebar (Section 4.4 requirement 3) */}
        {currentRole === 'doctor' && currentDoctor && (
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
        )}

        {/* Hospital status footnote */}
        <div className="text-xs text-base/60 space-y-1">
          <div className="flex items-center justify-between">
            <span>OPD Timings</span>
            <span className="font-mono text-base/90">{hospital.timings}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Simulation</span>
            <span className={isSimulationPaused ? 'text-accent' : 'text-success'}>
              {isSimulationPaused ? 'Paused' : 'Active (1s)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-base text-ink flex flex-col antialiased">
      {/* Accessible screen reader announcement region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      <div className="flex flex-1 min-h-screen">
        {/* Desktop Sidebar (ink, 264px) */}
        <aside className="hidden lg:flex w-[264px] bg-ink text-base shrink-0 flex-col border-r border-ink/20 sticky top-0 h-screen z-30">
          {renderNavContent()}
        </aside>

        {/* Mobile / Tablet Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-ink/60 transition-opacity backdrop-blur-[1px]"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative w-[280px] bg-ink text-base h-full shadow-2xl flex flex-col z-10">
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
              {renderNavContent()}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar (base, hairline bottom border) */}
          <header className="h-16 bg-base border-b border-ink/10 sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between gap-4">
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
                <span className="font-semibold text-base tracking-tight text-ink">ChroniQ</span>
              </div>

              <div className="hidden sm:flex items-center gap-3">
                <LiveIndicator label="Live system" />
                <span className="text-ink/20">•</span>
                <div className="flex items-center gap-1.5 text-xs text-ink/75 font-mono">
                  <Clock className="w-3.5 h-3.5 text-ink/60" />
                  <span>{liveClock}</span>
                </div>
              </div>
            </div>

            {/* Right Topbar Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Simulation Pause Toggle */}
              <button
                type="button"
                onClick={toggleSimulation}
                title={isSimulationPaused ? 'Resume real-time simulation' : 'Pause real-time simulation'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-ink/15 text-xs font-medium text-ink hover:bg-ink/5 transition-colors cursor-pointer"
              >
                {isSimulationPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-success fill-success" />
                    <span className="hidden md:inline">Resume demo</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-accent fill-accent" />
                    <span className="hidden md:inline">Pause demo</span>
                  </>
                )}
              </button>

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
                            <div
                              key={alert.id}
                              className="p-3 rounded-lg border border-ink/10 bg-base space-y-1.5 text-xs"
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
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User / Demo Role Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-ink/15 hover:bg-ink/5 transition-colors cursor-pointer text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-cream text-ink flex items-center justify-center font-bold text-[10px]">
                    {currentRole === 'doctor' ? 'DR' : currentRole === 'hospital_admin' ? 'HA' : 'RC'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="font-medium text-ink leading-tight">
                      {currentRole === 'doctor'
                        ? (currentDoctor?.name || 'Doctor')
                        : currentRole === 'hospital_admin'
                        ? 'Admin'
                        : 'Reception'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-ink/60" />
                </button>

                {roleMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setRoleMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-base border border-ink/15 rounded-card shadow-2xl p-2 z-50 space-y-1 text-xs">
                      <div className="px-3 py-2 border-b border-ink/10">
                        <div className="font-semibold text-ink">Demo Role Switcher</div>
                        <div className="text-[11px] text-ink/60">Test role-scoped navigation</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setRole('hospital_admin');
                          setRoleMenuOpen(false);
                          navigate('/admin');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left cursor-pointer ${
                          currentRole === 'hospital_admin' ? 'bg-ink/5 font-semibold text-ink' : 'text-ink/80 hover:bg-ink/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-ink" />
                          <span>Hospital Admin</span>
                        </div>
                        {currentRole === 'hospital_admin' && <span className="text-[10px] text-accent font-bold">ACTIVE</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRole('receptionist');
                          setRoleMenuOpen(false);
                          navigate('/admin');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left cursor-pointer ${
                          currentRole === 'receptionist' ? 'bg-ink/5 font-semibold text-ink' : 'text-ink/80 hover:bg-ink/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-ink" />
                          <span>Receptionist</span>
                        </div>
                        {currentRole === 'receptionist' && <span className="text-[10px] text-accent font-bold">ACTIVE</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRole('doctor', currentDoctorId || 'doc_card_2');
                          setRoleMenuOpen(false);
                          navigate('/doctor');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left cursor-pointer ${
                          currentRole === 'doctor' ? 'bg-ink/5 font-semibold text-ink' : 'text-ink/80 hover:bg-ink/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-3.5 h-3.5 text-ink" />
                          <span>Doctor (Specialist View)</span>
                        </div>
                        {currentRole === 'doctor' && <span className="text-[10px] text-accent font-bold">ACTIVE</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRole('patient');
                          setRoleMenuOpen(false);
                          navigate('/app/profile');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left cursor-pointer ${
                          currentRole === 'patient' ? 'bg-ink/5 font-semibold text-ink' : 'text-ink/80 hover:bg-ink/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-ink" />
                          <span>Patient (Patient Portal)</span>
                        </div>
                        {currentRole === 'patient' && <span className="text-[10px] text-accent font-bold">ACTIVE</span>}
                      </button>

                      {/* When in Doctor mode, allow picking doctor */}
                      {currentRole === 'doctor' && (
                        <div className="pt-2 px-2 pb-1 border-t border-ink/10 space-y-1">
                          <div className="text-[10px] uppercase font-bold text-ink/60">Active Specialist</div>
                          <select
                            value={currentDoctorId || 'doc_card_2'}
                            onChange={(e) => {
                              setDoctorId(e.target.value);
                              setRole('doctor', e.target.value);
                            }}
                            className="w-full text-xs p-1.5 rounded border border-ink/20 bg-base text-ink font-medium"
                          >
                            {doctors.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({departments.find((dep) => dep.id === d.department_id)?.token_prefix})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="border-t border-ink/10 pt-1 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            resetDemoData();
                            setRoleMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-danger hover:bg-danger/10 cursor-pointer font-medium"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset demo data</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Page Body Viewport */}
          <main className="flex-1 p-4 md:p-8 max-w-[1440px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Global Floating Toast Stack */}
      <ToastContainer />
    </div>
  );
};
