import React from 'react';
import { AlertCircle, RefreshCw, FolderSearch } from 'lucide-react';
import { Button } from './Button';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded bg-ink/10 ${className}`}
      {...props}
    />
  );
};

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-ink/5 flex items-center justify-center text-ink/50 mb-1">
        {icon || <FolderSearch className="w-6 h-6" strokeWidth={1.5} />}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink/65 max-w-sm">{description}</p>
      {action && (
        <div className="pt-2">
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-card border border-danger/30 bg-danger/5 text-center space-y-3 my-4">
      <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-danger">{title}</h4>
        <p className="text-xs text-ink/75 mt-1 max-w-md">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
};
