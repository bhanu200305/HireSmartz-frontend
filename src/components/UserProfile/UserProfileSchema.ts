import { z } from 'zod';
import {
  nameValidation,
  emailValidation,
  phoneNumberValidation,
} from '../../shared/utils/validation/input.helpers';

export const UserProfileSchema = z.object({
  firstName: nameValidation({ label: 'First name', required: true }),
  lastName: nameValidation({ label: 'Last name', required: true }),
  emailId: emailValidation(),
  phoneNumber: phoneNumberValidation(),

  // Optional fields with conditional validation
  addressLine1: z
    .string()
    .min(1, 'Address must not be empty if provided.')
    .optional()
    .or(z.literal('')),
  addressLine2: z.string().optional().or(z.literal('')),
  countryCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  profilePicture: z.string().optional().or(z.literal('')),
  profilePictureType: z.string().optional().or(z.literal('')),
  roleName: z.string().optional().or(z.literal('')),
  pinCode: z
    .string()
    .min(3, 'Postal code must be at least 3 characters if provided.')
    .optional()
    .or(z.literal('')),
  companyName: z.string(),
});
