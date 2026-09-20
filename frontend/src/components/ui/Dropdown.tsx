import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export interface DropdownProps<T = string> {
  options: DropdownOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T, option: DropdownOption<T>) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  triggerIcon?: React.ReactNode;
  triggerClassName?: string;
  menuClassName?: string;
  className?: string;
  placement?: 'auto' | 'top' | 'bottom';
  align?: 'left' | 'right';
  width?: string;
  disabled?: boolean;
  renderTrigger?: (props: {
    isOpen: boolean;
    selectedOption?: DropdownOption<T>;
    toggle: () => void;
    ref: React.RefObject<HTMLButtonElement | null>;
  }) => React.ReactNode;
  children?: React.ReactNode;
  id?: string;
}

export function Dropdown<T = string>({
  options = [],
  value,
  defaultValue,
  onChange,
  placeholder = 'Select option...',
  label,
  error,
  hint,
  triggerIcon,
  triggerClassName,
  menuClassName,
  className,
  placement = 'auto',
  align = 'left',
  width = 'w-56',
  disabled = false,
  renderTrigger,
  children,
  id,
}: DropdownProps<T>) {
  const [internalValue, setInternalValue] = useState<T | undefined>(
    value !== undefined ? value : defaultValue
  );
  const [isOpen, setIsOpen] = useState(false);
  const [computedPlacement, setComputedPlacement] = useState<'top' | 'bottom'>('bottom');

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync external controlled value
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const currentValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find((opt) => opt.value === currentValue);

  // Dynamic Collision Detection for Dropdown / Dropup placement
  useLayoutEffect(() => {
    if (!isOpen) return;

    if (placement && placement !== 'auto') {
      setComputedPlacement(placement);
      return;
    }

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If available space below is less than 260px and there is more space above, flip to dropup
      if (spaceBelow < 260 && spaceAbove > spaceBelow) {
        setComputedPlacement('top');
      } else {
        setComputedPlacement('bottom');
      }
    }
  }, [isOpen, placement]);

  // Handle outside clicks and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (option: DropdownOption<T>) => {
    if (option.disabled) return;

    if (option.onClick) {
      option.onClick();
    }

    if (value === undefined) {
      setInternalValue(option.value);
    }

    if (onChange) {
      onChange(option.value, option);
    }

    setIsOpen(false);
  };

  const isDropup = computedPlacement === 'top';

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block text-left', className)}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5"
        >
          {label}
        </label>
      )}

      {/* ── 1. Trigger Element ── */}
      {renderTrigger ? (
        renderTrigger({
          isOpen,
          selectedOption,
          toggle,
          ref: triggerRef,
        })
      ) : children ? (
        <div onClick={toggle} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={toggle}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            // Capsule pill height h-8 (32px), px-3, text-sm font-medium
            'h-8 px-3 rounded-full text-sm font-medium inline-flex items-center justify-between gap-2.5 transition-all duration-150 cursor-pointer select-none',
            // ChroniQ Base Background & Ink Text
            'bg-base text-ink border border-ink/15 hover:border-accent/40 hover:bg-cream/10',
            isOpen && 'border-accent/50 bg-cream/15 ring-2 ring-accent/20',
            // Focus ring: outline-none ring-2 ring-offset-1 ring-accent/30
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent/30',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            error && 'border-danger focus:ring-danger/30',
            triggerClassName
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {triggerIcon && (
              <span className="shrink-0 text-muted">
                {triggerIcon}
              </span>
            )}
            {selectedOption?.icon && !triggerIcon && (
              <span className="shrink-0 text-muted">
                {selectedOption.icon}
              </span>
            )}
            <span className={cn('truncate font-medium', !selectedOption && 'text-ink/60')}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          <ChevronDown
            size={14}
            strokeWidth={2}
            className={cn(
              'shrink-0 text-muted transition-transform duration-200',
              isOpen && 'rotate-180 text-accent'
            )}
          />
        </button>
      )}

      {/* ── 2. Floating Menu Container (Dropdown / Dropup) ── */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          tabIndex={-1}
          className={cn(
            'absolute z-50 py-2 rounded-xl border skadoosh-popover-in',
            // ChroniQ Base Surface & Border Tokens
            'bg-base text-ink border-ink/15 shadow-[0_8px_24px_rgba(25,8,1,0.08),0_2px_6px_rgba(25,8,1,0.04)]',
            // Alignment
            align === 'right' ? 'right-0' : 'left-0',
            // Dropdown vs Dropup positioning
            isDropup ? 'bottom-full mb-2' : 'top-full mt-2',
            // Width
            width,
            // Scrollable if items exceed 6
            options.length > 6 ? 'max-h-64 overflow-y-auto' : 'overflow-hidden',
            menuClassName
          )}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-xs text-center text-muted/70">
              No options available
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === currentValue;

              return (
                <React.Fragment key={String(opt.value)}>
                  {opt.divider && (
                    <div className="my-1.5 border-t border-ink/10" />
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'group flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                      opt.destructive
                        ? 'text-danger hover:bg-danger/10'
                        : isSelected
                        ? 'font-semibold text-accent-dark bg-accent/15 hover:bg-accent/20'
                        : 'text-ink hover:bg-cream/20 hover:text-ink'
                    )}
                  >
                    {opt.icon && (
                      <span
                        className={cn(
                          'shrink-0 transition-colors',
                          opt.destructive
                            ? 'text-danger'
                            : isSelected
                            ? 'text-accent'
                            : 'text-muted group-hover:text-ink'
                        )}
                      >
                        {opt.icon}
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-xs text-muted truncate mt-0.5">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-accent shrink-0 ml-2"
                      />
                    )}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>
      )}

      {error && <p className="text-xs text-danger font-medium mt-1.5">{error}</p>}
      {hint && !error && (
        <p className="text-xs text-muted mt-1.5">{hint}</p>
      )}
    </div>
  );
}

export { Dropdown as DropdownMenu };
export default Dropdown;
