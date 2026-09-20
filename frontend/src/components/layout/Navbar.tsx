import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Cross, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

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
          <img src="/logo.png" alt="ChroniQ" width="32" height="32" style={{ display: 'block', borderRadius: '8px', objectFit: 'contain' }} />
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

        {/* ── Desktop CTAs ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

      </div>
    </header>
  );
}
