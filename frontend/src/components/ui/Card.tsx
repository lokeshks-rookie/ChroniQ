import React from 'react';
import { TiltCard } from './tilt-card';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'base' | 'ink' | 'accent' | 'cream';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'card' | 'panel';
  tilt?: boolean;
  tiltLimit?: number;
  scale?: number;
  perspective?: number;
  effect?: 'gravitate' | 'evade';
  spotlight?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'base',
      padding = 'md',
      radius = 'card',
      tilt = false,
      tiltLimit = 15,
      scale = 1.04,
      perspective = 1000,
      effect = 'evade',
      spotlight = true,
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

    const combinedClassName = `${variantClasses} ${paddingClasses} ${radiusClasses} ${className}`;

    if (!tilt) {
      return (
        <div
          ref={ref}
          className={`${combinedClassName} transition-colors`}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <TiltCard
        ref={ref}
        tiltLimit={tiltLimit}
        scale={scale}
        perspective={perspective}
        effect={effect}
        spotlight={spotlight}
        className={combinedClassName}
        {...props}
      >
        {children}
      </TiltCard>
    );
  }
);

Card.displayName = 'Card';

