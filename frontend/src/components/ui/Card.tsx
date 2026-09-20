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
      base: 'card',
      ink: 'card card-ink',
      accent: 'card bg-accent text-ink border border-accent/20',
      cream: 'card card-cream',
    }[variant];

    const paddingClasses = {
      none: '!p-0',
      sm: '!p-4',
      md: '', /* defaults to normal card padding */
      lg: '!p-8',
    }[padding];

    const radiusClasses = {
      card: '', /* defaults to normal card radius */
      panel: '!rounded-xl',
    }[radius];

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
