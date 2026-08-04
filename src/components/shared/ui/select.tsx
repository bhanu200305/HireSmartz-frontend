'use client';

import clsx from 'clsx';
import { MdOutlineKeyboardArrowDown } from 'react-icons/md';

interface SelectProps {
  options: { label: string; value: string; disabled?: boolean }[];
  className?: string;
  appname: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
}

export const Select = ({ options, className, onChange, placeholder, value }: SelectProps) => {
  return (
    <div className="relative w-full">
      <select
        className={clsx(
          'border border-gray-300 rounded-3xl pl-4 pr-9 py-2 w-full',
          'bg-white text-gray-700 focus:outline-none focus:ring-2 appearance-none',
          'flex items-center justify-between',
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
        <MdOutlineKeyboardArrowDown className="text-gray-600 text-lg" />
      </div>
    </div>
  );
};
