import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../../../constants/app.constants';

/**
 * Mirrors authentication-service's password policy exactly
 * (app/modules/auth/domain/services/password_policy.py, PasswordPolicy
 * .violations) — length AND character-class composition. The backend
 * re-added composition rules on top of length when the max length was
 * capped at 16 (2026-09-26): NIST's "skip composition" advice assumes users
 * may fall back to a long passphrase, and a 16-character cap removes that
 * option. This list is the single source both the zod validator
 * (input.helpers.ts's `passwordValidation`) and the live on-screen
 * checklist (`PasswordRequirementsChecklist`) read from, so the two can
 * never drift apart from each other the way the validator alone once
 * drifted from the backend.
 */
export type PasswordRequirement = {
  key: string;
  /** Short phrase for the live checklist, e.g. "An uppercase letter (A-Z)". */
  label: string;
  /** Full sentence for the validation error list, e.g. "Password must contain…". */
  message: string;
  test: (value: string) => boolean;
};

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    key: 'length',
    label: `${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters`,
    message: `Password must be ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters long.`,
    test: (value) => value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH,
  },
  {
    key: 'uppercase',
    label: 'An uppercase letter (A-Z)',
    message: 'Password must contain an uppercase letter (A-Z).',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    key: 'lowercase',
    label: 'A lowercase letter (a-z)',
    message: 'Password must contain a lowercase letter (a-z).',
    test: (value) => /[a-z]/.test(value),
  },
  {
    key: 'number',
    label: 'A number (0-9)',
    message: 'Password must contain a number (0-9).',
    test: (value) => /[0-9]/.test(value),
  },
  {
    key: 'special',
    // Deliberately narrower than the backend's "anything not a letter,
    // digit or whitespace" definition — see password_policy.py's module
    // docstring — so a password this list accepts is never rejected there.
    label: 'A special character (e.g. ! @ # $ %)',
    message: 'Password must contain a special character (e.g. ! @ # $ %).',
    test: (value) => /[^A-Za-z0-9\s]/.test(value),
  },
];
