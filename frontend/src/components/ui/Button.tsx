import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverted';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  showArrowBadge?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      icon,
      showArrowBadge = variant === 'primary',
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    }[size];

    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'bg-transparent text-ink font-medium rounded-lg hover:bg-ink/5 active:bg-ink/10 transition-colors inline-flex items-center justify-center',
      danger: 'bg-danger text-base font-medium rounded-full hover:opacity-90 active:scale-[0.98] transition-all inline-flex items-center justify-center shadow-sm',
      inverted: 'bg-base text-ink font-medium rounded-full hover:bg-base/90 active:scale-[0.98] transition-all inline-flex items-center justify-center shadow-sm',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`btn ${variantClasses} disabled:opacity-50 disabled:pointer-events-none ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" strokeWidth={1.75} />
        ) : (
          icon
        )}
        <span>{children}</span>

        {showArrowBadge && !isLoading && (
          <span className="icon-badge">
            <ArrowRight className="w-3 h-3" strokeWidth={2} />
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
