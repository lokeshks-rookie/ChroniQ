import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

interface DesktopSidebarProps {
  navItems: NavItem[];
  title?: string;
  subtitle?: string;
  isActive: (href: string) => boolean;
  onLogout: () => void;
}

export function DesktopSidebar({ navItems, title = 'ChroniQ', subtitle, isActive, onLogout }: DesktopSidebarProps) {
  const { user } = useAuthStore();
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isOpen = isSidebarOpen || isHoverOpen;

  const handleToggle = () => {
    if (isSidebarOpen) setIsHoverOpen(false);
    setIsSidebarOpen(!isSidebarOpen);
  };

  const asideStyle = isOpen
    ? { width: '256px', transition: 'width 400ms ease-out 150ms' }
    : { width: '60px', transition: 'width 400ms ease-out 150ms' };

  const contentStyle = isOpen
    ? { opacity: 1, pointerEvents: 'auto', transition: 'opacity 200ms ease-out 500ms' }
    : { opacity: 0, pointerEvents: 'none', transition: 'opacity 80ms ease-out 100ms' };

  return (
    <aside
      onMouseLeave={() => setIsHoverOpen(false)}
      onMouseMove={(e) => {
        if (!isOpen) {
          const rect = e.currentTarget.getBoundingClientRect();
          if (e.clientY - rect.top >= 47) {
            setIsHoverOpen(true);
          }
        }
      }}
      style={{
        ...asideStyle,
        backgroundColor: 'var(--color-ink)',
      }}
      className="relative z-50 h-screen flex-shrink-0 min-w-0 hidden md:flex flex-col border-r border-ink/10"
    >
      <button
        onClick={handleToggle}
        className="absolute top-3 left-full -translate-x-1/2 z-50 flex items-center justify-center w-7 h-7 rounded-full shadow-sm cursor-pointer transition-colors duration-200 ease-out"
        style={{
          backgroundColor: 'var(--color-base)',
          color: 'var(--color-ink)',
          border: '1px solid rgba(154,110,86,0.15)'
        }}
        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
      </button>

      <div style={contentStyle as React.CSSProperties} className="w-full h-full overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col min-h-full w-[256px] min-w-[256px] py-6 px-3">
          <Link
            to="/"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '0 8px', marginBottom: subtitle ? '8px' : '32px', textDecoration: 'none',
            }}
          >
            <span style={{
              width: '28px', height: '28px', borderRadius: '6px',
              backgroundColor: 'var(--color-accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="6.5" y="2" width="3" height="12" rx="1.5" fill="#FDF9F0" />
                <rect x="2" y="6.5" width="12" height="3" rx="1.5" fill="#FDF9F0" />
              </svg>
            </span>
            <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--color-base)', letterSpacing: '-0.02em' }}>
              {title}
            </span>
          </Link>
          
          {subtitle && (
            <p style={{
              fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'rgba(253,249,240,0.3)',
              padding: '0 12px', marginBottom: '20px',
            }}>
              {subtitle}
            </p>
          )}

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.map(({ icon: Icon, label, href, badge }) => {
              const active = isActive(href);
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

          <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(253,249,240,0.08)' }}>
            <p style={{ fontSize: '13px', color: 'rgba(253,249,240,0.45)', padding: '0 12px 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </p>
            <button
              onClick={onLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px',
                fontSize: '14px', fontWeight: 500, color: 'rgba(253,249,240,0.5)',
                background: 'none', border: 'none', cursor: 'pointer',
                width: '100%', fontFamily: 'var(--font-sans)', transition: 'color 0.2s',
              }}
            >
              <LogOut size={17} strokeWidth={1.8} />
              Log out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
