import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowRight } from 'lucide-react';
import { mockHospitals, type MockHospital } from '@/data/mockData';

function StarRating({ value }: { value: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <Star size={13} fill="var(--color-accent)" color="var(--color-accent)" />
      <span
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-ink)',
        }}
      >
        {value.toFixed(1)}
      </span>
    </span>
  );
}

function HospitalCard({ hospital }: { hospital: MockHospital }) {
  return (
    <Link
      to={`/hospitals/${hospital._id}`}
      className="scroll-snap-item"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '300px',
        borderRadius: '16px',
        backgroundColor: 'var(--color-base)',
        border: '1px solid rgba(154,110,86,0.15)',
        textDecoration: 'none',
        overflow: 'hidden',
        transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = '0 16px 48px rgba(25,8,1,0.12)';
        el.style.borderColor = 'rgba(154,110,86,0.35)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
        el.style.borderColor = 'rgba(154,110,86,0.15)';
      }}
    >
      {/* ── Color banner ── */}
      <div
        style={{
          height: '100px',
          background: `linear-gradient(135deg, var(--color-ink) 0%, var(--color-ink-light) 100%)`,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circle */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: 'rgba(154,110,86,0.15)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: '-30px',
            right: '30px',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            backgroundColor: 'rgba(184,140,112,0.1)',
          }}
        />
        {/* Timings badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'rgba(253,249,240,0.12)',
            border: '1px solid rgba(253,249,240,0.15)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'rgba(253,249,240,0.8)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Clock size={10} />
          {hospital.timings}
        </span>
      </div>

      {/* ── Card body ── */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Name & rating */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}
          >
            {hospital.name}
          </h3>
          <StarRating value={hospital.rating_avg} />
        </div>

        {/* City */}
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '13px',
            color: 'var(--color-muted)',
          }}
        >
          <MapPin size={13} strokeWidth={1.8} color="var(--color-accent)" />
          {hospital.city}
        </p>

        {/* Specialty tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {hospital.facilities.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                padding: '3px 10px',
                borderRadius: '999px',
                backgroundColor: 'rgba(154,110,86,0.1)',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--color-muted)',
              }}
            >
              {tag}
            </span>
          ))}
          {hospital.facilities.length > 3 && (
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '999px',
                backgroundColor: 'rgba(154,110,86,0.06)',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--color-accent)',
              }}
            >
              +{hospital.facilities.length - 3}
            </span>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid rgba(154,110,86,0.1)',
          }}
        >
          <span style={{ fontSize: '12px', color: 'rgba(105,68,54,0.6)' }}>
            {hospital.rating_count.toLocaleString()} reviews
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-accent)',
            }}
          >
            Book now <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function FeaturedHospitals() {
  return (
    <section
      className="section-pad"
      style={{ backgroundColor: 'rgba(184,140,112,0.08)', overflow: 'hidden' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            padding: '0 24px',
            marginBottom: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: '12px' }}>■ Featured hospitals</p>
            <h2
              style={{
                fontSize: 'clamp(24px, 3.5vw, 38px)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: 'var(--color-ink)',
                lineHeight: 1.2,
              }}
            >
              Trusted care across Tamil Nadu
            </h2>
          </div>
          <Link
            to="/hospitals"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-accent)',
              textDecoration: 'none',
              transition: 'gap 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.gap = '10px';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.gap = '6px';
            }}
          >
            View all hospitals <ArrowRight size={16} />
          </Link>
        </div>

        {/* Horizontal scroll row */}
        <div
          className="scroll-snap-x"
          style={{
            paddingLeft: '24px',
            paddingRight: '24px',
            gap: '20px',
            paddingBottom: '16px',
          }}
        >
          {mockHospitals.map((h) => (
            <HospitalCard key={h._id} hospital={h} />
          ))}
        </div>

        {/* Fade edge hints for desktop */}
        <div style={{ padding: '0 24px', marginTop: '8px' }}>
          <p
            style={{
              fontSize: '12px',
              color: 'rgba(105,68,54,0.45)',
              textAlign: 'center',
            }}
          >
            Scroll to see more →
          </p>
        </div>
      </div>
    </section>
  );
}
