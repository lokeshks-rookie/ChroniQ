import React from 'react';

export interface DepartmentIconProps extends React.SVGProps<SVGSVGElement> {
  name?: string;
  prefix?: string;
  className?: string;
}

/**
 * Emoji-inspired medical department SVG icons styled strictly with the app's ink palette.
 * Replaces cramped text acronyms (CARD, GENM, ORTH, etc.) with recognizable glyphs.
 */
export const DepartmentIcon: React.FC<DepartmentIconProps> = ({
  name = '',
  prefix = '',
  className = 'w-5 h-5',
  ...props
}) => {
  const normKey = `${name} ${prefix}`.toLowerCase();

  // Cardiology (inspired by ❤️ heart)
  if (normKey.includes('card') || normKey.includes('heart')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        className={className}
        aria-label="Cardiology"
        {...props}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }

  // General Medicine (inspired by 🩺 stethoscope / 💊 pill)
  if (normKey.includes('gen') || normKey.includes('med') || normKey.includes('internal')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="General Medicine"
        {...props}
      >
        {/* Stethoscope glyph */}
        <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
        <path d="M9 12.5v3.5a3.5 3.5 0 0 0 7 0v-1" />
        <circle cx="16" cy="13" r="2.5" fill="currentColor" />
        <path d="M3.5 3h2" />
        <path d="M12.5 3h2" />
      </svg>
    );
  }

  // Orthopedics (inspired by 🦴 bone)
  if (normKey.includes('orth') || normKey.includes('bone') || normKey.includes('joint')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-label="Orthopedics"
        {...props}
      >
        <path d="M19.5 4.5a2.5 2.5 0 0 0-3.54 0l-1.06 1.06-7.4-1.48a2.5 2.5 0 0 0-2.9 2.9l1.48 7.4-1.06 1.06a2.5 2.5 0 1 0 3.54 3.54l1.06-1.06 7.4 1.48a2.5 2.5 0 0 0 2.9-2.9l-1.48-7.4 1.06-1.06a2.5 2.5 0 0 0 0-3.54zm-8.84 8.84a1 1 0 0 1-1.41-1.41l5.65-5.65a1 1 0 0 1 1.41 1.41l-5.65 5.65z" />
      </svg>
    );
  }

  // Pediatrics (inspired by 👶 baby / 🧸 child)
  if (normKey.includes('pedi') || normKey.includes('child') || normKey.includes('baby')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Pediatrics"
        {...props}
      >
        <circle cx="12" cy="12" r="8" />
        <circle cx="9" cy="10.5" r="1" fill="currentColor" />
        <circle cx="15" cy="10.5" r="1" fill="currentColor" />
        <path d="M9.5 15a3 3 0 0 0 5 0" />
        <path d="M12 4a3 3 0 0 0 0-3" />
      </svg>
    );
  }

  // Dermatology (inspired by ✨ sparkles / 🧴 skin)
  if (normKey.includes('derm') || normKey.includes('skin')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-label="Dermatology"
        {...props}
      >
        <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z" />
        <path d="M19 15l1.2 2.8L23 19l-2.8 1.2L19 23l-1.2-2.8L15 19l2.8-1.2L19 15z" opacity="0.75" />
        <path d="M5 16l1 2.2L8.2 19 6 20l-1 2.2L4 20l-2.2-1L4 18.2 5 16z" opacity="0.6" />
      </svg>
    );
  }

  // ENT (Ear, Nose, Throat - inspired by 👂 ear)
  if (normKey.includes('ent') || normKey.includes('ear') || normKey.includes('throat')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="ENT"
        {...props}
      >
        <path d="M6 8.5a6 6 0 0 1 12 0c0 7-6 7.5-6 11.5" />
        <path d="M8.5 10a3 3 0 0 1 6 0c0 3-3 3.5-3 5.5" />
        <circle cx="11.5" cy="18.5" r="1.5" fill="currentColor" />
      </svg>
    );
  }

  // Gynaecology / Obstetrics (inspired by 🌸 blossom)
  if (normKey.includes('gyno') || normKey.includes('obs') || normKey.includes('women')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Gynaecology"
        {...props}
      >
        <circle cx="12" cy="9" r="6" />
        <path d="M12 15v7" />
        <path d="M9 18h6" />
      </svg>
    );
  }

  // Ophthalmology (inspired by 👁️ eye)
  if (normKey.includes('opht') || normKey.includes('eye')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Ophthalmology"
        {...props}
      >
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    );
  }

  // Neurology (inspired by 🧠 brain)
  if (normKey.includes('neur') || normKey.includes('brain')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Neurology"
        {...props}
      >
        <path d="M9.5 2A4.5 4.5 0 0 0 5 6.5C5 7.7 5.5 8.8 6.3 9.6A5 5 0 0 0 5 13.5c0 1.2.5 2.3 1.3 3.1A4.5 4.5 0 0 0 10.5 21" />
        <path d="M14.5 2A4.5 4.5 0 0 1 19 6.5c0 1.2-.5 2.3-1.3 3.1A5 5 0 0 1 19 13.5c0 1.2-.5 2.3-1.3 3.1A4.5 4.5 0 0 1 13.5 21" />
        <path d="M12 3v17" />
      </svg>
    );
  }

  // Fallback: Medical cross badge 🏥
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-label="Clinical Department"
      {...props}
    >
      <path d="M19 10.5h-5.5V5a1.5 1.5 0 0 0-3 0v5.5H5a1.5 1.5 0 0 0 0 3h5.5V19a1.5 1.5 0 0 0 3 0v-5.5H19a1.5 1.5 0 0 0 0-3z" />
    </svg>
  );
};
