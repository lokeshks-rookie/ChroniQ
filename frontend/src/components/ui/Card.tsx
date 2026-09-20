import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'base' | 'ink' | 'accent' | 'cream';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'card' | 'panel';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'base',
      padding = 'md',
      radius = 'card',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      base: 'bg-base text-ink border border-ink/10',
      ink: 'bg-ink text-base border border-ink/20',
      accent: 'bg-accent text-ink border border-accent/20',
      cream: 'bg-cream text-ink border border-cream/30',
    }[variant];

    const paddingClasses = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }[padding];

    const radiusClasses = radius === 'panel' ? 'rounded-panel' : 'rounded-card';

    return (
      <div
        ref={ref}
        className={`${variantClasses} ${paddingClasses} ${radiusClasses} transition-colors ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
