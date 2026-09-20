import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'active' | 'outline' | 'accent' | 'cream' | 'danger' | 'success';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs';

  const variantClasses = {
    default: 'bg-ink text-base font-medium',
    active: 'bg-accent text-ink font-medium',
    outline: 'border border-ink/20 text-ink bg-transparent font-medium',
    accent: 'bg-accent text-ink font-medium',
    cream: 'bg-cream text-ink font-medium',
    danger: 'bg-danger/15 text-danger border border-danger/30 font-medium',
    success: 'bg-success/15 text-success border border-success/30 font-medium',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full select-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
