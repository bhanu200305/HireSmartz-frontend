import { z } from 'zod';
import {
  emailValidation,
  phoneNumberValidation,
} from '../../shared/utils/validation/input.helpers';

const WEBSITE_URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;

export const tenantDetailsSchema = z.object({
  companyName: z.string().nonempty('Company name is required.'),
  websiteUrl: z
    .string()
    .trim()
    .nonempty('Website is required.')
    .regex(WEBSITE_URL_REGEX, 'Please enter a valid URL, e.g. example.com.'),
  industryId: z.string().nonempty('Industry is required.'),
  adminEmail: emailValidation(),
  adminContactCountryCode: z.string().nonempty('Country code is required.'),
  adminContactPhone: phoneNumberValidation(),
});

export type TenantDetailsFormValues = z.infer<typeof tenantDetailsSchema>;

export const tenantProfileSchema = z.object({
  name: z.string().nonempty('Company name is required.'),
  description: z.string().max(600, 'Keep the description under 600 characters.').optional(),
  logoUrl: z.string().optional().or(z.literal('')),
  colors: z.array(z.string()).optional().default([]),
});

export type TenantProfileFormValues = z.infer<typeof tenantProfileSchema>;
