'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';
import { MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { FilterSelectIcon } from './FilterSelectIcon';

interface SelectProps {
  options: { label: string; value: string; disabled?: boolean }[];
  className?: string;
  appname: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
  prefix?: ReactNode;
  showFilterIcon?: boolean;
}

export const Select = ({
  options,
  className,
  onChange,
  placeholder,
  value,
  prefix,
  showFilterIcon = false,
}: SelectProps) => {
  const leadingIcon = prefix ?? (showFilterIcon ? <FilterSelectIcon /> : null);

  return (
    <div className="relative w-full">
      {leadingIcon && (
        <span className="absolute inset-y-0 left-3 z-[1] flex items-center pointer-events-none">
          {leadingIcon}
        </span>
      )}
      <select
        className={clsx(
          'border border-[var(--border)] rounded-full py-2 w-full min-h-9',
          'bg-white text-gray-800 focus:outline-none appearance-none',
          leadingIcon ? 'pl-9 pr-9' : 'pl-4 pr-9',
          className
        )}
        onChange={(e) => onChange?.(e.target.value)}
        value={value}
        defaultValue={value === undefined ? '' : undefined}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        <MdOutlineKeyboardArrowDown className="text-gray-800 text-lg" />
      </div>
    </div>
  );
};
