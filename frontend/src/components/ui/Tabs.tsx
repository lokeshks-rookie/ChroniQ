import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex border-b border-ink/10 gap-2 overflow-x-auto overflow-y-hidden ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              isActive
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-ink/65 hover:text-ink hover:border-ink/20'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-ink text-base' : 'bg-ink/10 text-ink'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export interface SegmentedControlProps {
  options: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'p-0.5 text-xs' : 'p-1 text-sm';
  const itemPadding = size === 'sm' ? 'px-2.5 py-1' : 'px-3.5 py-1.5';

  return (
    <div className={`inline-flex rounded-full bg-ink/10 border border-ink/10 ${sizeClasses} ${className}`}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full ${itemPadding} font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              isSelected ? 'bg-ink text-base shadow-sm font-semibold' : 'text-ink/80 hover:text-ink'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-accent text-ink' : 'bg-ink/15 text-ink'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
