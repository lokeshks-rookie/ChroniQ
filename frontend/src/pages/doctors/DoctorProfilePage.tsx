import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, ChevronLeft, ChevronRight,
  Building2, BadgeCheck, Languages, Banknote, Calendar,
  UserRound, ArrowRight, CalendarClock, Activity, MapPin
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  getDoctorById,
  getHospitalById,
  getReviewsByDoctor,
  getSlotPreview,
  AVATAR_GRADIENTS,
  type MockDoctor,
  type MockHospital,
  type MockDoctorReview,
  type SlotDay
} from '@/data/mockData';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOAD_DELAY_MS = 500;

// ─── Shared UI Helpers ────────────────────────────────────────────────────────

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

function RatingBreakdown({ reviews }: { reviews: MockDoctorReview[] }) {
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

function ReviewCard({ review }: { review: MockDoctorReview }) {
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

// ─── Skeletons ────────────────────────────────────────────────────────────────

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(154,110,86,0.08) 25%, rgba(154,110,86,0.16) 50%, rgba(154,110,86,0.08) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.6s infinite',
  borderRadius: '8px',
};

function SkeletonBlock({ h, w = '100%', style }: { h: string; w?: string; style?: React.CSSProperties }) {
  return <div style={{ height: h, width: w, ...shimmerStyle, ...style }} />;
}

function DoctorProfileSkeleton() {
  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <section style={{ backgroundColor: 'var(--color-ink)', padding: '40px 24px 40px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <SkeletonBlock h="14px" w="200px" style={{ marginBottom: '24px', opacity: 0.4 }} />
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ width: '96px', height: '96px', borderRadius: '24px', flexShrink: 0, ...shimmerStyle, opacity: 0.2 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
              <SkeletonBlock h="36px" w="50%" />
              <SkeletonBlock h="18px" w="30%" />
              <SkeletonBlock h="24px" w="70%" style={{ marginTop: '8px' }} />
            </div>
          </div>
        </div>
      </section>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div>
          <SkeletonBlock h="16px" w="120px" style={{ marginBottom: '16px' }} />
          <SkeletonBlock h="14px" style={{ marginBottom: '8px' }} />
          <SkeletonBlock h="14px" style={{ marginBottom: '8px' }} />
          <SkeletonBlock h="14px" w="80%" />
        </div>
        <SkeletonBlock h="180px" style={{ borderRadius: '16px' }} />
      </div>
    </>
  );
}

// ─── Section Layout ───────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: '16px',
      border: '1px solid rgba(154,110,86,0.13)',
      backgroundColor: 'var(--color-base)',
      padding: '28px',
      boxShadow: '0 2px 12px rgba(25,8,1,0.04)',
    }}>
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

// ─── 404 Panel ────────────────────────────────────────────────────────────────

