import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Cross, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const NAV_LINKS = [
  { label: 'Find a Doctor', href: '/app/search' },
  { label: 'Hospitals', href: '/hospitals' },
  { label: 'How it Works', href: '/#how-it-works' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/app';
    switch (user.role) {
      case 'hospital_admin':
      case 'receptionist': return '/admin';
      case 'doctor': return '/doctor';
      case 'super_admin': return '/super';
      default: return '/app';
    }
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--color-base)',
        borderBottom: `1px solid ${scrolled ? 'rgba(154,110,86,0.2)' : 'transparent'}`,
        boxShadow: scrolled ? '0 2px 20px rgba(25,8,1,0.08)' : 'none',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* ── Logo ── */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="6.5" y="2" width="3" height="12" rx="1.5" fill="#FDF9F0" />
              <rect x="2" y="6.5" width="12" height="3" rx="1.5" fill="#FDF9F0" />
            </svg>
          </span>
          <span
            style={{
              fontWeight: 700,
              fontSize: '20px',
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
            }}
          >
            ChroniQ
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          className="hidden md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--color-muted)',
                textDecoration: 'none',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-ink)';
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(154,110,86,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-muted)';
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Desktop CTAs ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="hidden md:flex">
          {isAuthenticated ? (
            <>
              <Link
                to={getDashboardLink()}
                style={{
                  padding: '9px 18px',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  border: '1.5px solid rgba(25,8,1,0.2)',
                  transition: 'border-color 0.2s',
                }}
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  padding: '9px 20px',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: 'var(--color-ink)',
                  color: 'var(--color-base)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  padding: '9px 18px',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  border: '1.5px solid rgba(25,8,1,0.2)',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(25,8,1,0.2)';
                }}
              >
                Log in
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '9px 20px',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: 'var(--color-ink)',
                  color: 'var(--color-base)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s, transform 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--color-ink-light)';
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--color-ink)';
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                }}
              >
                Get started
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-accent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 8L8 2M8 2H4M8 2V6" stroke="#FDF9F0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden"
          onClick={() => setOpen((p) => !p)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-ink)',
            transition: 'background 0.2s',
          }}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <div
        className="md:hidden"
        style={{
          overflow: 'hidden',
          maxHeight: open ? '400px' : '0',
          transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: 'var(--color-base)',
          borderTop: open ? '1px solid rgba(154,110,86,0.15)' : 'none',
        }}
      >
        <nav style={{ padding: '16px 24px 8px' }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              style={{
                display: 'block',
                padding: '12px 4px',
                borderBottom: '1px solid rgba(154,110,86,0.1)',
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--color-muted)',
                textDecoration: 'none',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '16px', paddingBottom: '8px' }}>
            {isAuthenticated ? (
              <>
                <Link
                  to={getDashboardLink()}
                  style={{
                    padding: '12px 0',
                    textAlign: 'center',
                    borderRadius: '999px',
                    border: '1.5px solid rgba(25,8,1,0.2)',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: 'var(--color-ink)',
                    textDecoration: 'none',
                  }}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '12px 0',
                    borderRadius: '999px',
                    backgroundColor: 'var(--color-ink)',
                    color: 'var(--color-base)',
                    fontSize: '15px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  style={{
                    padding: '12px 0',
                    textAlign: 'center',
                    borderRadius: '999px',
                    border: '1.5px solid rgba(25,8,1,0.2)',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: 'var(--color-ink)',
                    textDecoration: 'none',
                  }}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  style={{
                    padding: '12px 0',
                    textAlign: 'center',
                    borderRadius: '999px',
                    backgroundColor: 'var(--color-ink)',
                    color: 'var(--color-base)',
                    fontSize: '15px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
