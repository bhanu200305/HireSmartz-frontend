import { z } from 'zod';
import {
  emailValidation,
  nameValidation,
  phoneNumberValidation,
} from '../../../shared/utils/validation/input.helpers';

export const editUserSchema = z.object({
  firstName: nameValidation({ label: 'First name', required: true }),
  lastName: nameValidation({ label: 'Last name', required: true }),
  emailId: emailValidation(),
  phoneNumber: phoneNumberValidation(),
  title: z
    .string({ required_error: 'Title is required.' })
    .trim()
    .min(2, 'Title must be at least 2 characters long.')
    .max(100, 'Title cannot exceed 100 characters.')
    .refine((val) => /^[A-Za-z]/.test(val), 'Title must start with a letter (A-Z, a-z).')
    .refine((val) => !/\d{2,}/.test(val), 'No consecutive numbers allowed.')
    .refine(
      (val) => /^[A-Za-z0-9 &. -]+$/.test(val),
      'Only letters, numbers, spaces, and these special characters allowed: & . -.'
    )
    .refine((val) => /[A-Za-z]/.test(val), 'Title must contain at least one letter.')
    .refine(
      (val) => !/[ &. -]{2,}/.test(val),
      'No consecutive special characters (spaces, &, ., -).'
    ),
  countryCode: z.string().nonempty('Country code is required.'),
  roleId: z.string().nonempty('Role is required.'),
  status: z.boolean(),
  profilePicture: z.string().optional(),
  profilePictureType: z.string().optional(),
});
