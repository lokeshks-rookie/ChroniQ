import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Stethoscope, Building2 } from 'lucide-react';
import { SPECIALTIES, CITIES } from '@/data/mockData';

export default function SearchBar() {
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState('');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (specialty) params.set('specialty', specialty);
    if (query) params.set('q', query);
    if (city) params.set('city', city);
    navigate(`/hospitals?${params.toString()}`);
  };

  const inputBase: React.CSSProperties = {
    flex: 1,
    minWidth: '180px',
    height: '100%',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-sans)',
  };

  const fieldWrapper: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: '200px',
    padding: '0 20px',
    height: '56px',
  };

  return (
    <section
      style={{
        backgroundColor: 'var(--color-ink)',
        paddingBottom: '0',
      }}
    >
      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '0 24px',
          transform: 'translateY(50%)',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-base)',
            borderRadius: '20px',
            boxShadow: '0 8px 64px rgba(25,8,1,0.35)',
            overflow: 'hidden',
            border: '1px solid rgba(154,110,86,0.12)',
          }}
        >
          {/* Header label */}
          <div
            style={{
              padding: '16px 24px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="eyebrow">■ Quick search</span>
          </div>

          {/* Search form */}
          <form
            onSubmit={handleSearch}
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0',
              padding: '8px 8px 12px',
            }}
          >
            {/* Specialty */}
            <div style={fieldWrapper}>
              <Stethoscope
                size={18}
                color="var(--color-accent)"
                strokeWidth={1.8}
                style={{ flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="search-specialty"
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'var(--color-muted)',
                    marginBottom: '2px',
                  }}
                >
                  Specialty
                </label>
                <select
                  id="search-specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  style={{
                    ...inputBase,
                    width: '100%',
                    cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  <option value="">Any specialty</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Divider */}
            <div
              aria-hidden
              style={{
                width: '1px',
                height: '32px',
                backgroundColor: 'rgba(154,110,86,0.2)',
                flexShrink: 0,
              }}
            />

            {/* Doctor / Hospital name */}
            <div style={fieldWrapper}>
              <Building2
                size={18}
                color="var(--color-accent)"
                strokeWidth={1.8}
                style={{ flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="search-query"
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'var(--color-muted)',
                    marginBottom: '2px',
                  }}
                >
                  Doctor / Hospital
                </label>
                <input
                  id="search-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name or hospital..."
                  style={inputBase}
                />
              </div>
            </div>

            {/* Divider */}
            <div
              aria-hidden
              style={{
                width: '1px',
                height: '32px',
                backgroundColor: 'rgba(154,110,86,0.2)',
                flexShrink: 0,
              }}
            />

            {/* City */}
            <div style={fieldWrapper}>
              <MapPin
                size={18}
                color="var(--color-accent)"
                strokeWidth={1.8}
                style={{ flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="search-city"
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'var(--color-muted)',
                    marginBottom: '2px',
                  }}
                >
                  City
                </label>
                <select
                  id="search-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{
                    ...inputBase,
                    width: '100%',
                    cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  <option value="">Any city</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search button */}
            <div style={{ padding: '0 4px' }}>
              <button
                type="submit"
                id="search-submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 24px',
                  height: '48px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--color-ink)',
                  color: 'var(--color-base)',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s, transform 0.15s',
                  fontFamily: 'var(--font-sans)',
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
                <Search size={16} strokeWidth={2.5} />
                Search
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
