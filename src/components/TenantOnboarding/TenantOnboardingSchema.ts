import { z } from 'zod';
import {
  emailValidation,
  websiteLinkValidation,
} from '../../shared/utils/validation/input.helpers';
import { phoneWithCountry } from '../../shared/utils/validation/phoneValidation';

export const tenantDetailsSchema = z
  .object({
    companyName: z.string().nonempty('Company name is required.'),
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
    adminEmail: emailValidation(),
    adminContactCountryCode: z.string().nonempty('Country code is required.'),
    adminContactPhone: z.string(),
  })
  // Cross-field: the digit count a phone number needs is different per
  // country, so this can't be a per-field `.regex()` — see phoneValidation.ts.
  .superRefine(phoneWithCountry('adminContactCountryCode', 'adminContactPhone'));

export type TenantDetailsFormValues = z.infer<typeof tenantDetailsSchema>;

export const tenantProfileSchema = z.object({
  name: z.string().nonempty('Company name is required.'),
  description: z.string().max(600, 'Keep the description under 600 characters.').optional(),
  logoUrl: z.string().optional().or(z.literal('')),
  colors: z.array(z.string()).optional().default([]),
});

export type TenantProfileFormValues = z.infer<typeof tenantProfileSchema>;
