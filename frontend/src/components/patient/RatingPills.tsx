import React from 'react';
import { Star } from 'lucide-react';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

interface RatingPillsProps {
  value: number;
  onChange: (value: number) => void;
  name: string;
  disabled?: boolean;
}

/**
 * Accessible 1–5 rating pill buttons with star icons.
 * Pills up to the selected value use accent fill with ink text;
 * the rest are ink outline. No filled stars (per brand guidelines).
 */
export const RatingPills: React.FC<RatingPillsProps> = ({
  value,
  onChange,
  name,
  disabled = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, n: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(5, n + 1);
      onChange(next);
      // Focus the next pill
      const nextEl = document.getElementById(`${name}-pill-${next}`);
      nextEl?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(1, n - 1);
      onChange(prev);
      const prevEl = document.getElementById(`${name}-pill-${prev}`);
      prevEl?.focus();
    }
  };

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label={`${name} rating`}
        className="flex items-center gap-2 flex-wrap"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = n <= value;
          return (
            <button
              key={n}
              id={`${name}-pill-${n}`}
              type="button"
              role="radio"
              aria-checked={n === value}
              aria-label={`${n} out of 5, ${LABELS[n]}`}
              tabIndex={n === value || (value === 0 && n === 1) ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(n)}
              onKeyDown={(e) => handleKeyDown(e, n)}
              className={`inline-flex items-center gap-1.5 h-12 px-4 rounded-full text-sm font-medium transition-all duration-150 select-none cursor-pointer
                ${isSelected
                  ? 'bg-accent text-ink'
                  : 'bg-transparent border border-ink/20 text-ink hover:bg-ink/5'
                }
                ${disabled ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              <Star className="w-4 h-4" strokeWidth={1.75} />
              {n}
            </button>
          );
        })}
      </div>
      {value > 0 && (
        <p className="text-sm text-muted ml-1">{LABELS[value]}</p>
      )}
    </div>
  );
};

// ==========================================
// Read-only rating badge (star icon + number + count)
// ==========================================

interface RatingBadgeProps {
  avg: number;
  count: number;
  className?: string;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  avg,
  count,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1 text-sm text-muted ${className}`}
    aria-label={`${avg} out of 5 from ${count} reviews`}
  >
    <Star className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
    <span className="font-medium text-ink">{avg.toFixed(1)}</span>
    <span className="text-xs">· {count.toLocaleString('en-IN')} {count === 1 ? 'review' : 'reviews'}</span>
  </span>
);
