import { z } from 'zod';
import {
  emailValidation,
  nameValidation,
  phoneNumberValidation,
  phoneNumberValidationSecondary,
  websiteLinkValidation,
} from '../../../shared/utils/validation/input.helpers';

export const addCustomerSchema = z
  .object({
    firstNamePrimary: nameValidation({ label: 'First name', required: true }),
    lastNamePrimary: nameValidation({ label: 'Last name', required: true }),
    phonePrimary: phoneNumberValidation(),
    countryCodePrimary: z.string().nonempty('Country code is required.'),
    emailPrimary: emailValidation(),

    companyName: z.string().nonempty('Company name is required.'),
    addressLine1: z.string().nonempty('Address Line 1 is required.'),
    addressLine2: z.string().optional().or(z.literal('')),
    locationName: z.string().nonempty('Location name is required.'),
    locationCode: z.string().optional().or(z.literal('')),
    city: z.string().nonempty('City is required.'),
    state: z.string().nonempty('State is required.'),
    zip: z.string().nonempty('Zip is required.'),
    country: z.string().nonempty('Country is required.'),

    websiteLink: websiteLinkValidation(),
    masterIndustryId: z
      .union([z.string(), z.number()])
      .transform(String)
      .optional()
      .or(z.literal('')),
    departmentIds: z
      .array(z.union([z.string(), z.number()]).transform(String))
      .optional()
      .default([]),
    cultureIntroText: z.string().optional().or(z.literal('')),
    cultureIntroDefaultEnabled: z.boolean().optional(),
    isScoringConfigEditable: z.boolean().optional(),
    candidateIntroEnabled: z.boolean().optional(),
    candidateEnquiriesEnabled: z.boolean().optional(),

    titlePrimary: z.string().optional().or(z.literal('')),
    titleSecondary: z.string().optional().or(z.literal('')),

    firstNameSecondary: z.string().optional().or(z.literal('')),
    lastNameSecondary: z.string().optional().or(z.literal('')),
    phoneSecondary: phoneNumberValidationSecondary(),
    countryCodeSecondary: z.string().optional().or(z.literal('')),
    emailSecondary: z.string().optional().or(z.literal('')),
    roleIdPrimary: z.string().optional().or(z.literal('')),
    roleIdSecondary: z.string().optional().or(z.literal('')),

    companyLogo: z.string().optional().nullable(),
    companyLogoType: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasSecondaryContact =
      data.firstNameSecondary?.trim() ||
      data.lastNameSecondary?.trim() ||
      data.phoneSecondary?.trim() ||
      data.emailSecondary?.trim();

    if (hasSecondaryContact) {
      if (!data.firstNameSecondary?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'First name is required.',
          path: ['firstNameSecondary'],
        });
      }

      if (!data.lastNameSecondary?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Last name is required.',
          path: ['lastNameSecondary'],
        });
      }

      if (!data.phoneSecondary?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone number is required.',
          path: ['phoneSecondary'],
        });
      } else {
        const digits = data.phoneSecondary.replace(/\D/g, '');
        if (digits.length < 10) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Phone number must be at least 10 digits.',
            path: ['phoneSecondary'],
          });
        } else if (digits.length > 10) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Phone number cannot exceed 10 digits.',
            path: ['phoneSecondary'],
          });
        }
      }

      if (!data.countryCodeSecondary?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Country code is required.',
          path: ['countryCodeSecondary'],
        });
      }

      if (!data.emailSecondary?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Email is required.',
          path: ['emailSecondary'],
        });
      }

      if (!data.roleIdSecondary?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Role is required.',
          path: ['roleIdSecondary'],
        });
      }
    }
  });
