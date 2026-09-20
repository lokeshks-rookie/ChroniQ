import React from 'react';
import { Card } from './Card';
import { Sparkline } from './LiveIndicator';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface StatCardProps {
  eyebrow?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    delta: string;
    isPositive?: boolean;
    label?: string;
  };
  sparklineData?: number[];
  variant?: 'base' | 'ink' | 'accent';
  action?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  eyebrow,
  title,
  value,
  subtitle,
  trend,
  sparklineData,
  variant = 'base',
  action,
}) => {
  const isDark = variant === 'ink';

  return (
    <Card
      tilt
      tiltLimit={18}
      scale={1.05}
      perspective={900}
      variant={variant}
      padding="md"
      className="flex flex-col justify-between cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          {eyebrow && (
            <div className={`eyebrow ${isDark ? 'eyebrow-light' : ''}`}>
              <span>{eyebrow}</span>
            </div>
          )}
          {action}
        </div>

        <div className={`text-sm font-medium ${isDark ? 'text-base/80' : 'text-ink/70'}`}>
          {title}
        </div>

        <div className="flex items-baseline justify-between mt-2 gap-2">
          <div className={`text-3xl lg:text-4xl font-semibold tracking-tight tabular-nums ${isDark ? 'text-base' : 'text-ink'}`}>
            {value}
          </div>

          {sparklineData && (
            <Sparkline
              data={sparklineData}
              width={72}
              height={28}
              color={isDark ? 'accent' : 'accent'}
            />
          )}
        </div>
      </div>

      {(subtitle || trend) && (
        <div
          className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-base/10 text-base/70' : 'border-ink/10 text-ink/70'
          }`}
        >
          {trend && (
            <div className="flex items-center gap-1 font-medium">
              {trend.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-success" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-danger" />
              )}
              <span className={trend.isPositive ? 'text-success' : 'text-danger'}>
                {trend.delta}
              </span>
              {trend.label && <span>{trend.label}</span>}
            </div>
          )}

          {subtitle && <div>{subtitle}</div>}
        </div>
      )}
    </Card>
  );
};

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  defaultOpenId?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ items, defaultOpenId }) => {
  const [openId, setOpenId] = React.useState<string | undefined>(defaultOpenId);

  const toggle = (id: string) => {
    setOpenId((curr) => (curr === id ? undefined : id));
  };

  return (
    <div>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="accordion-row">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between text-left font-medium text-base text-ink cursor-pointer group"
            >
              <span>{item.title}</span>
              <span className="w-6 h-6 rounded-full border border-ink/20 flex items-center justify-center text-sm group-hover:bg-ink/5 transition-colors">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && <div className="mt-3 text-sm text-ink/80 leading-relaxed">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
};
