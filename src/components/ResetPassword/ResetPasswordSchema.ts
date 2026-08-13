import { z } from 'zod';
import { passwordValidation } from '../../shared/utils/validation/input.helpers';

export const resetPasswordSchema = z
  .object({
    newPassword: passwordValidation(),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match.",
    path: ['confirmNewPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
