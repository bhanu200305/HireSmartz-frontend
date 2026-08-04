import { z } from 'zod';
import {
  emailValidation,
  nameValidation,
  phoneNumberValidation,
  websiteLinkValidation,
} from '../../../shared/utils/validation/input.helpers';

export const EditCompanySchema = z
  .object({
    firstNamePrimary: nameValidation({ label: 'First name', required: true }),
    lastNamePrimary: nameValidation({ label: 'Last name', required: true }),
    phonePrimary: phoneNumberValidation(),
    countryCodePrimary: z.string().nonempty('Country code is required.'),
    emailPrimary: emailValidation(),
    titlePrimary: z.string().optional().or(z.literal('')),

    companyName: z.string().trim().min(1, 'Company name is required.'),
    websiteLink: websiteLinkValidation(),
    industryId: z.string().optional().or(z.literal('')),
    departmentIds: z.array(z.string()).optional().default([]),
    locationName: z.string().trim().min(1, 'Location name is required.'),
    locationCode: z.string().optional().or(z.literal('')),

    addressLine1: z.string().trim().min(1, 'Address line 1 is required.'),
    addressLine2: z.string().optional().or(z.literal('')),
    city: z.string().trim().min(1, 'City is required.'),
    state: z.string().trim().min(1, 'State is required.'),
    zip: z.string().trim().min(1, 'Zip code is required.'),
    country: z.string().trim().min(1, 'Country is required.'),

    firstNameSecondary: nameValidation({ label: 'First name', required: false })
      .optional()
      .or(z.literal('')),
    lastNameSecondary: nameValidation({ label: 'Last name', required: false })
      .optional()
      .or(z.literal('')),
    phoneSecondary: phoneNumberValidation().optional().or(z.literal('')),
    countryCodeSecondary: z.string().optional().or(z.literal('')),
    emailSecondary: z.string().optional().or(z.literal('')),
    titleSecondary: z.string().optional().or(z.literal('')),
    roleId: z.string().optional().or(z.literal('')),

    companyLogo: z.string().optional().nullable(),
    companyLogoType: z.string().optional().nullable(),
    status: z.boolean().optional(),
    allowedToManageLocation: z.boolean().optional(),
    cultureIntroText: z.string().optional().or(z.literal('')),
    cultureIntroDefaultEnabled: z.boolean().optional(),
    isScoringConfigEditable: z.boolean().optional(),
    candidateIntroEnabled: z.boolean().optional(),
    candidateEnquiriesEnabled: z.boolean().optional(),
    roleIdSecondary: z.string().optional().or(z.literal('')),
  })

  .superRefine((data, ctx) => {
    const firstNameSec = data.firstNameSecondary?.trim() || '';
    const lastNameSec = data.lastNameSecondary?.trim() || '';
    const phoneSec = data.phoneSecondary?.trim() || '';
    const countryCodeSec = data.countryCodeSecondary?.trim() || '';
    const emailSec = data.emailSecondary?.trim() || '';

    const primaryEmail = data.emailPrimary?.trim() || '';

    const isAllSecondaryEmpty = !firstNameSec && !lastNameSec && !phoneSec && !emailSec;

    if (isAllSecondaryEmpty) {
      return;
    }

    if (!firstNameSec) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'First name is required.',
        path: ['firstNameSecondary'],
      });
    }

    if (!lastNameSec) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Last name is required.',
        path: ['lastNameSecondary'],
      });
    }

    if (!phoneSec) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phone number is required.',
        path: ['phoneSecondary'],
      });
    } else {
      const digits = phoneSec.replace(/\D/g, '');
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

    if (!countryCodeSec) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Country code is required.',
        path: ['countryCodeSecondary'],
      });
    }

    if (!emailSec) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email is required.',
        path: ['emailSecondary'],
      });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailSec)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid email format.',
          path: ['emailSecondary'],
        });
      }
    }

    if (primaryEmail && emailSec && primaryEmail.toLowerCase() === emailSec.toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Primary and secondary emails cannot be the same.',
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
  });
