import { z } from 'zod';
import {
  nameValidation,
  passwordValidation,
  phoneNumberValidation,
} from '../../shared/utils/validation/input.helpers';

export const acceptInvitationSchema = z
  .object({
    // Backend requirement, confirmed in organization-service's
    // AcceptInvitationUseCase: first_name is mandatory for every TENANT
    // invite (Company Admin, Recruiter, Hiring Manager) even though it's
    // optional on the wire-level Pydantic model — omitting it 422s. This
    // form only ever handles tenant invites (platform invites, which don't
    // need a name, aren't accepted through this screen), so it's required
    // here unconditionally. last_name is genuinely optional end to end
    // (nullable in the DB, never validated) — kept optional to match.
    firstName: nameValidation({ label: 'First name', required: true }),
    lastName: nameValidation({ label: 'Last name', required: false }),
    // Same AcceptInvitationUseCase requirement as first_name — phone_number
    // is mandatory for every tenant invite. Must come from the person
    // accepting, not whatever the inviter typed, so there's no prefill.
    phoneNumber: phoneNumberValidation(),
    password: passwordValidation(),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
    mfaAcknowledged: z.boolean().refine((val) => val === true, {
      message: 'Add the key to your authenticator app to continue.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;
