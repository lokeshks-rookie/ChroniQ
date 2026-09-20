import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  Platform: [
    { label: 'Find a Doctor', href: '/app/search' },
    { label: 'Hospital Directory', href: '/hospitals' },
    { label: 'How it Works', href: '/#how-it-works' },
    { label: 'Live Queue Tracker', href: '/app' },
  ],
  For_Hospitals: [
    { label: 'Admin Dashboard', href: '/admin' },
    { label: 'Queue Management', href: '/admin/queue' },
    { label: 'Analytics', href: '/admin/reports' },
    { label: 'Onboard your Hospital', href: '/super/hospitals' },
  ],
  Support: [
    { label: 'Help & FAQ', href: '/app/help' },
    { label: 'Contact Us', href: '/app/help' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--color-ink)',
        color: 'var(--color-base)',
        paddingTop: '72px',
        paddingBottom: '32px',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        {/* ── Top row ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '48px',
            paddingBottom: '56px',
            borderBottom: '1px solid rgba(253,249,240,0.08)',
          }}
        >
          {/* Brand column */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
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
                  color: 'var(--color-base)',
                  letterSpacing: '-0.02em',
                }}
              >
                ChroniQ
              </span>
            </Link>
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.7,
                color: 'rgba(253,249,240,0.55)',
                maxWidth: '220px',
              }}
            >
              Book in your own voice. Know your exact wait. Never stand in a hospital queue blind again.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <p
                className="eyebrow eyebrow-light"
                style={{ marginBottom: '20px' }}
              >
                ■ {group.replace('_', ' ')}
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      style={{
                        fontSize: '14px',
                        color: 'rgba(253,249,240,0.60)',
                        textDecoration: 'none',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-cream)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(253,249,240,0.60)';
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom row ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '28px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <p style={{ fontSize: '13px', color: 'rgba(253,249,240,0.35)' }}>
            © {new Date().getFullYear()} ChroniQ. Built for Hackathon '26 · KLN College.
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(253,249,240,0.35)' }}>
            Demo only — no real patient data.
          </p>
        </div>
      </div>
    </footer>
  );
}
