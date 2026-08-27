import { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import {
  sanitizeInput,
  capitalizeFirstLetter,
} from '../../../shared/utils/validation/input.helpers';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  error?: string;
  disabled?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  /** Opt out of the automatic first-letter capitalization every other
   * textarea gets — for anything where the value's exact leading case
   * matters (a code snippet, a field meant to be pasted verbatim, etc.). */
  noAutoCapitalize?: boolean;
}

export const Textarea = ({
  className,
  error,
  disabled,
  onBlur,
  noAutoCapitalize,
  ...restProps
}: TextareaProps) => {
  return (
    <>
      <textarea
        {...restProps}
        className={clsx(
          'border px-3 py-2 rounded-md resize-none w-full focus:outline-none',
          disabled && 'bg-gray-100 cursor-not-allowed text-gray-500',
          error && 'border-red-500',
          className
        )}
        onChange={(e) => {
          if (!noAutoCapitalize) {
            e.target.value = capitalizeFirstLetter(e.target.value);
          }
          restProps.onChange?.(e);
        }}
        onBlur={(e) => {
          e.target.value = sanitizeInput(e.target.value);
          onBlur?.(e);
        }}
        disabled={disabled}
      />
      {error && <p className="text-red-500 text-sm px-2 py-1">{error}</p>}
    </>
  );
};
