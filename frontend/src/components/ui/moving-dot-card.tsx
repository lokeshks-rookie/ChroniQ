import React, { useState, useEffect } from 'react';

export interface DotCardProps extends React.HTMLAttributes<HTMLDivElement> {
  target?: number;
  duration?: number;
  children?: React.ReactNode;
  className?: string;
  outerClassName?: string;
}

export default function DotCard({
  target = 777000,
  duration = 2000,
  children,
  className = '',
  outerClassName = '',
  ...props
}: DotCardProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (children) return;
    let start = 0;
    const end = target;
    const range = end - start;
    if (range <= 0) return;
    const increment = Math.ceil(end / (duration / 50));
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(start);
    }, 50);
    return () => clearInterval(timer);
  }, [target, duration, children]);

  const display = count < 1000 ? count : `${Math.floor(count / 1000)}k`;

  return (
    <div
      className={`outer ${!children && !outerClassName ? 'w-72' : 'w-full'} ${outerClassName}`}
      {...props}
    >
      <div className="dot"></div>
      <div className="card">
        <div className="ray"></div>
        {children ? (
          <div className={`relative z-10 w-full ${className}`}>{children}</div>
        ) : (
          <div className={`flex flex-col items-center justify-center p-8 relative z-10 ${className}`}>
            <div className="text font-bold font-mono text-4xl text-ink tracking-tight">{display}</div>
            <div className="label text-xs uppercase tracking-wider text-ink/60 font-semibold mt-1">Views</div>
          </div>
        )}
        <div className="line topl"></div>
        <div className="line leftl"></div>
        <div className="line bottoml"></div>
        <div className="line rightl"></div>
      </div>
    </div>
  );
}

export { DotCard };
