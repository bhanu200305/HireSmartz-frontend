'use client';

import { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { sanitizeInput } from '../../../shared/utils/validation/input.helpers';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  className?: string;
  error?: string;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const Input = ({
  className,
  error,
  disabled,
  prefix,
  suffix,
  onBlur,
  ...restProps
}: InputProps) => {
  const handleOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };
  const handleOnScroll = (e: React.UIEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };
  return (
    <>
      <div className="relative w-full">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 flex items-center justify-center">
            {prefix}
          </span>
        )}

        <input
          {...restProps}
          className={clsx(
            'w-full border px-3 py-2 roboto-font focus:outline-none focus:ring-2 focus:border-[var(--primary)] rounded-3xl',
            prefix && 'pl-10',
            suffix && 'pr-10',
            disabled && 'cursor-not-allowed text-gray-500',
            className
          )}
          onChange={(e) => {
            let value = e.target.value;
            value = value.replace(/^ +/, '');
            value = value.replace(/\s+/g, ' ');
            e.target.value = value;
            if (restProps.onChange) {
              restProps.onChange(e);
            }
          }}
          onBlur={(e) => {
            e.target.value = sanitizeInput(e.target.value);
            if (onBlur) {
              onBlur(e);
            }
          }}
          onWheel={handleOnWheel}
          onScroll={handleOnScroll}
          autoComplete="off"
          disabled={disabled}
        />

        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</span>}
      </div>

      {error && <p className="text-red-500 text-sm px-2 py-1">{error}</p>}
    </>
  );
};
