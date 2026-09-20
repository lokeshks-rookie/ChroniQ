import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? `textarea_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full p-3.5 rounded-card bg-base text-ink border ${
            error ? 'border-danger' : 'border-ink/15 hover:border-ink/30'
          } text-sm placeholder:text-ink/40 transition-colors focus-visible:border-ink focus-visible:outline-none disabled:opacity-50 disabled:bg-ink/5 ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-ink/60">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

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

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, description, disabled = false }) => {
  return (
    <div className="flex items-center justify-between gap-3">
      {(label || description) && (
        <div className="space-y-0.5">
          {label && <div className="text-sm font-medium text-ink">{label}</div>}
          {description && <div className="text-xs text-ink/65">{description}</div>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-ink' : 'bg-ink/20'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-base shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
