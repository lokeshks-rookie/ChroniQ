import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search, MapPin, Star, Clock, ChevronDown, SlidersHorizontal,
  LayoutList, Map, X, ArrowRight, Building2, ChevronLeft,
} from 'lucide-react';
import {
  mockHospitals,
  filterHospitals,
  CITIES,
  SPECIALTIES,
  type MockHospital,
  type HospitalFilters,
} from '@/data/mockData';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;
const LOAD_DELAY_MS = 600; // simulated network delay

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countActiveFilters(f: HospitalFilters): number {
  return (
    (f.query ? 1 : 0) +
    (f.city ? 1 : 0) +
    (f.specialty ? 1 : 0) +
    (f.ratingMin > 0 ? 1 : 0) +
    (f.openNow ? 1 : 0)
  );
}

function paramsToFilters(sp: URLSearchParams): HospitalFilters {
  return {
    query: sp.get('q') ?? '',
    city: sp.get('city') ?? '',
    specialty: sp.get('specialty') ?? '',
    ratingMin: Number(sp.get('rating_min') ?? 0),
    openNow: sp.get('open_now') === '1',
  };
}

function filtersToParams(f: HospitalFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.query) sp.set('q', f.query);
  if (f.city) sp.set('city', f.city);
  if (f.specialty) sp.set('specialty', f.specialty);
  if (f.ratingMin > 0) sp.set('rating_min', String(f.ratingMin));
  if (f.openNow) sp.set('open_now', '1');
  return sp;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarDisplay({ value, count }: { value: number; count: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <Star size={13} fill="var(--color-accent)" color="var(--color-accent)" />
      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>
        {value.toFixed(1)}
      </span>
      <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 400 }}>
        ({count.toLocaleString()})
      </span>
    </span>
  );
}

function OpenPill({ open }: { open: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: open ? 'rgba(46,125,70,0.1)' : 'rgba(192,57,43,0.08)',
        color: open ? 'var(--color-success)' : 'var(--color-danger)',
        border: `1px solid ${open ? 'rgba(46,125,70,0.2)' : 'rgba(192,57,43,0.15)'}`,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: open ? 'var(--color-success)' : 'var(--color-danger)',
        }}
      />
      {open ? 'Open now' : 'Closed'}
    </span>
  );
}

