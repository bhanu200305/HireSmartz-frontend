import { z } from 'zod';
import { nameValidation, passwordValidation } from '../../shared/utils/validation/input.helpers';

const PHONE_FORMAT_MESSAGE = 'Phone number must be in (xxx) xxx-xxxx format.';
const PHONE_REGEX = /^\(\d{3}\) \d{3}-\d{4}$/;
const FAKE_PHONE_DIGITS = new Set(['0000000000', '0123456789', '1234567890']);
// Same shape BookDemoPage's countryCode field validates against — a dial
// code like "+1"/"+971", not a country name. Matches the backend's own
// `Field(max_length=5)` on AcceptInvitationRequest.country_code.
const COUNTRY_CODE_REGEX = /^\+\d{1,4}$/;

export const acceptInvitationSchema = z
  .object({
    // Backend requirement, confirmed in organization-service's
    // AcceptInvitationUseCase: first_name, country_code and phone_number
    // are all mandatory for every TENANT invite (Company Admin, Recruiter,
    // Hiring Manager) even though they're optional on the wire-level
    // Pydantic model — omitting any of them 422s. All optional on the wire
    // (and left unvalidated here — see `isPlatformInvite` below) purely
    // because a platform invite (Super Admin/staff) doesn't need them.
    // last_name is genuinely optional end to end (nullable in the DB, never
    // validated) — kept optional to match.
    firstName: nameValidation({ label: 'First name', required: true }),
    lastName: nameValidation({ label: 'Last name', required: false }),
    countryCode: z.string().optional(),
    phoneNumber: z.string().optional(),
    // Hidden, non-user-facing field — set from ValidateInvitationResponse's
    // `is_platform_invite` once the invite loads (see AcceptInvitation's
    // useEffect), so `countryCode`/`phoneNumber`'s requiredness below can
    // depend on it.
    isPlatformInvite: z.boolean(),
    password: passwordValidation(),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
    mfaAcknowledged: z.boolean().refine((val) => val === true, {
      message: 'Add the key to your authenticator app to continue.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.isPlatformInvite) return;

    const countryCode = data.countryCode?.trim() ?? '';
    if (!countryCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['countryCode'],
        message: 'Please select a country code.',
      });
    } else if (!COUNTRY_CODE_REGEX.test(countryCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['countryCode'],
        message: 'Invalid country code.',
      });
    }

    const value = data.phoneNumber?.trim() ?? '';
    if (!value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phoneNumber'],
        message: 'Phone number is required.',
      });
      return;
    }
    if (!PHONE_REGEX.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phoneNumber'],
        message: PHONE_FORMAT_MESSAGE,
      });
      return;
    }
    if (FAKE_PHONE_DIGITS.has(value.replace(/\D/g, ''))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phoneNumber'],
        message: 'Please enter a valid phone number.',
      });
    }
  });

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;
