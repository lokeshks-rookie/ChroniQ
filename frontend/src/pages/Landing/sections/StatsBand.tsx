import { useEffect, useRef, useState } from 'react';
import { mockStats } from '@/data/mockData';
import { Hospital, UserRound, CalendarCheck, Timer } from 'lucide-react';

const STATS = [
  {
    icon: Hospital,
    value: mockStats.hospitals,
    suffix: '+',
    label: 'Hospitals onboarded',
    description: 'Multi-city network',
  },
  {
    icon: UserRound,
    value: mockStats.doctors,
    suffix: '+',
    label: 'Specialist doctors',
    description: 'Across 18 specialties',
  },
  {
    icon: CalendarCheck,
    value: mockStats.appointmentsBooked,
    suffix: '',
    label: 'Appointments booked',
    description: 'And counting',
  },
  {
    icon: Timer,
    value: mockStats.avgWaitReduction,
    suffix: '%',
    label: 'Average wait reduction',
    description: 'Vs. walk-in queues',
  },
];

function useCountUp(target: number, duration = 1800, trigger: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, trigger]);
  return count;
}

function StatCard({
  icon: Icon,
  value,
  suffix,
  label,
  description,
  trigger,
  delay,
}: (typeof STATS)[0] & { trigger: boolean; delay: number }) {
  const count = useCountUp(value, 1600, trigger);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '40px 24px',
        borderRadius: '20px',
        border: '1px solid rgba(253,249,240,0.08)',
        transition: 'background 0.25s, border-color 0.25s',
        cursor: 'default',
        opacity: trigger ? 1 : 0,
        transform: trigger ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${delay}ms`,
        transitionProperty: 'opacity, transform, background, border-color',
        transitionDuration: '0.6s, 0.6s, 0.25s, 0.25s',
        transitionTimingFunction: 'ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.backgroundColor = 'rgba(253,249,240,0.04)';
        el.style.borderColor = 'rgba(154,110,86,0.25)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.backgroundColor = 'transparent';
        el.style.borderColor = 'rgba(253,249,240,0.08)';
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: 'rgba(154,110,86,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} color="var(--color-cream)" strokeWidth={1.8} />
      </div>

      {/* Number */}
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: 'var(--color-base)',
            lineHeight: 1,
          }}
        >
          {count.toLocaleString('en-IN')}{suffix}
        </span>
      </div>

      {/* Labels */}
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-cream)',
            marginBottom: '4px',
          }}
        >
          {label}
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(253,249,240,0.35)', fontWeight: 400 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export default function StatsBand() {
  const ref = useRef<HTMLElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTriggered(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="section-pad"
      style={{
        backgroundColor: 'var(--color-ink)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(154,110,86,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p className="eyebrow eyebrow-light" style={{ marginBottom: '14px' }}>■ Platform impact</p>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--color-base)',
              lineHeight: 1.15,
            }}
          >
            Real numbers. Real difference.
          </h2>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {STATS.map((stat, i) => (
            <StatCard
              key={stat.label}
              {...stat}
              trigger={triggered}
              delay={i * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
