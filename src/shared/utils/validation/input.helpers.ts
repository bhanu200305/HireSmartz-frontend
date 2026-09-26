import { z } from 'zod';
import { NameValidationOptions } from '../../../types';
import {
  FORM_EMAIL_REGEX,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '../../../constants/app.constants';

// Phone-number entry is handled per-country by
// `shared/utils/validation/phoneValidation.ts` (`restrictPhoneDigits` for
// keystrokes, `phoneWithCountry` / `isPhoneValidForCountry` for validation),
// which enforces the digit count libphonenumber-js knows for the selected
// country. The old US-only helpers that used to live here — a fixed
// `(xxx) xxx-xxxx` formatter and a hard `.slice(0, 10)` — assumed every
// number was 10 digits and have been removed; use phoneValidation.ts.

export const sanitizeInput = (input: string): string => {
  return input.trim();
};

/**
 * Uppercases the first character of a string, leaving everything else
 * untouched — "new york" -> "New york", not "New York" (that would be full
 * title-casing every word, a different, more invasive behavior nobody asked
 * for here). Used by the shared `Input` component's onChange to
 * auto-capitalize as the user types; see that component's own comment for
 * which field types are deliberately excluded (email, password, etc.,
 * where forcing a case change would be wrong).
 */
export const capitalizeFirstLetter = (value: string): string => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

/**
 * Generic utility that returns the subset of `fields` whose values differ
 * between two form state snapshots.
 *
 * @template TForm - The form state object type (must be a string-keyed record)
 * @template TField - The specific subset of keys from TForm being tracked
 * @param previous - Previous form state
 * @param next - Next form state
 * @param fields - Keys to compare
 */
export const getChangedFields = <
  TForm extends Record<string, unknown>,
  TField extends keyof TForm & string,
>(
  previous: TForm,
  next: TForm,
  fields: readonly TField[]
): TField[] => fields.filter((field) => previous[field] !== next[field]);

/**
 * Generic utility that filters a map of validation errors to only those whose
 * fields have been touched by the user, unless `showAllErrors` is true.
 *
 * @template TKey - The union of field name strings
 * @param errors - Full map of validation errors for all fields
 * @param touchedFields - Map tracking which fields have been interacted with
 * @param showAllErrors - When true, returns all errors regardless of touch state
 */
export const getVisibleValidationErrors = <TKey extends string>(
  errors: Partial<Record<TKey, string>>,
  touchedFields: Partial<Record<TKey, boolean>>,
  showAllErrors: boolean
): Partial<Record<TKey, string>> => {
  if (showAllErrors) return errors;
  const filtered: Partial<Record<TKey, string>> = {};
  (Object.keys(errors) as TKey[]).forEach((field) => {
    if (touchedFields[field]) filtered[field] = errors[field];
  });
  return filtered;
};

export const websiteLinkValidation = () => {
  return z
    .string()
    .trim()
    .refine(
      (val) =>
        val === '' ||
        /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(val) ||
        /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(val),
      {
        message:
          'Please enter a valid URL (must contain a dot and at least 2 letters after the last dot, e.g. example.com).',
      }
    )
    .or(z.literal(''))
    .optional();
};

export const nameValidation = ({ label, required = true }: NameValidationOptions) =>
  z.string().superRefine((val, ctx) => {
    const value = val?.trim().replace(/\s+/g, ' ') ?? '';

    if (!value) {
      if (required) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} is required.`,
        });
      }
      return;
    }

    if (value.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} must be at least 2 characters.`,
      });
      return;
    }

    if (value.length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} cannot exceed 100 characters.`,
      });
    }
  });

/**
 * Same rules as {@link emailValidation} (candidate details, profile, etc.).
 * Returns `null` if valid, otherwise the message to show.
 */
export function getFormEmailValidationError(raw: string): string | null {
  const value = raw?.trim() ?? '';

  if (!value) {
    return 'Email is required.';
  }

  if (value.length < 5) {
    return 'Email must be at least 5 characters long.';
  }

  if (value.length > 254) {
    return 'Email must not exceed 254 characters.';
  }

  if (value.includes(' ')) {
    return 'Enter a valid email address.';
  }

  if (!FORM_EMAIL_REGEX.test(value)) {
    return 'Enter a valid email address.';
  }

  return null;
}

export const emailValidation = () => {
  return z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      const msg = getFormEmailValidationError(val);
      if (msg) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg,
        });
      }
    });
};

export const passwordValidation = () => {
  return z.string().superRefine((val, ctx) => {
    const value = val ?? '';

    // Check if password is empty
    if (!value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password is required.',
      });
      return;
    }

    // Check for control/non-printable characters
    // eslint-disable-next-line no-control-regex -- intentional: rejecting control chars in passwords
    if (/[\x00-\x1F\x7F-\x9F]/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password cannot contain control or non-printable characters.',
      });
      return;
    }

    const requirements = [
      {
        // MIN_PASSWORD_LENGTH/MAX_PASSWORD_LENGTH (app.constants.ts) must
        // match authentication-service's MIN_PASSWORD_LENGTH/
        // MAX_PASSWORD_LENGTH (app/modules/auth/domain/services/
        // password_policy.py) — the backend is the source of truth. Reading
        // the constant here, instead of a hardcoded number, is what stops
        // this check and its message from drifting out of sync with each
        // other OR with the backend again — that drift (a stale `8` here
        // while the backend already required 12) is exactly what let a
        // password pass this form and then get rejected by the API with a
        // 422 the user had no warning about.
        check: value.length >= MIN_PASSWORD_LENGTH,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      },
      {
        check: value.length <= MAX_PASSWORD_LENGTH,
        message: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
      },
      {
        check: /[A-Z]/.test(value),
        message: 'Password must contain at least one uppercase letter (A-Z).',
      },
      {
        check: /[a-z]/.test(value),
        message: 'Password must contain at least one lowercase letter (a-z).',
      },
      {
        check: /[0-9]/.test(value),
        message: 'Password must contain at least one number (0-9).',
      },
      {
        // Matches the backend's own rule: any character that is not a
        // letter, digit, or whitespace counts as special (so ~, `, £, €,
        // etc. all count too) — a narrower frontend regex here would reject
        // passwords the backend would otherwise accept.
        check: /[^A-Za-z0-9\s]/.test(value),
        message: 'Password must contain at least one special character (!@#$%^&*, etc.).',
      },
    ];

    const failed = requirements.filter((req) => !req.check);
    if (failed.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: failed.map((f) => `• ${f.message}`).join('\n'),
      });
    }
  });
};

// NOTE: phone-number zod schemas live in
// `shared/utils/validation/phoneValidation.ts` (`phoneWithCountry`), which
// validates the digit count against the selected country. The old
// `phoneNumberValidation` / `phoneNumberValidationSecondary` helpers that
// used to sit here hard-coded the US `(xxx) xxx-xxxx` 10-digit shape and
// have been removed.

export const titleHasHtml = (value: string) => /<[^>]*>/.test(value);
