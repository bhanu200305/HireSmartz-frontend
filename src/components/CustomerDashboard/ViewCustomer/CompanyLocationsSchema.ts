import { z } from 'zod';
import { MAX_PHONE_LENGTH, MIN_PHONE_LENGTH } from '../../../constants/app.constants';
import { validatePhoneNumber } from '../../../shared/utils/methods';

const locationNameValidation = () =>
  z.string().superRefine((val, ctx) => {
    const value = val?.trim().replace(/\s+/g, ' ') ?? '';

    if (!value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Location name is required.',
      });
      return;
    }

    if (value.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Location name must be at least 2 characters.',
      });
      return;
    }

    if (value.length > 250) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Location name cannot exceed 250 characters.',
      });
    }
  });

export const companyLocationSchema = z
  .object({
    locationName: locationNameValidation(),
    addressLine1: z.string().trim().min(1, 'Address Line 1 is required'),
    country: z.string().trim().min(1, 'Country is required'),
    state: z.string().trim().min(1, 'State is required'),
    city: z.string().trim().min(1, 'City is required'),
    zipCode: z.string().trim().min(1, 'Zip code is required'),
    countryCode: z.string().optional(),
    phoneNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const phoneNumber = data.phoneNumber?.trim() || '';

    if (!phoneNumber) {
      return;
    }

    const normalizedCountryCode = data.countryCode?.trim() || '+1';
    const digits = phoneNumber.replace(/\D/g, '');
    const minimumDigits = normalizedCountryCode === '+1' ? MIN_PHONE_LENGTH : MIN_PHONE_LENGTH;
    const maximumDigits = normalizedCountryCode === '+1' ? MIN_PHONE_LENGTH : MAX_PHONE_LENGTH;

    if (digits.length < minimumDigits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phone number must be in (xxx) xxx-xxxx format.',
        path: ['phoneNumber'],
      });
      return;
    }

    if (digits.length > maximumDigits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid phone number.',
        path: ['phoneNumber'],
      });
      return;
    }

    if (normalizedCountryCode === '+1' && !validatePhoneNumber(phoneNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid phone number.',
        path: ['phoneNumber'],
      });
      return;
    }

    if (digits === '0000000000' || digits === '0123456789' || digits === '1234567890') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid phone number.',
        path: ['phoneNumber'],
      });
    }
  });

export type CompanyLocationValidationValues = z.infer<typeof companyLocationSchema>;
