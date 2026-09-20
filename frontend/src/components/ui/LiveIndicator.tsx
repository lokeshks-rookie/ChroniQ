import React from 'react';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: 'ink' | 'accent' | 'danger' | 'success';
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 80,
  height = 24,
  color = 'accent',
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const colorVar = {
    ink: 'var(--color-ink)',
    accent: 'var(--color-accent)',
    danger: 'var(--color-danger)',
    success: 'var(--color-success)',
  }[color];

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <polyline
        fill="none"
        stroke={colorVar}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export interface LiveIndicatorProps {
  label?: string;
  className?: string;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  label = 'Updated just now',
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2 text-xs font-medium text-ink/75 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping motion-reduce:hidden absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      <span>{label}</span>
    </div>
  );
};
