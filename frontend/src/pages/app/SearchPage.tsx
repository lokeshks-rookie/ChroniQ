import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, MapPin, X, ChevronDown } from 'lucide-react';
import {
  mockDoctors, mockHospitals, filterDoctors, sortDoctors,
  SPECIALTIES, CITIES, ALL_LANGUAGES, AVATAR_GRADIENTS,
  getHospitalById,
  type DoctorFilters, type DoctorSortKey,
} from '@/data/mockData';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const filters: DoctorFilters = {
    query: searchParams.get('q') || '',
    specialty: searchParams.get('specialty') || '',
    hospital: searchParams.get('hospital') || '',
    city: searchParams.get('city') || '',
    gender: searchParams.get('gender') || '',
    language: searchParams.get('language') || '',
    feeMax: Number(searchParams.get('feeMax')) || 0,
    ratingMin: Number(searchParams.get('ratingMin')) || 0,
  };
  const sortKey = (searchParams.get('sort') as DoctorSortKey) || 'earliest';

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const results = useMemo(() => {
    const filtered = filterDoctors(mockDoctors, filters);
    return sortDoctors(filtered, sortKey);
  }, [filters.query, filters.specialty, filters.hospital, filters.city, filters.gender, filters.language, filters.feeMax, filters.ratingMin, sortKey]);

  const activeFilterCount = [filters.specialty, filters.city, filters.gender, filters.language, filters.feeMax > 0 ? 'yes' : '', filters.ratingMin > 0 ? 'yes' : ''].filter(Boolean).length;

  return (
    <div style={{ maxWidth: '960px' }}>
      <style>{`
        .filter-select {
          padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 500;
          border: 1.5px solid rgba(154,110,86,0.15); background: var(--color-base);
          color: var(--color-ink); font-family: var(--font-sans); cursor: pointer;
          min-width: 0; appearance: auto;
        }
        .filter-select:focus { outline: none; border-color: var(--color-accent); }
        .doctor-card { transition: border-color 0.2s, box-shadow 0.2s; }
        .doctor-card:hover { border-color: rgba(154,110,86,0.25); box-shadow: 0 4px 16px rgba(25,8,1,0.06); }
      `}</style>

      <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '24px' }}>
        Find a Doctor
      </h1>

      {/* ── Search + Filter Bar ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} color="var(--color-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text" placeholder="Search by name or specialty..."
            value={filters.query} onChange={(e) => updateParam('q', e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 40px', borderRadius: '10px',
              border: '1.5px solid rgba(154,110,86,0.15)', backgroundColor: 'var(--color-base)',
              color: 'var(--color-ink)', fontSize: '14px', fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 16px', borderRadius: '10px',
            border: `1.5px solid ${activeFilterCount > 0 ? 'var(--color-accent)' : 'rgba(154,110,86,0.15)'}`,
            backgroundColor: activeFilterCount > 0 ? 'rgba(154,110,86,0.06)' : 'var(--color-base)',
            color: 'var(--color-ink)', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          <SlidersHorizontal size={16} />
          Filters {activeFilterCount > 0 && <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '999px', backgroundColor: 'var(--color-accent)', color: 'var(--color-base)', fontWeight: 700 }}>{activeFilterCount}</span>}
        </button>
        <select className="filter-select" value={sortKey} onChange={(e) => updateParam('sort', e.target.value)}>
          <option value="earliest">Earliest available</option>
          <option value="rating">Highest rated</option>
          <option value="fee_asc">Fee: low → high</option>
        </select>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px',
          padding: '16px', borderRadius: '12px', border: '1px solid rgba(154,110,86,0.1)',
          marginBottom: '20px', backgroundColor: 'rgba(154,110,86,0.02)',
        }}>
          <select className="filter-select" value={filters.specialty} onChange={(e) => updateParam('specialty', e.target.value)}>
            <option value="">All specialties</option>
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="filter-select" value={filters.city} onChange={(e) => updateParam('city', e.target.value)}>
            <option value="">All cities</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={filters.hospital} onChange={(e) => updateParam('hospital', e.target.value)}>
            <option value="">All hospitals</option>
            {mockHospitals.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>
          <select className="filter-select" value={filters.gender} onChange={(e) => updateParam('gender', e.target.value)}>
            <option value="">Any gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select className="filter-select" value={filters.language} onChange={(e) => updateParam('language', e.target.value)}>
            <option value="">Any language</option>
            {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="filter-select" value={filters.ratingMin || ''} onChange={(e) => updateParam('ratingMin', e.target.value)}>
            <option value="">Any rating</option>
            <option value="4">4+ stars</option>
            <option value="4.5">4.5+ stars</option>
          </select>
          {activeFilterCount > 0 && (
            <button onClick={() => {
              const next = new URLSearchParams();
              if (filters.query) next.set('q', filters.query);
              setSearchParams(next, { replace: true });
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              padding: '10px', borderRadius: '10px', border: 'none',
              backgroundColor: 'rgba(192,57,43,0.08)', color: 'var(--color-danger)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              <X size={14} /> Clear all
            </button>
          )}
        </div>
      )}

      {/* ── Results Count ── */}
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '16px', fontWeight: 500 }}>
        {results.length} doctor{results.length !== 1 ? 's' : ''} found
      </p>

      {/* ── Results Grid ── */}
      {results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Search size={40} strokeWidth={1.2} color="var(--color-muted)" style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>No doctors match your filters</p>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>Try broadening your search or changing filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {results.map((doc) => {
            const hospital = getHospitalById(doc.hospitalId);
            return (
              <div
                key={doc._id}
                className="doctor-card"
                style={{
                  padding: '20px', borderRadius: '14px',
                  border: '1px solid rgba(154,110,86,0.1)',
                  backgroundColor: 'var(--color-base)',
                }}
              >
                {/* Doctor header */}
                <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                    background: AVATAR_GRADIENTS[doc.avatarGradient],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 700, color: 'var(--color-base)',
                  }}>
                    {doc.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '2px' }}>
                      {doc.name}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                      {doc.specialty} • {doc.experience} yrs
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                    <Star size={13} fill="var(--color-accent)" color="var(--color-accent)" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>{doc.rating_avg}</span>
                  </div>
                </div>

                {/* Hospital + City */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <MapPin size={13} color="var(--color-muted)" />
                  <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                    {hospital?.name || ''} • {hospital?.city || ''}
                  </span>
                </div>

                {/* Fee + Languages */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)' }}>₹{doc.fee}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{doc.languages.join(', ')}</span>
                </div>

                {/* Next available */}
                <div style={{
                  padding: '8px 12px', borderRadius: '8px',
                  backgroundColor: doc.nextSlot ? 'rgba(46,125,70,0.06)' : 'rgba(154,110,86,0.04)',
                  marginBottom: '14px',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: doc.nextSlot ? 'var(--color-success)' : 'var(--color-muted)' }}>
                    {doc.nextSlot ? `Next: ${doc.nextSlot}` : 'No slots available'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    to={`/doctors/${doc._id}`}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', textAlign: 'center',
                      border: '1.5px solid rgba(154,110,86,0.15)', backgroundColor: 'transparent',
                      fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', textDecoration: 'none',
                    }}
                  >
                    View Profile
                  </Link>
                  <Link
                    to={`/app/book/${doc._id}`}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', textAlign: 'center',
                      backgroundColor: doc.nextSlot ? 'var(--color-ink)' : 'rgba(154,110,86,0.1)',
                      color: doc.nextSlot ? 'var(--color-base)' : 'var(--color-muted)',
                      fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                      pointerEvents: doc.nextSlot ? 'auto' : 'none',
                    }}
                  >
                    Book
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
