import { z } from 'zod';
import {
  emailValidation,
  websiteLinkValidation,
} from '../../shared/utils/validation/input.helpers';
import { phoneWithCountry } from '../../shared/utils/validation/phoneValidation';

export const tenantDetailsSchema = z
  .object({
    companyName: z.string().nonempty('Company Name is required.'),
    // Optional on organization-service's CreateTenantInput — a value here
    // triggers an ai-service branding scrape, which is a nice-to-have preview,
    // not a requirement to create the tenant. websiteLinkValidation() already
    // does "empty is fine, but validate the format if something's there."
    websiteUrl: websiteLinkValidation(),
    // Also optional on the backend (CreateTenantInput.industry_id: UUID | None).
    // Not made required here even though it has a UI: the industry picker is
    // currently wired to a legacy backend that isn't part of this stack (see
    // StepCompanyDetails.tsx), so forcing a selection would be a dead end.
    industryId: z.string(),
    // Kept as a string in the form (like the profile screen's own field) and
    // turned into a number only when submitting. Optional.
    companySize: z
      .string()
      .optional()
      .refine((v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 1), {
        message: 'Company size must be a positive number.',
      }),
    // Primary Contact. Their email and phone are `adminEmail` / `adminContact*`.
    primaryContactFirstName: z.string().trim().nonempty('First name is required.'),
    primaryContactLastName: z.string().trim().nonempty('Last name is required.'),
    primaryContactTitle: z.string().nonempty('Title is required.'),
    adminEmail: emailValidation(),
    adminContactCountryCode: z.string().nonempty('Country code is required.'),
    adminContactPhone: z.string(),
    // Secondary Contact: everything optional, with its own country code.
    secondaryContactFirstName: z.string().optional(),
    secondaryContactLastName: z.string().optional(),
    secondaryContactCountryCode: z.string().optional(),
    secondaryContactPhone: z.string().optional(),
    secondaryContactEmail: z
      .string()
      .email('Enter a valid email address.')
      .optional()
      .or(z.literal('')),
    secondaryContactTitle: z.string().optional(),
    secondaryContactRole: z.string().optional(),
  })
  // Cross-field: the digit count a phone number needs is different per
  // country, so this can't be a per-field `.regex()` — see phoneValidation.ts.
  .superRefine(phoneWithCountry('adminContactCountryCode', 'adminContactPhone'))
  // The Secondary Contact's phone is only checked when something is typed.
  .superRefine(
    phoneWithCountry('secondaryContactCountryCode', 'secondaryContactPhone', { required: false })
  );

export type TenantDetailsFormValues = z.infer<typeof tenantDetailsSchema>;

export const tenantProfileSchema = z.object({
  name: z.string().nonempty('Company Name is required.'),
  // Matches ai-service's own hard cap on the scraped description
  // (_MAX_DESCRIPTION_CHARS in scrape_organization_website.py) — this used
  // to be stricter (600) than what the backend could actually hand back
  // (up to 1000), which meant a perfectly valid AI-scraped description
  // could get rejected here just for being confirmed as-is.
  description: z.string().max(1000, 'Keep the description under 1000 characters.').optional(),
  logoUrl: z.string().optional().or(z.literal('')),
  colors: z.array(z.string()).optional().default([]),
});

export type TenantProfileFormValues = z.infer<typeof tenantProfileSchema>;
