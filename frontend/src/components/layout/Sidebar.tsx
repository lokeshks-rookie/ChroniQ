import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

interface DesktopSidebarProps {
  navItems?: NavItem[];
  title?: string;
  subtitle?: string;
  headerBadge?: React.ReactNode;
  isActive?: (href: string) => boolean;
  onLogout?: () => void;
  /** Inject custom nav content (e.g. grouped nav for admin). Replaces default flat navItems rendering. */
  children?: React.ReactNode;
  /** Inject custom footer. Replaces default user/logout footer. */
  footer?: React.ReactNode;
}

export function DesktopSidebar({
  navItems = [],
  title = 'CHRONIQ',
  subtitle,
  headerBadge,
  isActive,
  onLogout,
  children,
  footer,
}: DesktopSidebarProps) {
  const { user } = useAuthStore();
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const isOpen = isSidebarOpen || isHoverOpen;

  const handleToggle = () => {
    if (isSidebarOpen) setIsHoverOpen(false);
    setIsSidebarOpen(!isSidebarOpen);
  };

  const asideStyle = isOpen
    ? { width: '264px', transition: 'width 400ms ease-out 150ms' }
    : { width: '60px', transition: 'width 400ms ease-out 150ms' };

  const contentStyle = isOpen
    ? { opacity: 1, pointerEvents: 'auto', transition: 'opacity 200ms ease-out 500ms' }
    : { opacity: 0, pointerEvents: 'none', transition: 'opacity 80ms ease-out 100ms' };

  return (
    <aside
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => { setIsHoverOpen(false); setIsSidebarHovered(false); }}
      onMouseMove={(e) => {
        if (!isOpen) {
          const rect = e.currentTarget.getBoundingClientRect();
          if (e.clientY - rect.top >= 47) {
            setIsHoverOpen(true);
          }
        }
      }}
      className="relative z-50 h-full flex-shrink-0 min-w-0 hidden md:flex flex-col border-r border-ink/10"
      style={{
        ...asideStyle,
        backgroundColor: 'var(--color-ink)',
        '--color-ink-light': 'rgba(253, 249, 240, 0.75)',
      } as React.CSSProperties}
    >
      <button
        onClick={handleToggle}
        className="absolute top-3 left-full -translate-x-1/2 z-50 flex items-center justify-center w-7 h-7 rounded-full shadow-sm cursor-pointer transition-colors duration-200 ease-out"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-ink)',
          border: '2px solid var(--color-ink)'
        }}
        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
      </button>

      {/* Scroll container — opacity/pointer-events + scroll + hover-reveal thumb all in one */}
      <div
        style={contentStyle as React.CSSProperties}
        className={`sidebar-scroll w-full h-full overflow-y-auto overflow-x-hidden${isSidebarHovered ? ' sidebar-scroll-visible' : ''}`}
      >
        <div className="flex flex-col min-h-full w-full py-6 px-3">
          {/* Header */}
          <div style={{ padding: '0 8px', marginBottom: subtitle ? '12px' : '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <Link
                to="/"
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  textDecoration: 'none',
                }}
              >
                <span style={{
                  width: '28px', height: '28px', borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <img src="/logo.png" alt="ChroniQ" width="28" height="28" style={{ display: 'block', objectFit: 'contain' }} />
                </span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--color-base)', letterSpacing: '-0.02em' }}>
                  {title}
                </span>
              </Link>
              {headerBadge}
            </div>

            {subtitle && (
              <p style={{
                fontSize: '11px', fontWeight: 500,
                color: 'rgba(253,249,240,0.55)',
                paddingTop: '6px', margin: 0,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Custom content mode (e.g. Admin grouped nav) or default flat nav */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children ? (
              children
            ) : (
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {navItems.map(({ icon: Icon, label, href, badge }) => {
                  const active = isActive ? isActive(href) : false;
                  return (
                    <Link
                      key={href}
                      to={href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '10px',
                        fontSize: '14px', fontWeight: active ? 600 : 500,
                        color: active ? 'var(--color-base)' : 'rgba(253,249,240,0.65)',
                        backgroundColor: active ? 'rgba(253,249,240,0.1)' : 'transparent',
                        textDecoration: 'none', transition: 'background 0.2s, color 0.2s',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = 'rgba(253,249,240,0.08)';
                          e.currentTarget.style.color = 'var(--color-base)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'rgba(253,249,240,0.65)';
                        }
                      }}
                    >
                      <Icon size={17} strokeWidth={1.8} />
                      {label}
                      {!!badge && badge > 0 && (
                        <span style={{
                          position: 'absolute', right: '12px',
                          width: '18px', height: '18px', borderRadius: '50%',
                          backgroundColor: 'var(--color-accent)', color: 'var(--color-base)',
                          fontSize: '10px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Footer: custom footer if provided, else default user/logout if onLogout is provided */}
          {footer ? (
            <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
              {footer}
            </div>
          ) : onLogout ? (
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(253,249,240,0.08)' }}>
              {user?.name && (
                <p style={{ fontSize: '13px', color: 'rgba(253,249,240,0.45)', padding: '0 12px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </p>
              )}
              <button
                onClick={onLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 500, color: 'rgba(253,249,240,0.65)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  width: '100%', fontFamily: 'var(--font-sans)', transition: 'color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(253,249,240,0.08)';
                  e.currentTarget.style.color = 'var(--color-base)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(253,249,240,0.65)';
                }}
              >
                <LogOut size={17} strokeWidth={1.8} />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
