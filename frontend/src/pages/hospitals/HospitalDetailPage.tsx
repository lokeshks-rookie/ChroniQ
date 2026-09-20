import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Phone, Clock, Star, ChevronLeft, ChevronRight,
  Building2, Stethoscope, Calendar, ArrowRight, ExternalLink,
  ParkingCircle, Pill, HeartPulse, FlaskConical,
  Accessibility, UtensilsCrossed, Droplets, Languages,
  BadgeCheck, Banknote, CalendarClock, UserRound,
} from 'lucide-react';
import {
  getHospitalById,
  getDoctorsByHospital,
  getReviewsByHospital,
  AVATAR_GRADIENTS,
  type MockHospital,
  type MockDoctor,
  type MockReview,
} from '@/data/mockData';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOAD_DELAY_MS = 500;

const AMENITY_ICON_MAP: Record<string, React.ElementType> = {
  'Parking': ParkingCircle,
  'Pharmacy': Pill,
  'ICU': HeartPulse,
  'Lab': FlaskConical,
  'Wheelchair Access': Accessibility,
  'Cafeteria': UtensilsCrossed,
  'Blood Bank': Droplets,
};

// ─── Star helpers ─────────────────────────────────────────────────────────────

function StarRow({ avg, count, size = 14, light = false }: { avg: number; count: number; size?: number; light?: boolean }) {
  const color = light ? 'rgba(253,249,240,0.9)' : 'var(--color-accent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size}
            fill={i < Math.floor(avg) ? color : (i < avg ? color : 'none')}
            color={color}
            strokeWidth={1.5}
            style={{ opacity: i < Math.floor(avg) ? 1 : i < avg ? 0.55 : 0.22 }}
          />
        ))}
      </div>
      <span style={{ fontSize: '14px', fontWeight: 700, color: light ? 'var(--color-base)' : 'var(--color-ink)' }}>
        {avg.toFixed(1)}
      </span>
      <span style={{ fontSize: '12px', color: light ? 'rgba(253,249,240,0.55)' : 'var(--color-muted)' }}>
        {count.toLocaleString()} reviews
      </span>
    </div>
  );
}

function MiniStars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11}
          fill={i < rating ? 'var(--color-accent)' : 'none'}
          color="var(--color-accent)"
          strokeWidth={1.5}
          style={{ opacity: i < rating ? 1 : 0.2 }}
        />
      ))}
    </div>
  );
}

// ─── Rating breakdown bar ─────────────────────────────────────────────────────