function DoctorNotFound() {
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
        <UserRound size={36} color="var(--color-accent)" strokeWidth={1.5} />
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)' }}>
        Doctor not found
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', maxWidth: '360px', lineHeight: 1.6 }}>
        The doctor profile you navigated to doesn't match any record. It may have been removed or the URL is incorrect.
      </p>
      <Link to="/hospitals" style={{
        padding: '11px 28px', borderRadius: '999px',
        backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
        textDecoration: 'none', fontSize: '14px', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: '7px',
      }}>
        <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
        Browse hospitals
      </Link>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Data
  const doctor: MockDoctor | null = useMemo(() => (id ? getDoctorById(id) : null), [id]);
  const hospital: MockHospital | null = useMemo(() => (doctor ? getHospitalById(doctor.hospitalId) : null), [doctor]);
  const reviews: MockDoctorReview[] = useMemo(() => (doctor ? getReviewsByDoctor(doctor._id) : []), [doctor]);
  const slotDays: SlotDay[] = useMemo(() => (doctor ? getSlotPreview(doctor._id) : []), [doctor]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), LOAD_DELAY_MS);
    return () => clearTimeout(t);
  }, [id]);

  const handleBookAppointment = () => {
    if (!doctor) return;
    const targetUrl = `/app/book/${doctor._id}`;
    if (isAuthenticated) {
      navigate(targetUrl);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(targetUrl)}`);
    }
  };

  // ── 404 ──
  if (!loading && !doctor) return <DoctorNotFound />;

  // ── Loading ──
  if (loading) return <DoctorProfileSkeleton />;

  const d = doctor!;
  const h = hospital!;

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .date-strip {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 8px;
        }
        .date-strip::-webkit-scrollbar { display: none; }
        .slot-card {
          flex: 0 0 auto;
          width: 140px;
          border-radius: 12px;
          border: 1px solid rgba(154,110,86,0.15);
          background-color: rgba(154,110,86,0.03);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          cursor: pointer;
          transition: transform 0.15s, border-color 0.15s, background-color 0.15s;
        }
        .slot-card:hover {
          transform: translateY(-2px);
          border-color: rgba(154,110,86,0.35);
          background-color: var(--color-base);
          box-shadow: 0 4px 12px rgba(25,8,1,0.05);
        }
        .slot-pill {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-ink);
          background-color: rgba(154,110,86,0.1);
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-block;
          margin-bottom: 4px;
        }
        /* Mobile sticky CTA bar */
        .mobile-book-bar {
          display: none;
        }
        @media (max-width: 768px) {
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
          .desktop-book-btn {
            display: none !important;
          }
          .header-band-content {
            flex-direction: column;
            align-items: flex-start !important;
          }
          .header-avatar {
            width: 72px !important;
            height: 72px !important;
            font-size: 20px !important;
            border-radius: 20px !important;
          }
        }
      `}</style>

      {/* ── Header band ── */}
      <section style={{
        backgroundColor: 'var(--color-ink)',
        padding: '36px 24px 40px',
        animation: 'fadeIn 0.4s ease',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" style={{
            marginBottom: '24px', display: 'flex', alignItems: 'center',
            gap: '6px', flexWrap: 'wrap',
          }}>
            <Link to="/hospitals" style={{ fontSize: '12px', color: 'rgba(253,249,240,0.4)', textDecoration: 'none' }}>Hospitals</Link>
            <ChevronRight size={12} color="rgba(253,249,240,0.25)" />
            {h && (
              <>
                <Link to={`/hospitals/${h._id}`} style={{ fontSize: '12px', color: 'rgba(253,249,240,0.4)', textDecoration: 'none' }}>{h.name}</Link>
                <ChevronRight size={12} color="rgba(253,249,240,0.25)" />
              </>
            )}
            <span style={{ fontSize: '12px', color: 'rgba(253,249,240,0.8)', fontWeight: 500 }}>{d.name}</span>
          </nav>

          {/* Profile Content */}
          <div className="header-band-content" style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
            
            {/* Avatar */}
            <div className="header-avatar" style={{
              width: '100px', height: '100px', borderRadius: '24px', flexShrink: 0,
              background: AVATAR_GRADIENTS[d.avatarGradient],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, color: 'rgba(253,249,240,0.95)',
              letterSpacing: '0.02em', border: '1px solid rgba(253,249,240,0.1)'
            }}>
              {d.initials}
            </div>

            {/* Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <h1 style={{
                      fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800,
                      letterSpacing: '-0.02em', color: 'var(--color-base)',
                      lineHeight: 1.1, marginBottom: '6px',
                    }}>
                      {d.name}
                    </h1>
                    <p style={{ fontSize: '15px', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '10px' }}>
                      {d.specialty}
                    </p>
                    <StarRow avg={d.rating_avg} count={d.rating_count} light />
                  </div>

                  <button
                    onClick={handleBookAppointment}
                    className="desktop-book-btn"
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
                    <Calendar size={15} />
                    Book Appointment
                  </button>
                </div>
              </div>

              {/* Qual/Exp/Lang Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', backgroundColor: 'rgba(253,249,240,0.06)', border: '1px solid rgba(253,249,240,0.1)', fontSize: '12px', fontWeight: 500, color: 'rgba(253,249,240,0.8)' }}>
                  <BadgeCheck size={12} color="var(--color-accent)" strokeWidth={2} />
                  {d.qualification}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', backgroundColor: 'rgba(253,249,240,0.06)', border: '1px solid rgba(253,249,240,0.1)', fontSize: '12px', fontWeight: 500, color: 'rgba(253,249,240,0.8)' }}>
                  <UserRound size={12} color="var(--color-accent)" strokeWidth={2} />
                  {d.experience} years experience
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', backgroundColor: 'rgba(253,249,240,0.06)', border: '1px solid rgba(253,249,240,0.1)', fontSize: '12px', fontWeight: 500, color: 'rgba(253,249,240,0.8)' }}>
                  <Languages size={12} color="var(--color-accent)" strokeWidth={2} />
                  {d.languages.join(', ')}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', backgroundColor: 'rgba(253,249,240,0.06)', border: '1px solid rgba(253,249,240,0.1)', fontSize: '12px', fontWeight: 500, color: 'rgba(253,249,240,0.8)' }}>
                  <Banknote size={12} color="var(--color-accent)" strokeWidth={2} />
                  ₹{d.fee.toLocaleString()} per visit
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px 100px', display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.5s ease 0.05s both' }}>
        
        {/* 1 · Bio */}
        <div>
          <SectionTitle><Activity size={16} color="var(--color-accent)" strokeWidth={1.8} /> About {d.name}</SectionTitle>
          <p style={{ fontSize: '14px', color: 'var(--color-ink)', lineHeight: 1.7, opacity: 0.9 }}>
            {d.bio}
          </p>
        </div>

        {/* 2 · Next available slots preview */}
        <SectionCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <SectionTitle><CalendarClock size={16} color="var(--color-accent)" strokeWidth={1.8} /> Availability preview</SectionTitle>
          </div>
          <div className="date-strip">
            {slotDays.map((day) => (
              <div key={day.date} className="slot-card" onClick={handleBookAppointment}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                  {day.label}
                </span>
                {day.slots.length > 0 ? (
                  <div>
                    <span className="slot-pill">{day.slots[0]}</span>
                    {day.slots.length > 1 && (
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block', marginTop: '2px' }}>
                        + {day.slots.length - 1} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                    Fully booked
                  </span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 3 · Hospital Context */}
        {h && (
          <SectionCard>
            <SectionTitle><Building2 size={16} color="var(--color-accent)" strokeWidth={1.8} /> Consults at</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(154,110,86,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={20} color="var(--color-accent)" strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '2px' }}>
                  {h.name}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                  {h.city} • {d.specialty} Department
                </p>
              </div>
              <Link to={`/hospitals/${h._id}`} style={{
                padding: '8px 16px', borderRadius: '999px',
                border: '1.5px solid rgba(154,110,86,0.25)',
                fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)',
                textDecoration: 'none', transition: 'border-color 0.2s',
              }}>
                View Hospital
              </Link>
            </div>
          </SectionCard>
        )}

        {/* 4 · Reviews */}
        <SectionCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <SectionTitle>
              <Star size={16} fill="var(--color-accent)" color="var(--color-accent)" />
              Patient reviews
            </SectionTitle>
            {reviews.length > 0 && (
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '40px', fontWeight: 800, color: 'var(--color-ink)', lineHeight: 1, letterSpacing: '-0.04em' }}>
                    {d.rating_avg.toFixed(1)}
                  </p>
                  <MiniStars rating={Math.round(d.rating_avg)} />
                  <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                    {d.rating_count.toLocaleString()} reviews
                  </p>
                </div>
                <div style={{ minWidth: '180px', flex: 1 }}>
                  <RatingBreakdown reviews={reviews} />
                </div>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', fontStyle: 'italic' }}>
              No reviews yet. Be the first to review Dr. {d.name} after your visit.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reviews.map((rev) => (
                <ReviewCard key={rev._id} review={rev} />
              ))}
            </div>
          )}
        </SectionCard>

      </div>

      {/* ── Mobile sticky bottom CTA ── */}
      <div className="mobile-book-bar">
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 500 }}>{d.name}</p>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>₹{d.fee.toLocaleString()} / visit</p>
        </div>
        <button
          onClick={handleBookAppointment}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '12px 22px', borderRadius: '999px',
            backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
            border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700,
            fontFamily: 'var(--font-sans)', flexShrink: 0,
          }}
        >
          <Calendar size={14} /> Book now
        </button>
      </div>
    </>
  );
}
