import React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', id, ...props }, ref) => {
    const checkId = id || (typeof label === 'string' ? `chk_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    return (
      <div className="flex items-start gap-2.5">
        <input
          ref={ref}
          id={checkId}
          type="checkbox"
          className={`mt-0.5 w-4 h-4 rounded border border-ink/30 text-ink accent-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 cursor-pointer ${className}`}
          {...props}
        />
        {(label || description) && (
          <div className="text-sm">
            {label && (
              <label htmlFor={checkId} className="font-medium text-ink cursor-pointer select-none">
                {label}
              </label>
            )}
            {description && <p className="text-xs text-ink/65 select-none">{description}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
