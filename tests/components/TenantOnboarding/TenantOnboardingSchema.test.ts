import { describe, expect, it } from 'vitest';
import {
  tenantDetailsSchema,
  tenantProfileSchema,
} from '../../../src/components/TenantOnboarding/TenantOnboardingSchema';
import type { TenantDetailsFormValues } from '../../../src/components/TenantOnboarding/TenantOnboardingSchema';
import { PHONE_VALIDATION_MESSAGE } from '../../../src/shared/utils/validation/phoneValidation';

const baseDetails = {
  companyName: 'Acme Inc',
  websiteUrl: 'acme.com',
  industryId: '3',
  primaryContactFirstName: 'Jane',
  primaryContactLastName: 'Doe',
  primaryContactTitle: 'Ms',
  adminEmail: 'founder@acme.com',
  adminContactCountryCode: '+1',
  adminContactPhone: '(555) 123-4567',
};

describe('tenantDetailsSchema', () => {
  it('accepts a complete, valid submission', () => {
    const result = tenantDetailsSchema.safeParse(baseDetails);
    expect(result.success).toBe(true);
  });

  it('requires a company name', () => {
    const result = tenantDetailsSchema.safeParse({ ...baseDetails, companyName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.companyName?.[0]).toBe('Company Name is required.');
    }
  });

  it('does not require an industry — the picker is wired to a legacy backend not in this stack', () => {
    const result = tenantDetailsSchema.safeParse({ ...baseDetails, industryId: '' });
    expect(result.success).toBe(true);
  });

  it('rejects an incomplete admin contact phone number', () => {
    const result = tenantDetailsSchema.safeParse({ ...baseDetails, adminContactPhone: '555-1234' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.adminContactPhone?.[0]).toBe(
        PHONE_VALIDATION_MESSAGE
      );
    }
  });

  it('rejects an invalid admin email', () => {
    const result = tenantDetailsSchema.safeParse({ ...baseDetails, adminEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

describe('tenantProfileSchema', () => {
  it('accepts a scraped-preview-derived profile', () => {
    const result = tenantProfileSchema.safeParse({
      name: 'Acme Inc',
      description: 'We build widgets.',
      logoUrl: 'https://acme.com/logo.png',
      colors: ['#1D9E75'],
    });
    expect(result.success).toBe(true);
  });

  it('requires a company name', () => {
    const result = tenantProfileSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name?.[0]).toBe('Company Name is required.');
    }
  });

  it('rejects an overly long description', () => {
    const result = tenantProfileSchema.safeParse({
      name: 'Acme Inc',
      description: 'x'.repeat(1001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.description?.[0]).toBe(
        'Keep the description under 1000 characters.'
      );
    }
  });
});

describe('tenantDetailsSchema: Primary and Secondary Contact', () => {
  const fieldError = (values: Record<string, unknown>, field: keyof TenantDetailsFormValues) => {
    const result = tenantDetailsSchema.safeParse(values);
    return result.success ? null : (result.error.flatten().fieldErrors[field]?.[0] ?? null);
  };

  it('requires the Primary Contact first name, last name and title', () => {
    expect(
      fieldError({ ...baseDetails, primaryContactFirstName: '' }, 'primaryContactFirstName')
    ).toBe('First name is required.');
    expect(
      fieldError({ ...baseDetails, primaryContactLastName: '  ' }, 'primaryContactLastName')
    ).toBe('Last name is required.');
    expect(fieldError({ ...baseDetails, primaryContactTitle: '' }, 'primaryContactTitle')).toBe(
      'Title is required.'
    );
  });

  it('requires the Primary Contact phone number', () => {
    expect(fieldError({ ...baseDetails, adminContactPhone: '' }, 'adminContactPhone')).toBe(
      'Phone Number is required.'
    );
  });

  it('lets the Secondary Contact be left completely empty', () => {
    expect(tenantDetailsSchema.safeParse(baseDetails).success).toBe(true);
    expect(
      tenantDetailsSchema.safeParse({
        ...baseDetails,
        secondaryContactFirstName: '',
        secondaryContactPhone: '',
        secondaryContactEmail: '',
      }).success
    ).toBe(true);
  });

  it('lets the Secondary Contact be partly filled in', () => {
    expect(
      tenantDetailsSchema.safeParse({ ...baseDetails, secondaryContactFirstName: 'Sam' }).success
    ).toBe(true);
  });

  it('checks the Secondary Contact email and phone only when filled in', () => {
    expect(
      fieldError({ ...baseDetails, secondaryContactEmail: 'nope' }, 'secondaryContactEmail')
    ).toBe('Enter a valid email address.');
    expect(
      fieldError(
        { ...baseDetails, secondaryContactCountryCode: '+1', secondaryContactPhone: '555' },
        'secondaryContactPhone'
      )
    ).toBe(PHONE_VALIDATION_MESSAGE);
    expect(
      tenantDetailsSchema.safeParse({
        ...baseDetails,
        secondaryContactCountryCode: '+1',
        secondaryContactPhone: '(555) 123-4567',
      }).success
    ).toBe(true);
  });
});
