import React from 'react';

export interface TokenBadgeProps {
  token: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export const TokenBadge: React.FC<TokenBadgeProps> = ({ token, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-semibold tracking-wider',
    md: 'text-sm px-2.5 py-1 font-semibold tracking-wider',
    lg: 'text-lg px-3.5 py-1.5 font-bold tracking-widest',
    hero: 'text-4xl md:text-5xl px-6 py-3 font-extrabold tracking-widest',
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center font-mono rounded-lg bg-ink text-base select-all border border-ink/20 ${sizeClasses} ${className}`}
    >
      {token}
    </span>
  );
};