function RatingBreakdown({ reviews }: { reviews: MockReview[] }) {
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {counts.map(({ star, count }) => (
        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-muted)', width: '10px', textAlign: 'right', flexShrink: 0 }}>{star}</span>
          <Star size={10} fill="var(--color-accent)" color="var(--color-accent)" />
          <div style={{ flex: 1, height: '6px', borderRadius: '99px', backgroundColor: 'rgba(154,110,86,0.12)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              backgroundColor: 'var(--color-accent)',
              width: `${(count / max) * 100}%`,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-muted)', width: '20px', flexShrink: 0 }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton components ──────────────────────────────────────────────────────

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(154,110,86,0.08) 25%, rgba(154,110,86,0.16) 50%, rgba(154,110,86,0.08) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.6s infinite',
  borderRadius: '8px',
};

function SkeletonBlock({ h, w = '100%', style }: { h: string; w?: string; style?: React.CSSProperties }) {
  return <div style={{ height: h, width: w, ...shimmerStyle, ...style }} />;
}

function HeaderSkeleton() {
  return (
    <section style={{ backgroundColor: 'var(--color-ink)', padding: '40px 24px 40px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <SkeletonBlock h="14px" w="200px" style={{ marginBottom: '20px', opacity: 0.4 }} />
        <SkeletonBlock h="40px" w="55%" style={{ marginBottom: '16px' }} />
        <SkeletonBlock h="18px" w="220px" style={{ marginBottom: '24px' }} />
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <SkeletonBlock h="36px" w="140px" style={{ borderRadius: '999px' }} />
          <SkeletonBlock h="36px" w="180px" style={{ borderRadius: '999px' }} />
        </div>
      </div>
    </section>
  );
}

function DoctorCardSkeleton() {
  return (
    <div style={{
      borderRadius: '14px', border: '1px solid rgba(154,110,86,0.12)',
      backgroundColor: 'var(--color-base)', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', flexShrink: 0, ...shimmerStyle }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SkeletonBlock h="15px" w="70%" />
          <SkeletonBlock h="12px" w="50%" />
        </div>
      </div>
      <SkeletonBlock h="12px" w="90%" />
      <SkeletonBlock h="12px" w="65%" />
      <SkeletonBlock h="34px" style={{ borderRadius: '999px', marginTop: '4px' }} />
    </div>
  );
}

// ─── Doctor card ──────────────────────────────────────────────────────────────

function DoctorCard({ doctor }: { doctor: MockDoctor }) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      style={{
        borderRadius: '14px',
        border: `1px solid ${hovered ? 'rgba(154,110,86,0.35)' : 'rgba(154,110,86,0.15)'}`,
        backgroundColor: 'var(--color-base)',
        padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '14px',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 36px rgba(25,8,1,0.10)' : '0 1px 4px rgba(25,8,1,0.04)',
        transition: 'transform 0.22s, box-shadow 0.22s, border-color 0.22s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar + name */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px', flexShrink: 0,
          background: AVATAR_GRADIENTS[doctor.avatarGradient],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', fontWeight: 700, color: 'rgba(253,249,240,0.9)',
          letterSpacing: '0.02em',
        }}>
          {doctor.initials}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '2px', lineHeight: 1.3 }}>
            {doctor.name}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600 }}>
            {doctor.specialty}
          </p>
          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <MiniStars rating={Math.round(doctor.rating_avg)} />
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
              {doctor.rating_avg.toFixed(1)} ({doctor.rating_count})
            </span>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <BadgeCheck size={13} color="var(--color-accent)" strokeWidth={1.8} />
          <span style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.4 }}>
            {doctor.qualification}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-muted)' }}>
            <UserRound size={12} color="var(--color-accent)" strokeWidth={1.8} />
            {doctor.experience} yrs exp
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-muted)' }}>
            <Banknote size={12} color="var(--color-accent)" strokeWidth={1.8} />
            ₹{doctor.fee.toLocaleString()} / visit
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-muted)' }}>
            <Languages size={12} color="var(--color-accent)" strokeWidth={1.8} />
            {doctor.languages.join(', ')}
          </span>
        </div>
      </div>

      {/* Next slot */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '8px 12px', borderRadius: '10px',
        backgroundColor: doctor.nextSlot
          ? 'rgba(46,125,70,0.08)'
          : 'rgba(154,110,86,0.06)',
        border: `1px solid ${doctor.nextSlot ? 'rgba(46,125,70,0.15)' : 'rgba(154,110,86,0.12)'}`,
      }}>
        <CalendarClock size={13}
          color={doctor.nextSlot ? 'var(--color-success)' : 'var(--color-muted)'}
          strokeWidth={1.8}
        />
        <span style={{
          fontSize: '12px', fontWeight: 600,
          color: doctor.nextSlot ? 'var(--color-success)' : 'var(--color-muted)',
        }}>
          {doctor.nextSlot ? `Next: ${doctor.nextSlot}` : 'No slots available soon'}
        </span>
      </div>

      {/* CTA */}
      <Link
        to={`/doctors/${doctor._id}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '6px', padding: '10px',
          borderRadius: '999px', textDecoration: 'none',
          fontSize: '13px', fontWeight: 600,
          backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
          transition: 'background 0.2s, transform 0.15s',
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
        <Calendar size={13} /> Book this doctor
      </Link>
    </article>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: MockReview }) {
  const initial = review.reviewer[0] ?? '?';
  return (
    <div style={{
      padding: '20px',
      borderRadius: '14px',
      border: '1px solid rgba(154,110,86,0.12)',
      backgroundColor: 'var(--color-base)',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
          background: AVATAR_GRADIENTS[initial.charCodeAt(0) % AVATAR_GRADIENTS.length],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: 'rgba(253,249,240,0.9)',
        }}>
          {initial}
        </div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '2px' }}>
            {review.reviewer}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MiniStars rating={review.rating} />
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{review.date}</span>
          </div>
        </div>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.65 }}>
        "{review.comment}"
      </p>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      style={{
        borderRadius: '16px',
        border: '1px solid rgba(154,110,86,0.13)',
        backgroundColor: 'var(--color-base)',
        padding: '28px',
        boxShadow: '0 2px 12px rgba(25,8,1,0.04)',
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)',
      letterSpacing: '-0.01em', marginBottom: '20px',
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      {children}
    </h2>
  );
}

// ─── Not-found within page ────────────────────────────────────────────────────

function HospitalNotFound() {
  return (
    <div style={{
      maxWidth: '1280px', margin: '100px auto', padding: '0 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '16px', textAlign: 'center',
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '22px',
        backgroundColor: 'rgba(154,110,86,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Building2 size={36} color="var(--color-accent)" strokeWidth={1.5} />
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)' }}>
        Hospital not found
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', maxWidth: '360px', lineHeight: 1.6 }}>
        The hospital ID you navigated to doesn't match any record. It may have been removed or the URL is incorrect.
      </p>
      <Link to="/hospitals" style={{
        padding: '11px 28px', borderRadius: '999px',
        backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
        textDecoration: 'none', fontSize: '14px', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: '7px',
      }}>
        <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
        Browse all hospitals
      </Link>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HospitalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const doctorsRef = useRef<HTMLDivElement>(null);

  const hospital: MockHospital | null = useMemo(
    () => (id ? getHospitalById(id) : null),
    [id],
  );

  const allDoctors: MockDoctor[] = useMemo(
    () => (hospital ? getDoctorsByHospital(hospital._id) : []),
    [hospital],
  );

  const visibleDoctors: MockDoctor[] = useMemo(
    () => (hospital ? getDoctorsByHospital(hospital._id, selectedDept || undefined) : []),
    [hospital, selectedDept],
  );

  const reviews: MockReview[] = useMemo(
    () => (hospital ? getReviewsByHospital(hospital._id) : []),
    [hospital],
  );

  // Departments derived from doctors (not raw facilities) + doctor counts
  const departments = useMemo(() => {
    const map: Record<string, number> = {};
    allDoctors.forEach((d) => {
      map[d.specialty] = (map[d.specialty] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [allDoctors]);

  // Simulated load delay
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), LOAD_DELAY_MS);
    return () => clearTimeout(t);
  }, [id]);

  const scrollToDoctors = () => {
    doctorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const mapsUrl = hospital
    ? `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`
    : '#';

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!loading && !hospital) return <HospitalNotFound />;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        <HeaderSkeleton />
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 80px' }}>
          <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {Array.from({ length: 4 }).map((_, i) => <DoctorCardSkeleton key={i} />)}
          </div>
        </div>
      </>
    );
  }

  const h = hospital!;

  // ── Full page ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .detail-page-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 308px;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .detail-page-grid { grid-template-columns: 1fr !important; }
        }
        .dept-strip {
          display: flex;
          overflow-x: auto;
          scrollbar-width: none;
          gap: 8px;
          padding-bottom: 4px;
        }
        .dept-strip::-webkit-scrollbar { display: none; }
        /* Mobile sticky CTA bar */
        .mobile-book-bar {
          display: none;
        }
        @media (max-width: 900px) {
          .mobile-book-bar {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            padding: 12px 20px 20px;
            background: var(--color-base);
            border-top: 1px solid rgba(154,110,86,0.15);
            z-index: 40;
            gap: 10px;
            align-items: center;
          }
        }
      `}</style>

      {/* ── Header band ── */}
      <section style={{
        backgroundColor: 'var(--color-ink)',
        padding: '36px 24px 0',
        animation: 'fadeIn 0.4s ease',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" style={{
            marginBottom: '22px', display: 'flex', alignItems: 'center',
            gap: '6px', flexWrap: 'wrap',
          }}>
            <Link to="/" style={{ fontSize: '12px', color: 'rgba(253,249,240,0.4)', textDecoration: 'none' }}>Home</Link>
            <ChevronRight size={12} color="rgba(253,249,240,0.25)" />
            <Link to="/hospitals" style={{ fontSize: '12px', color: 'rgba(253,249,240,0.4)', textDecoration: 'none' }}>Hospitals</Link>
            <ChevronRight size={12} color="rgba(253,249,240,0.25)" />
            <span style={{ fontSize: '12px', color: 'rgba(253,249,240,0.8)', fontWeight: 500 }}>{h.name}</span>
          </nav>

          {/* Name + open pill */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div>
              <p className="eyebrow eyebrow-light" style={{ marginBottom: '10px' }}>■ Hospital profile</p>
              <h1 style={{
                fontSize: 'clamp(26px, 4.5vw, 44px)', fontWeight: 800,
                letterSpacing: '-0.03em', color: 'var(--color-base)',
                lineHeight: 1.1, marginBottom: '12px',
              }}>
                {h.name}
              </h1>
              <StarRow avg={h.rating_avg} count={h.rating_count} light />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', flexShrink: 0 }}>
              {/* Open/closed pill */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '7px 16px', borderRadius: '999px',
                backgroundColor: h.openNow ? 'rgba(46,125,70,0.18)' : 'rgba(192,57,43,0.15)',
                color: h.openNow ? '#6ee7a0' : '#fca5a5',
                border: `1px solid ${h.openNow ? 'rgba(46,125,70,0.3)' : 'rgba(192,57,43,0.25)'}`,
                fontSize: '13px', fontWeight: 600,
              }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  backgroundColor: h.openNow ? '#6ee7a0' : '#fca5a5',
                  boxShadow: h.openNow ? '0 0 0 3px rgba(110,231,160,0.25)' : 'none',
                  animation: h.openNow ? 'pulse 2s infinite' : 'none',
                }} />
                {h.openNow ? 'Open now' : 'Closed now'}
              </span>

              {/* Desktop CTA — scrolls to doctors */}
              <button
                onClick={scrollToDoctors}
                className="hidden md:flex"
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 24px', borderRadius: '999px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-base)',
                  border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  transition: 'background 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-accent-dark)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-accent)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                <Stethoscope size={15} />
                Book Appointment
              </button>
            </div>
          </div>

          {/* City + timings sub-row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingBottom: '28px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'rgba(253,249,240,0.55)' }}>
              <MapPin size={13} color="var(--color-cream)" strokeWidth={1.8} />
              {h.city}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'rgba(253,249,240,0.55)' }}>
              <Clock size={13} color="var(--color-cream)" strokeWidth={1.8} />
              {h.timings}
            </span>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px 100px' }}>
        <div className="detail-page-grid">

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.5s ease 0.05s both' }}>

            {/* 1 · Quick info strip */}
            <SectionCard>
              <SectionTitle><MapPin size={16} color="var(--color-accent)" strokeWidth={1.8} /> Contact &amp; location</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Address */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(154,110,86,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin size={15} color="var(--color-accent)" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '3px' }}>Address</p>
                    <p style={{ fontSize: '13px', color: 'var(--color-ink)', lineHeight: 1.5 }}>{h.address}</p>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}
                    >
                      Get Directions <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(154,110,86,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={15} color="var(--color-accent)" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '3px' }}>Phone</p>
                    <a href={`tel:${h.phone}`} style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600, textDecoration: 'none' }}>{h.phone}</a>
                  </div>
                </div>

                {/* Timings */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(154,110,86,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={15} color="var(--color-accent)" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '3px' }}>Timings</p>
                    <p style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600 }}>{h.timings}</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* 2 · About + Facilities */}
            <SectionCard>
              <SectionTitle><Building2 size={16} color="var(--color-accent)" strokeWidth={1.8} /> About the hospital</SectionTitle>
              <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.75, marginBottom: '24px' }}>
                {h.about}
              </p>

              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
                Amenities &amp; facilities
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {h.amenities.map((amenity) => {
                  const Icon = AMENITY_ICON_MAP[amenity] ?? Building2;
                  return (
                    <span key={amenity} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '7px 14px', borderRadius: '999px',
                      backgroundColor: 'rgba(154,110,86,0.09)',
                      border: '1px solid rgba(154,110,86,0.15)',
                      fontSize: '12px', fontWeight: 500, color: 'var(--color-muted)',
                    }}>
                      <Icon size={13} color="var(--color-accent)" strokeWidth={1.8} />
                      {amenity}
                    </span>
                  );
                })}
              </div>

              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(154,110,86,0.1)' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Medical specialties
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {h.facilities.map((f) => (
                    <span key={f} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '6px 13px', borderRadius: '999px',
                      backgroundColor: 'rgba(154,110,86,0.06)',
                      border: '1px solid rgba(154,110,86,0.12)',
                      fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)',
                    }}>
                      <Stethoscope size={11} color="var(--color-accent)" strokeWidth={2} />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* 3 · Departments filter */}
            <SectionCard>
              <SectionTitle><Stethoscope size={16} color="var(--color-accent)" strokeWidth={1.8} /> Departments</SectionTitle>
              {departments.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>No doctor data available yet.</p>
              ) : (
                <div className="dept-strip">
                  {/* All chip */}
                  <button
                    onClick={() => setSelectedDept('')}
                    style={{
                      flexShrink: 0, padding: '7px 16px', borderRadius: '999px',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      border: '1.5px solid',
                      fontFamily: 'var(--font-sans)',
                      transition: 'all 0.2s',
                      backgroundColor: selectedDept === '' ? 'var(--color-ink)' : 'transparent',
                      color: selectedDept === '' ? 'var(--color-base)' : 'var(--color-muted)',
                      borderColor: selectedDept === '' ? 'var(--color-ink)' : 'rgba(154,110,86,0.25)',
                    }}
                  >
                    All · {allDoctors.length}
                  </button>
                  {departments.map(({ name, count }) => {
                    const active = selectedDept === name;
                    return (
                      <button
                        key={name}
                        onClick={() => setSelectedDept(active ? '' : name)}
                        style={{
                          flexShrink: 0, padding: '7px 16px', borderRadius: '999px',
                          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                          border: '1.5px solid',
                          fontFamily: 'var(--font-sans)',
                          transition: 'all 0.2s',
                          backgroundColor: active ? 'var(--color-ink)' : 'transparent',
                          color: active ? 'var(--color-base)' : 'var(--color-muted)',
                          borderColor: active ? 'var(--color-ink)' : 'rgba(154,110,86,0.25)',
                        }}
                      >
                        {name} · {count}
                      </button>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* 4 · Doctors grid */}
            <div ref={doctorsRef} id="doctors-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
                  {selectedDept ? `${selectedDept} Doctors` : 'All Doctors'}
                  <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>
                    ({visibleDoctors.length})
                  </span>
                </h2>
                {selectedDept && (
                  <button
                    onClick={() => setSelectedDept('')}
                    style={{
                      fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)',
                      background: 'none', border: '1px solid rgba(154,110,86,0.2)',
                      padding: '5px 12px', borderRadius: '999px',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Clear filter
                  </button>
                )}
              </div>

              {visibleDoctors.length === 0 ? (
                <div style={{
                  padding: '48px 24px', textAlign: 'center',
                  border: '1.5px dashed rgba(154,110,86,0.2)', borderRadius: '16px',
                }}>
                  <UserRound size={32} color="var(--color-accent)" strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: '12px' }} />
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '6px' }}>
                    No doctors listed yet
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                    Doctor profiles for this hospital will appear here once onboarded.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid', gap: '16px',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))',
                }}>
                  {visibleDoctors.map((doc) => (
                    <DoctorCard key={doc._id} doctor={doc} />
                  ))}
                </div>
              )}
            </div>

            {/* 5 · Reviews */}
            <SectionCard id="reviews-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <SectionTitle>
                  <Star size={16} fill="var(--color-accent)" color="var(--color-accent)" />
                  Patient reviews
                </SectionTitle>
                {reviews.length > 0 && (
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Big avg */}
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '40px', fontWeight: 800, color: 'var(--color-ink)', lineHeight: 1, letterSpacing: '-0.04em' }}>
                        {h.rating_avg.toFixed(1)}
                      </p>
                      <MiniStars rating={Math.round(h.rating_avg)} />
                      <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                        {h.rating_count.toLocaleString()} reviews
                      </p>
                    </div>
                    {/* Breakdown bars */}
                    <div style={{ minWidth: '180px', flex: 1 }}>
                      <RatingBreakdown reviews={reviews} />
                    </div>
                  </div>
                )}
              </div>

              {reviews.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-muted)', fontStyle: 'italic' }}>
                  No reviews yet — be the first to share your experience after a completed visit.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {reviews.map((rev) => (
                    <ReviewCard key={rev._id} review={rev} />
                  ))}
                </div>
              )}
            </SectionCard>

          </div>{/* end left column */}

          {/* ── Right sticky sidebar ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'sticky', top: '84px', animation: 'fadeIn 0.5s ease 0.1s both' }}>

            {/* Book CTA card */}
            <div style={{
              borderRadius: '16px', border: '1px solid rgba(154,110,86,0.15)',
              backgroundColor: 'var(--color-base)', padding: '24px',
              boxShadow: '0 4px 24px rgba(25,8,1,0.08)',
            }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                Ready to visit?
              </p>
              <p style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '18px', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
                Book an appointment
              </p>

              <button
                onClick={scrollToDoctors}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '7px', width: '100%', padding: '13px',
                  borderRadius: '999px', border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 700,
                  backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
                  fontFamily: 'var(--font-sans)',
                  transition: 'background 0.2s, transform 0.15s',
                  marginBottom: '10px',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-ink-light)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-ink)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                <Stethoscope size={14} /> Choose a doctor
              </button>

              <a
                href={`tel:${h.phone}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '7px', width: '100%', padding: '12px',
                  borderRadius: '999px', textDecoration: 'none',
                  fontSize: '14px', fontWeight: 600,
                  border: '1.5px solid rgba(154,110,86,0.25)',
                  color: 'var(--color-ink)',
                  transition: 'border-color 0.2s',
                }}
              >
                <Phone size={14} /> Call {h.phone}
              </a>
            </div>

            {/* Quick stats */}
            <div style={{
              borderRadius: '14px', border: '1px solid rgba(154,110,86,0.12)',
              backgroundColor: 'rgba(154,110,86,0.04)', padding: '18px',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                Quick overview
              </p>
              {[
                { label: 'Rating', value: `${h.rating_avg.toFixed(1)} / 5.0` },
                { label: 'Total reviews', value: h.rating_count.toLocaleString() },
                { label: 'Departments', value: `${h.facilities.length}` },
                { label: 'Doctors listed', value: `${allDoctors.length}` },
                { label: 'Timings', value: h.timings },
                { label: 'City', value: h.city },
              ].map((s, i, arr) => (
                <div key={s.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(154,110,86,0.09)' : 'none',
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{s.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink)' }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Back link */}
            <Link
              to="/hospitals"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)',
                textDecoration: 'none', justifyContent: 'center', padding: '10px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-muted)'; }}
            >
              <ChevronLeft size={14} /> Back to directory
            </Link>
          </aside>

        </div>{/* end grid */}
      </div>

      {/* ── Mobile sticky bottom CTA ── */}
      <div className="mobile-book-bar">
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 500 }}>{h.name}</p>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>Find a doctor &amp; book</p>
        </div>
        <button
          onClick={scrollToDoctors}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '12px 22px', borderRadius: '999px',
            backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
            border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700,
            fontFamily: 'var(--font-sans)', flexShrink: 0,
          }}
        >
          <Stethoscope size={14} /> Book now
        </button>
      </div>
    </>
  );
}
