import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Play } from 'lucide-react';

export default function Hero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      style={{
        backgroundColor: 'var(--color-ink)',
        minHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '80px',
        paddingBottom: '120px',
        padding: '80px 24px 120px',
      }}
    >
      {/* ── Decorative warm radial glows ── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-10%',
          left: '60%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(154,110,86,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '0',
          left: '-5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(184,140,112,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Subtle grid texture ── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(253,249,240,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(253,249,240,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '860px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(154,110,86,0.35)',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent)',
              animation: 'pulse 2s infinite',
            }}
          />
          <span className="eyebrow eyebrow-light" style={{ fontSize: '10px' }}>
            Multi-hospital appointment &amp; queue platform
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(36px, 6.5vw, 80px)',
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: 'var(--color-base)',
            marginBottom: '24px',
          }}
        >
          Book in your voice.{' '}
          <br />
          <span
            style={{
              color: 'var(--color-accent)',
              position: 'relative',
              display: 'inline-block',
            }}
          >
            Know your wait.
            {/* Underline accent */}
            <svg
              viewBox="0 0 300 12"
              style={{
                position: 'absolute',
                bottom: '-8px',
                left: 0,
                width: '100%',
                height: '10px',
                overflow: 'visible',
              }}
              preserveAspectRatio="none"
            >
              <path
                d="M0 8 Q75 2 150 8 Q225 14 300 8"
                stroke="rgba(154,110,86,0.5)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>{' '}
          <br />
          Never wait blind.
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'rgba(253,249,240,0.60)',
            maxWidth: '560px',
            margin: '0 auto 48px',
            lineHeight: 1.65,
          }}
        >
          Find doctors, book slots instantly, and follow your live queue position — in your own language, from your phone.
        </p>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/app/search"
            id="hero-find-doctor-cta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 28px',
              borderRadius: '999px',
              backgroundColor: 'var(--color-base)',
              color: 'var(--color-ink)',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 24px rgba(253,249,240,0.15)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 32px rgba(253,249,240,0.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 24px rgba(253,249,240,0.15)';
            }}
          >
            Find a Doctor
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ArrowUpRight size={13} color="#FDF9F0" strokeWidth={2.5} />
            </span>
          </Link>

          <a
            href="/#how-it-works"
            id="hero-how-it-works-cta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 24px',
              borderRadius: '999px',
              border: '1.5px solid rgba(253,249,240,0.2)',
              color: 'rgba(253,249,240,0.75)',
              fontSize: '15px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(253,249,240,0.45)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-base)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(253,249,240,0.2)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(253,249,240,0.75)';
            }}
          >
            <Play size={14} strokeWidth={2} fill="currentColor" />
            See how it works
          </a>
        </div>

        {/* Social proof */}
        <div
          style={{
            marginTop: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { value: '48+', label: 'Hospitals' },
            { value: '620+', label: 'Doctors' },
            { value: '32K+', label: 'Appointments' },
          ].map((stat) => (
            <div
              key={stat.value}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--color-cream)',
                  letterSpacing: '-0.02em',
                }}
              >
                {stat.value}
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(253,249,240,0.4)', fontWeight: 500 }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </section>
  );
}
