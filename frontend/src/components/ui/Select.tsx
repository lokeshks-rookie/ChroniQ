import React, { useMemo } from 'react';
import { Dropdown, DropdownOption } from './Dropdown';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options?: SelectOption[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement> | { target: { value: string; name?: string } }) => void;
  triggerClassName?: string;
  menuClassName?: string;
  placement?: 'auto' | 'top' | 'bottom';
  align?: 'left' | 'right';
  triggerIcon?: React.ReactNode;
  width?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      children,
      className = '',
      triggerClassName,
      menuClassName,
      placement = 'auto',
      align = 'left',
      triggerIcon,
      width = 'w-full',
      id,
      value,
      defaultValue,
      onChange,
      disabled,
      placeholder,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    const parsedOptions = useMemo<DropdownOption<string | number>[]>(() => {
      if (options && options.length > 0) {
        return options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          disabled: opt.disabled,
          icon: opt.icon,
        }));
      }

      if (children) {
        const opts: DropdownOption<string | number>[] = [];
        React.Children.forEach(children, (child) => {
          if (React.isValidElement(child) && child.type === 'option') {
            const childProps = child.props as {
              value?: string | number;
              children?: React.ReactNode;
              disabled?: boolean;
            };
            opts.push({
              value: childProps.value !== undefined ? childProps.value : String(childProps.children || ''),
              label: String(childProps.children ?? childProps.value ?? ''),
              disabled: childProps.disabled,
            });
          }
        });
        return opts;
      }

      return [];
    }, [options, children]);

    const handleChange = (val: string | number, opt: DropdownOption<string | number>) => {
      if (onChange) {
        onChange({
          target: {
            value: String(val),
            name: props.name,
          },
        } as any);
      }
    };

    return (
      <div className={cn('w-full', className)}>
        {/* Hidden native select for form submission or ref access if needed */}
        <select
          ref={ref}
          id={selectId}
          value={value !== undefined ? String(value) : undefined}
          defaultValue={defaultValue !== undefined ? String(defaultValue) : undefined}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only pointer-events-none"
          {...props}
        >
          {parsedOptions.map((opt) => (
            <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Premium Skadoosh / Reddit UI Dropdown */}
        <Dropdown<string | number>
          id={selectId ? `${selectId}_dropdown` : undefined}
          label={label}
          error={error}
          hint={hint}
          options={parsedOptions}
          value={value as string | number | undefined}
          defaultValue={defaultValue as string | number | undefined}
          onChange={handleChange}
          placeholder={placeholder || 'Select...'}
          triggerIcon={triggerIcon}
          triggerClassName={cn('w-full justify-between', triggerClassName)}
          menuClassName={menuClassName}
          placement={placement}
          align={align}
          width={width}
          disabled={disabled}
          className="w-full"
        />
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
