import { z } from 'zod';
import { nameValidation, emailValidation } from '../../shared/utils/validation/input.helpers';
import { phoneWithCountry } from '../../shared/utils/validation/phoneValidation';

// Phone is only ever collected for a tenant-user invite — a platform
// staff/Super Admin invite (and the bootstrap script that creates the very
// first Super Admin) never asks for one, and `memberships.phone_no` is
// nullable to match (see accept_invitation.py's `is_platform_invite` branch
// on the backend). So this form can't require phone unconditionally: a
// platform caller with no phone on file would be unable to save ANY edit
// (even just a name fix) until they supplied a number the backend never
// needed from them. `phoneRequired` lets the caller-kind decide, same
// distinction UserProfile/index.tsx already makes for everything else.
export const getUserProfileSchema = (phoneRequired: boolean) =>
  z
    .object({
      firstName: nameValidation({ label: 'First name', required: true }),
      lastName: nameValidation({ label: 'Last name', required: true }),
      emailId: emailValidation(),
      phoneNumber: z.string(),

      // Optional fields with conditional validation
      addressLine1: z
        .string()
        .min(1, 'Address must not be empty if provided.')
        .optional()
        .or(z.literal('')),
      addressLine2: z.string().optional().or(z.literal('')),
      // `countryCode` is the phone number's dial code (e.g. "+1"), not the
      // physical address's country below — see UserProfile/index.tsx's
      // country_code wire field.
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
    })
    .superRefine(phoneWithCountry('countryCode', 'phoneNumber', { required: phoneRequired }));
