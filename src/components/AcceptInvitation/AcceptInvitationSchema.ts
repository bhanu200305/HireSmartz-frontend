import { z } from 'zod';
import { nameValidation, passwordValidation } from '../../shared/utils/validation/input.helpers';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
} from '../../shared/utils/validation/phoneValidation';

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
    // Which second factor the invite screen's method picker resolved to.
    // MFA is mandatory now — always one of the three real choices.
    methodType: z.enum(['totp', 'email', 'sms']),
    // Was a bare "I did this" checkbox whose state never actually reached
    // the server — the backend armed nothing on that basis (correctly: it
    // requires real proof). Now REQUIRED end to end: a missing/wrong code
    // fails account creation entirely rather than leaving MFA off. For
    // "totp" it's read off the authenticator app; for "email"/"sms" it's
    // the code sendInviteMfaCode already delivered.
    mfaCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    // A platform invite still needs a phone number when SMS is the chosen
    // factor — there's no profile phone field to reuse for that invite
    // type, so the MFA method itself drives the requirement here.
    if (data.isPlatformInvite && data.methodType !== 'sms') return;

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
    if (FAKE_PHONE_DIGITS.has(value.replace(/\D/g, ''))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phoneNumber'],
        message: 'Please enter a valid phone number.',
      });
      return;
    }
    if (countryCode && !isPhoneValidForCountry(value, countryCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phoneNumber'],
        message: PHONE_VALIDATION_MESSAGE,
      });
    }
  });

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;
