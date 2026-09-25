import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Input } from './input';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface PasswordInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'prefix'
> {
  className?: string;
  error?: string;
  disabled?: boolean;
  /** A leading icon (e.g. a lock glyph) — several existing password fields
   * already use this. The trailing slot is always the reveal toggle. */
  prefix?: ReactNode;
  noAutoCapitalize?: boolean;
}

/**
 * A password field with a reveal toggle, per OWASP's Authentication Cheat
 * Sheet: masked by default, revealed only on an explicit click, never
 * auto-shown. Typing is never blocked — revealing is purely a "look, don't
 * touch" state; the moment a keystroke actually changes the value, it
 * re-masks itself, so a shoulder-surfer never gets a free look at whatever
 * gets typed next.
 */
export const PasswordInput = ({ onChange, ...rest }: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      {...rest}
      type={showPassword ? 'text' : 'password'}
      onChange={(e) => {
        if (showPassword) setShowPassword(false);
        onChange?.(e);
      }}
      suffix={
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className="cursor-pointer text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
        </button>
      }
    />
  );
};

export default PasswordInput;
