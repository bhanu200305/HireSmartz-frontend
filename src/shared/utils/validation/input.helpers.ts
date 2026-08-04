import { z } from 'zod';
import { UseFormSetValue } from 'react-hook-form';
import { formatPhoneNumber } from '../methods';
import { NameValidationOptions } from '../../../types';
import { FORM_EMAIL_REGEX } from '../../../constants/app.constants';

export const handlePhoneNumberChange = <T extends Record<string, any>>(
  e: React.ChangeEvent<HTMLInputElement>,
  setValue: UseFormSetValue<T>,
  fieldName: keyof T,
  trigger?: (name?: keyof T) => Promise<boolean>
) => {
  const input = e.target.value;
  const previousInput = (e.target as any).previousValue || '';

  let formatted = formatPhoneNumber(input);

  if (input.length < previousInput.length && previousInput.length > formatted.length) {
    formatted = input;
  }

  setValue(fieldName as any, formatted as any, { shouldDirty: true, shouldValidate: true });
  if (trigger) trigger(fieldName);
  (e.target as any).previousValue = formatted;
};

export const handleRestrictPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '').slice(0, 10);
  return cleaned;
};
export const sanitizeInput = (input: string): string => {
  return input.trim();
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
    if (/[\x00-\x1F\x7F-\x9F]/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password cannot contain control or non-printable characters.',
      });
      return;
    }

    const requirements = [
      {
        check: value.length >= 8,
        message: 'Password must be at least 8 characters.',
      },
      {
        check: value.length <= 128,
        message: 'Password must be at most 128 characters.',
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
        check: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
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

export const phoneNumberValidation = () => {
  return z
    .string()
    .nonempty('Phone number is required.')
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, {
      message: 'Phone number must be in (xxx) xxx-xxxx format.',
    })
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, '');
        return digits !== '0000000000' && digits !== '0123456789' && digits !== '1234567890';
      },
      { message: 'Please enter a valid phone number.' }
    );
};

export const phoneNumberValidationSecondary = () => {
  return z
    .string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, {
      message: 'Phone number must be in (xxx) xxx-xxxx format.',
    })
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, '');
        return digits !== '0000000000' && digits !== '0123456789' && digits !== '1234567890';
      },
      { message: 'Please enter a valid phone number.' }
    );
};

export const titleHasHtml = (value: string) => /<[^>]*>/.test(value);
