import { describe, it, expect } from 'vitest';
import { tenantDetailsSchema } from '../../src/components/TenantOnboarding/TenantOnboardingSchema';

const base = {
  companyName: 'Acme',
  websiteUrl: '',
  industryId: '',
  primaryContactFirstName: 'Jane',
  primaryContactLastName: 'Doe',
  primaryContactTitle: 'Ms',
  adminEmail: 'founder@acme.com',
  adminContactCountryCode: '+1',
  adminContactPhone: '2015550123',
};

const sizeError = (companySize?: string) => {
  const result = tenantDetailsSchema.safeParse({ ...base, companySize });
  return result.success
    ? null
    : (result.error.issues.find((i) => i.path[0] === 'companySize')?.message ?? null);
};

describe('Create Tenant: Company Size', () => {
  it('is optional', () => {
    expect(sizeError(undefined)).toBeNull();
    expect(sizeError('')).toBeNull();
  });

  it('accepts a positive number', () => {
    expect(sizeError('1')).toBeNull();
    expect(sizeError('250')).toBeNull();
  });

  it('rejects zero, negatives and non-numbers with a clear message', () => {
    for (const bad of ['0', '-5', 'abc', '12abc']) {
      expect(sizeError(bad)).toBe('Company size must be a positive number.');
    }
  });
});
