interface TokenBadgeProps {
  token: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Standalone token badge component.
 * Reused on booking success, queue tracker, and admin queue control.
 */
export default function TokenBadge({ token, size = 'md' }: TokenBadgeProps) {
  const sizes = {
    sm: { fontSize: '13px', padding: '4px 10px', borderRadius: '8px' },
    md: { fontSize: '16px', padding: '8px 16px', borderRadius: '10px' },
    lg: { fontSize: '22px', padding: '12px 24px', borderRadius: '12px' },
  };
  const s = sizes[size];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: s.padding, borderRadius: s.borderRadius,
      backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
      fontSize: s.fontSize, fontWeight: 800, letterSpacing: '0.06em',
      fontFamily: 'var(--font-sans)',
    }}>
      {token}
    </span>
  );
}
