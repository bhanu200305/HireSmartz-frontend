import { z } from 'zod';
import { passwordValidation } from '../../shared/utils/validation/input.helpers';

export const passwordSchema = (isTemporary: boolean) =>
  z
    .object({
      currentPassword: z
        .string()
        .trim()
        .min(1, isTemporary ? 'Temporary password is required.' : 'Current password is required.'),
      newPassword: passwordValidation(),
      confirmNewPassword: z.string().min(1, 'Please confirm your new password.'),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: "Passwords don't match.",
      path: ['confirmNewPassword'],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password.',
      path: ['newPassword'],
    });
