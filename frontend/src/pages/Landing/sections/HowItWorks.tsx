import { Search, CalendarCheck, ScanLine, Activity } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: Search,
    title: 'Search',
    description: 'Find doctors by specialty, hospital, city, or language. Filter by availability and fee.',
  },
  {
    number: '02',
    icon: CalendarCheck,
    title: 'Book a slot',
    description: 'Pick a time, confirm your details. Your slot is held for 5 minutes — no race conditions.',
  },
  {
    number: '03',
    icon: ScanLine,
    title: 'Check in with QR',
    description: 'Arrive and scan your booking QR at the reception or kiosk. Get your queue token instantly.',
  },
  {
    number: '04',
    icon: Activity,
    title: 'Track your queue',
    description: 'See live position, estimated wait, and get notified when you\'re up next — from your phone.',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="section-pad"
      style={{
        backgroundColor: 'var(--color-base)',
        paddingTop: '160px', // extra top for search bar overlap
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        {/* Section header */}
        <div style={{ marginBottom: '64px', textAlign: 'center' }}>
          <p className="eyebrow" style={{ marginBottom: '14px' }}>■ How it works</p>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--color-ink)',
              maxWidth: '520px',
              margin: '0 auto',
              lineHeight: 1.15,
            }}
          >
            From search to seen — in four steps
          </h2>
        </div>

        {/* Steps grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
            position: 'relative',
          }}
        >
          {/* Connector line — desktop only */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '32px',
              left: '12%',
              right: '12%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(154,110,86,0.3) 20%, rgba(154,110,86,0.3) 80%, transparent)',
              pointerEvents: 'none',
            }}
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '20px',
                  padding: '32px 24px',
                  borderRadius: '16px',
                  backgroundColor: 'transparent',
                  position: 'relative',
                  transition: 'background 0.25s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(154,110,86,0.06)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                }}
              >
                {/* Icon container */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      backgroundColor: i % 2 === 0 ? 'var(--color-ink)' : 'var(--color-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: i % 2 === 0
                        ? '0 8px 24px rgba(25,8,1,0.2)'
                        : '0 8px 24px rgba(154,110,86,0.3)',
                    }}
                  >
                    <Icon
                      size={26}
                      color="var(--color-base)"
                      strokeWidth={1.8}
                    />
                  </div>
                  {/* Step number badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-10px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-base)',
                      border: '2px solid var(--color-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: 'var(--color-accent)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {step.number}
                  </span>
                </div>

                {/* Text */}
                <div>
                  <h3
                    style={{
                      fontSize: '17px',
                      fontWeight: 700,
                      color: 'var(--color-ink)',
                      marginBottom: '8px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: 'var(--color-muted)',
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
