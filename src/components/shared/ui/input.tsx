'use client';

import { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import {
  sanitizeInput,
  capitalizeFirstLetter,
} from '../../../shared/utils/validation/input.helpers';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  className?: string;
  error?: string;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Opt out of the automatic first-letter capitalization every other text
   * field on this component gets — for a `type` not already excluded below
   * (e.g. a free-text search box, a code/ID field) where forcing the first
   * character to uppercase would be wrong even though it's technically
   * `type="text"`. */
  noAutoCapitalize?: boolean;
}

// Field types where auto-capitalizing the first character would be actively
// wrong — an email/password/URL/phone number's case is meaningful and must
// round-trip exactly as typed, and a search term should match whatever the
// user actually typed, not a guess at what they meant.
const AUTO_CAPITALIZE_EXCLUDED_TYPES = new Set([
  'email',
  'password',
  'url',
  'tel',
  'number',
  'search',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'color',
  'file',
  'hidden',
  'range',
]);

export const Input = ({
  className,
  error,
  disabled,
  prefix,
  suffix,
  onBlur,
  noAutoCapitalize,
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
            'w-full border px-4 py-2 roboto-font focus:outline-none focus:ring-2 focus:border-[var(--primary)] rounded-3xl',
            prefix && 'pl-10',
            suffix && 'pr-10',
            disabled && 'cursor-not-allowed text-gray-500',
            className
          )}
          onChange={(e) => {
            let value = e.target.value;
            value = value.replace(/^ +/, '');
            value = value.replace(/\s+/g, ' ');
            if (
              !noAutoCapitalize &&
              !AUTO_CAPITALIZE_EXCLUDED_TYPES.has(restProps.type ?? 'text')
            ) {
              value = capitalizeFirstLetter(value);
            }
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
          // Defaults to 'off', but a caller-supplied autoComplete (already
          // spread in via restProps above) wins — placing a bare "off" here
          // unconditionally would silently override it, since this JSX
          // attribute comes after the spread. That override is exactly what
          // broke the login form: Chrome ignores autocomplete="off" on
          // login-relevant fields and fills them via its password manager
          // anyway, but through an internal path that skips firing a normal
          // input event when the page explicitly opted out — so the field
          // shows text but React's controlled state (and therefore form
          // validation) never updates. Properly declaring "email" /
          // "current-password" instead makes Chrome autofill through its
          // normal, event-firing path.
          autoComplete={restProps.autoComplete || 'off'}
          disabled={disabled}
        />

        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</span>}
      </div>

      {error && <p className="text-red-500 text-sm px-2 py-1">{error}</p>}
    </>
  );
};
