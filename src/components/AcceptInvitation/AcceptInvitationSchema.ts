import { z } from 'zod';
import { passwordValidation } from '../../shared/utils/validation/input.helpers';

export const acceptInvitationSchema = z
  .object({
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