function HospitalCard({ hospital }: { hospital: MockHospital }) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '14px',
        backgroundColor: 'var(--color-base)',
        border: `1px solid ${hovered ? 'rgba(154,110,86,0.35)' : 'rgba(154,110,86,0.15)'}`,
        overflow: 'hidden',
        transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 16px 48px rgba(25,8,1,0.1)' : '0 1px 4px rgba(25,8,1,0.04)',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color banner */}
      <div
        style={{
          height: '90px',
          background: 'linear-gradient(135deg, var(--color-ink) 0%, var(--color-ink-light) 100%)',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '14px 16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div aria-hidden style={{
          position: 'absolute', top: '-24px', right: '-24px',
          width: '110px', height: '110px', borderRadius: '50%',
          backgroundColor: 'rgba(154,110,86,0.15)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: '-28px', right: '32px',
          width: '72px', height: '72px', borderRadius: '50%',
          backgroundColor: 'rgba(184,140,112,0.10)',
        }} />
        {/* timings badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 10px', borderRadius: '999px',
          backgroundColor: 'rgba(253,249,240,0.12)',
          border: '1px solid rgba(253,249,240,0.15)',
          fontSize: '11px', fontWeight: 500,
          color: 'rgba(253,249,240,0.85)', position: 'relative', zIndex: 1,
        }}>
          <Clock size={10} />
          {hospital.timings}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Name row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h3 style={{
            fontSize: '15px', fontWeight: 700,
            color: 'var(--color-ink)', lineHeight: 1.3,
            letterSpacing: '-0.01em', flex: 1,
          }}>
            {hospital.name}
          </h3>
          <OpenPill open={hospital.openNow} />
        </div>

        {/* City */}
        <p style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-muted)' }}>
          <MapPin size={13} strokeWidth={1.8} color="var(--color-accent)" />
          {hospital.city}
        </p>

        {/* Rating */}
        <StarDisplay value={hospital.rating_avg} count={hospital.rating_count} />

        {/* Specialty tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {hospital.facilities.slice(0, 3).map((tag) => (
            <span key={tag} style={{
              padding: '3px 9px', borderRadius: '999px',
              backgroundColor: 'rgba(154,110,86,0.1)',
              fontSize: '11px', fontWeight: 500, color: 'var(--color-muted)',
            }}>
              {tag}
            </span>
          ))}
          {hospital.facilities.length > 3 && (
            <span style={{
              padding: '3px 9px', borderRadius: '999px',
              backgroundColor: 'rgba(154,110,86,0.06)',
              fontSize: '11px', fontWeight: 500, color: 'var(--color-accent)',
            }}>
              +{hospital.facilities.length - 3}
            </span>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 'auto', paddingTop: '12px',
          borderTop: '1px solid rgba(154,110,86,0.1)',
        }}>
          <Link
            to={`/hospitals/${hospital._id}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', width: '100%', padding: '9px 0',
              borderRadius: '999px', textDecoration: 'none',
              fontSize: '13px', fontWeight: 600,
              backgroundColor: 'var(--color-ink)',
              color: 'var(--color-base)',
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
            View Details <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      borderRadius: '14px',
      backgroundColor: 'var(--color-base)',
      border: '1px solid rgba(154,110,86,0.12)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '90px',
        background: 'linear-gradient(90deg, rgba(154,110,86,0.08) 25%, rgba(154,110,86,0.15) 50%, rgba(154,110,86,0.08) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s infinite',
      }} />
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[80, 55, 40, 100].map((w, i) => (
          <div key={i} style={{
            height: i === 0 ? '18px' : '13px',
            width: `${w}%`, borderRadius: '6px',
            background: 'linear-gradient(90deg, rgba(154,110,86,0.08) 25%, rgba(154,110,86,0.15) 50%, rgba(154,110,86,0.08) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.6s infinite',
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
        <div style={{
          marginTop: '8px', height: '36px', borderRadius: '999px',
          background: 'linear-gradient(90deg, rgba(154,110,86,0.08) 25%, rgba(154,110,86,0.15) 50%, rgba(154,110,86,0.08) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s infinite',
        }} />
      </div>
    </div>
  );
}

// ─── Rating selector ──────────────────────────────────────────────────────────

function RatingFilter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const stars = [0, 3, 3.5, 4, 4.5];
  const labels: Record<number, string> = { 0: 'Any', 3: '3+', 3.5: '3.5+', 4: '4+', 4.5: '4.5+' };
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {stars.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          style={{
            padding: '5px 12px', borderRadius: '999px', fontSize: '12px',
            fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
            backgroundColor: value === s ? 'var(--color-ink)' : 'transparent',
            color: value === s ? 'var(--color-base)' : 'var(--color-muted)',
            border: `1.5px solid ${value === s ? 'var(--color-ink)' : 'rgba(154,110,86,0.25)'}`,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {labels[s]}
        </button>
      ))}
    </div>
  );
}

// ─── Select control ───────────────────────────────────────────────────────────

function FilterSelect({
  id, label, value, onChange, options, placeholder,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void;
  options: string[]; placeholder: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '140px' }}>
      <label htmlFor={id} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%', padding: '9px 32px 9px 12px',
            borderRadius: '10px', border: '1.5px solid rgba(154,110,86,0.2)',
            backgroundColor: 'var(--color-base)', color: 'var(--color-ink)',
            fontSize: '13px', fontFamily: 'var(--font-sans)',
            appearance: 'none', cursor: 'pointer', outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(154,110,86,0.2)'; }}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} color="var(--color-accent)" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

// ─── Map placeholder ──────────────────────────────────────────────────────────

function MapPlaceholder() {
  return (
    <div style={{
      borderRadius: '16px', border: '1.5px dashed rgba(154,110,86,0.3)',
      backgroundColor: 'rgba(154,110,86,0.04)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '480px', gap: '16px', padding: '40px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '20px',
        backgroundColor: 'rgba(154,110,86,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Map size={32} color="var(--color-accent)" strokeWidth={1.5} />
      </div>
      <div>
        <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
          Map view — coming soon
        </p>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, maxWidth: '420px' }}>
          Interactive map is planned with <strong>Leaflet + OpenStreetMap</strong>.
          Add it when the team has bandwidth — the list view is fully functional in the meantime.
        </p>
      </div>
      <span style={{
        padding: '5px 14px', borderRadius: '999px',
        backgroundColor: 'rgba(59,91,165,0.08)',
        color: 'var(--color-info)', fontSize: '12px', fontWeight: 600,
        border: '1px solid rgba(59,91,165,0.15)',
      }}>
        📍 Team note: integrate Leaflet + OSM when ready
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 24px', gap: '16px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '20px',
        backgroundColor: 'rgba(154,110,86,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Building2 size={32} color="var(--color-accent)" strokeWidth={1.5} />
      </div>
      <div>
        <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
          No hospitals found
        </p>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
          Try adjusting your filters or search term.
        </p>
      </div>
      <button
        onClick={onClear}
        style={{
          padding: '10px 24px', borderRadius: '999px',
          backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
          fontSize: '14px', fontWeight: 600, border: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
          transition: 'background 0.2s',
        }}
      >
        Clear all filters
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HospitalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // ── filters live in URL params ──
  const filters = useMemo(() => paramsToFilters(searchParams), [searchParams]);

  const setFilters = useCallback((patch: Partial<HospitalFilters>) => {
    const next = { ...filters, ...patch };
    setSearchParams(filtersToParams(next), { replace: true });
    setVisibleCount(PAGE_SIZE);
  }, [filters, setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setVisibleCount(PAGE_SIZE);
  }, [setSearchParams]);

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  // ── simulate load ──
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), LOAD_DELAY_MS);
    return () => clearTimeout(t);
  }, [filters]);

  // ── filtered results ──
  const results = useMemo(() => filterHospitals(mockHospitals, filters), [filters]);
  const visible = results.slice(0, visibleCount);

  // ── close drawer on outside click ──
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [drawerOpen]);

  // ── prevent body scroll when drawer open ──
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      {/* ── Page hero band ── */}
      <section style={{
        backgroundColor: 'var(--color-ink)',
        padding: '40px 24px 40px',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link to="/" style={{ fontSize: '13px', color: 'rgba(253,249,240,0.5)', textDecoration: 'none' }}>Home</Link>
            <ChevronLeft size={13} color="rgba(253,249,240,0.3)" style={{ transform: 'rotate(180deg)' }} />
            <span style={{ fontSize: '13px', color: 'rgba(253,249,240,0.85)', fontWeight: 500 }}>Hospitals</span>
          </nav>

          <p className="eyebrow eyebrow-light" style={{ marginBottom: '12px' }}>■ Hospital directory</p>
          <h1 style={{
            fontSize: 'clamp(26px, 4vw, 42px)',
            fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--color-base)', lineHeight: 1.15,
            marginBottom: '10px',
          }}>
            Find the right hospital,<br />for your needs
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(253,249,240,0.55)', maxWidth: '480px', lineHeight: 1.6 }}>
            Browse {mockHospitals.length}+ hospitals across Tamil Nadu and beyond. Filter by city, specialty, and availability.
          </p>
        </div>
      </section>

      {/* ── Main content ── */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* ── Desktop filter bar ── */}
        <div className="hidden md:block" style={{ marginBottom: '24px' }}>
          <div style={{
            backgroundColor: 'var(--color-base)',
            border: '1px solid rgba(154,110,86,0.15)',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 2px 12px rgba(25,8,1,0.05)',
          }}>
            {/* Row 1: search + view toggle */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '20px' }}>
              {/* Text search */}
              <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="dir-search" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Search
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} color="var(--color-accent)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="dir-search"
                    type="text"
                    value={filters.query}
                    onChange={(e) => setFilters({ query: e.target.value })}
                    placeholder="Hospital name..."
                    style={{
                      width: '100%', padding: '9px 12px 9px 36px',
                      borderRadius: '10px', border: '1.5px solid rgba(154,110,86,0.2)',
                      backgroundColor: 'var(--color-base)', color: 'var(--color-ink)',
                      fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(154,110,86,0.2)'; }}
                  />
                  {filters.query && (
                    <button
                      onClick={() => setFilters({ query: '' })}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', padding: '2px' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              <FilterSelect id="dir-city" label="City" value={filters.city} onChange={(v) => setFilters({ city: v })} options={CITIES} placeholder="Any city" />
              <FilterSelect id="dir-specialty" label="Specialty" value={filters.specialty} onChange={(v) => setFilters({ specialty: v })} options={SPECIALTIES} placeholder="Any specialty" />

              {/* View toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>View</span>
                <div style={{
                  display: 'flex', borderRadius: '10px',
                  border: '1.5px solid rgba(154,110,86,0.2)',
                  overflow: 'hidden', height: '38px',
                }}>
                  {([['list', LayoutList, 'List'], ['map', Map, 'Map']] as const).map(([v, Icon, label]) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      title={label}
                      style={{
                        padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px',
                        backgroundColor: view === v ? 'var(--color-ink)' : 'transparent',
                        color: view === v ? 'var(--color-base)' : 'var(--color-muted)',
                        border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                        fontFamily: 'var(--font-sans)', transition: 'background 0.2s, color 0.2s',
                      }}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: rating + open-now + clear */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Min rating
                </span>
                <RatingFilter value={filters.ratingMin} onChange={(v) => setFilters({ ratingMin: v })} />
              </div>

              {/* Open now toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', paddingBottom: '1px' }}>
                <button
                  id="dir-open-now"
                  role="switch"
                  aria-checked={filters.openNow}
                  onClick={() => setFilters({ openNow: !filters.openNow })}
                  style={{
                    width: '40px', height: '22px', borderRadius: '999px',
                    backgroundColor: filters.openNow ? 'var(--color-success)' : 'rgba(154,110,86,0.2)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.25s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: filters.openNow ? '21px' : '3px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    backgroundColor: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    transition: 'left 0.25s',
                  }} />
                </button>
                <label htmlFor="dir-open-now" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', cursor: 'pointer' }}>
                  Open now
                </label>
              </div>

              {activeCount > 0 && (
                <button
                  onClick={clearFilters}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '7px 14px', borderRadius: '999px',
                    border: '1.5px solid rgba(154,110,86,0.25)',
                    backgroundColor: 'transparent', color: 'var(--color-muted)',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(192,57,43,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(192,57,43,0.2)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(154,110,86,0.25)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)';
                  }}
                >
                  <X size={12} /> Clear filters ({activeCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile top bar: search + view toggle ── */}
        <div className="md:hidden" style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} color="var(--color-accent)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              id="dir-search-mobile"
              type="text"
              value={filters.query}
              onChange={(e) => setFilters({ query: e.target.value })}
              placeholder="Search hospitals..."
              style={{
                width: '100%', padding: '11px 12px 11px 36px',
                borderRadius: '12px', border: '1.5px solid rgba(154,110,86,0.2)',
                backgroundColor: 'var(--color-base)', color: 'var(--color-ink)',
                fontSize: '14px', fontFamily: 'var(--font-sans)', outline: 'none',
              }}
            />
          </div>
          {/* Mobile view toggle */}
          <div style={{
            display: 'flex', borderRadius: '12px',
            border: '1.5px solid rgba(154,110,86,0.2)', overflow: 'hidden',
          }}>
            {([['list', LayoutList], ['map', Map]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '10px 12px', display: 'flex', alignItems: 'center',
                backgroundColor: view === v ? 'var(--color-ink)' : 'transparent',
                color: view === v ? 'var(--color-base)' : 'var(--color-muted)',
                border: 'none', cursor: 'pointer', transition: 'background 0.2s',
              }}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Results count row ── */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
              {results.length === 0
                ? 'No results'
                : `Showing ${Math.min(visibleCount, results.length)} of ${results.length} hospital${results.length !== 1 ? 's' : ''}`}
            </p>
            {activeCount > 0 && (
              <span style={{
                padding: '3px 10px', borderRadius: '999px', fontSize: '11px',
                fontWeight: 600, backgroundColor: 'rgba(154,110,86,0.1)',
                color: 'var(--color-accent)', border: '1px solid rgba(154,110,86,0.2)',
              }}>
                {activeCount} filter{activeCount !== 1 ? 's' : ''} active
              </span>
            )}
          </div>
        )}

        {/* ── Results ── */}
        {view === 'map' ? (
          <MapPlaceholder />
        ) : loading ? (
          <div style={{
            display: 'grid', gap: '20px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}>
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : (
          <>
            <div style={{
              display: 'grid', gap: '20px',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}>
              {visible.map((h) => <HospitalCard key={h._id} hospital={h} />)}
            </div>

            {/* Load more */}
            {visibleCount < results.length && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '40px' }}>
                <button
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  style={{
                    padding: '12px 32px', borderRadius: '999px',
                    border: '1.5px solid rgba(154,110,86,0.25)',
                    backgroundColor: 'transparent', color: 'var(--color-ink)',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-ink)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-base)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-ink)';
                  }}
                >
                  Load more hospitals
                </button>
                <p style={{ fontSize: '12px', color: 'rgba(105,68,54,0.5)' }}>
                  {results.length - visibleCount} more to show
                </p>
              </div>
            )}

            {visibleCount >= results.length && results.length > 0 && (
              <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(105,68,54,0.4)', marginTop: '40px' }}>
                You've seen all {results.length} hospitals
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Mobile: floating Filters button ── */}
      <div className="md:hidden" style={{
        position: 'fixed', bottom: '24px', left: '50%',
        transform: 'translateX(-50%)', zIndex: 40,
      }}>
        <button
          id="mobile-filters-btn"
          onClick={() => setDrawerOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', borderRadius: '999px',
            backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
            fontSize: '14px', fontWeight: 600, border: 'none',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            boxShadow: '0 8px 32px rgba(25,8,1,0.3)',
            transition: 'transform 0.2s',
          }}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeCount > 0 && (
            <span style={{
              width: '20px', height: '20px', borderRadius: '50%',
              backgroundColor: 'var(--color-accent)', color: 'var(--color-base)',
              fontSize: '11px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile bottom-sheet overlay ── */}
      {drawerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          backgroundColor: 'rgba(25,8,1,0.55)',
          backdropFilter: 'blur(2px)',
        }}>
          <div
            ref={drawerRef}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: 'var(--color-base)',
              borderRadius: '20px 20px 0 0',
              padding: '0 24px 40px',
              maxHeight: '90vh', overflowY: 'auto',
              animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '99px', backgroundColor: 'rgba(154,110,86,0.25)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 20px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>Filters</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <FilterSelect id="mob-city" label="City" value={filters.city} onChange={(v) => setFilters({ city: v })} options={CITIES} placeholder="Any city" />
              <FilterSelect id="mob-specialty" label="Specialty" value={filters.specialty} onChange={(v) => setFilters({ specialty: v })} options={SPECIALTIES} placeholder="Any specialty" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Min rating</span>
                <RatingFilter value={filters.ratingMin} onChange={(v) => setFilters({ ratingMin: v })} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  role="switch"
                  aria-checked={filters.openNow}
                  onClick={() => setFilters({ openNow: !filters.openNow })}
                  style={{
                    width: '44px', height: '24px', borderRadius: '999px',
                    backgroundColor: filters.openNow ? 'var(--color-success)' : 'rgba(154,110,86,0.2)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.25s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '4px',
                    left: filters.openNow ? '23px' : '4px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    transition: 'left 0.25s',
                  }} />
                </button>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>Open now only</span>
              </div>

              <button
                onClick={() => { setDrawerOpen(false); }}
                style={{
                  padding: '14px', borderRadius: '999px',
                  backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
                  fontSize: '15px', fontWeight: 600, border: 'none',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  marginTop: '4px',
                }}
              >
                Show {results.length} hospital{results.length !== 1 ? 's' : ''}
              </button>

              {activeCount > 0 && (
                <button
                  onClick={() => { clearFilters(); setDrawerOpen(false); }}
                  style={{
                    padding: '12px', borderRadius: '999px',
                    backgroundColor: 'transparent', color: 'var(--color-muted)',
                    fontSize: '14px', fontWeight: 500, border: '1.5px solid rgba(154,110,86,0.2)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
