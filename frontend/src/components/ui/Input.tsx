import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-ink/50 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-10 px-3.5 ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} rounded-card bg-base text-ink border ${
              error ? 'border-danger' : 'border-ink/15 hover:border-ink/30'
            } text-sm placeholder:text-ink/40 transition-colors focus-visible:border-ink focus-visible:outline-none disabled:opacity-50 disabled:bg-ink/5 ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-ink/50 flex items-center">{rightIcon}</div>
          )}
        </div>
        {error && <p className="text-xs text-danger font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-ink/60">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
