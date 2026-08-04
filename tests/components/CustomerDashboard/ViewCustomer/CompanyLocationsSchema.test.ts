import { describe, expect, it } from 'vitest';
import { companyLocationSchema } from '../../../../src/components/CustomerDashboard/ViewCustomer/CompanyLocationsSchema';

const baseLocation = {
  locationName: 'Main Office',
  addressLine1: '123 Market St',
  country: 'United States',
  state: 'California',
  city: 'San Francisco',
  zipCode: '94105',
  countryCode: '+1',
  phoneNumber: '',
};

describe('companyLocationSchema', () => {
  it('rejects an incomplete phone number for +1', () => {
    const result = companyLocationSchema.safeParse({
      ...baseLocation,
      phoneNumber: '(123) 213-123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phoneNumber?.[0]).toBe(
        'Phone number is incomplete.'
      );
    }
  });

  it('accepts a complete phone number for +1', () => {
    const result = companyLocationSchema.safeParse({
      ...baseLocation,
      phoneNumber: '(123) 213-1234',
    });

    expect(result.success).toBe(true);
  });
});
