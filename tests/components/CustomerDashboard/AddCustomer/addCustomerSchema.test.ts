import { describe, expect, it } from 'vitest';
import { addCustomerSchema } from '../../../../src/components/CustomerDashboard/AddCustomer/addCustomerSchema';

const basePayload = {
  firstNamePrimary: 'Jane',
  lastNamePrimary: 'Doe',
  phonePrimary: '2015550123',
  countryCodePrimary: '+1',
  emailPrimary: 'jane.doe@example.com',
  companyName: 'Acme Inc',
  addressLine1: '123 Main St',
  locationName: 'HQ',
  city: 'San Francisco',
  state: 'CA',
  zip: '94105',
  country: 'US',
  websiteLink: 'acme.com',
};

describe('addCustomerSchema — primary contact', () => {
  it('accepts a minimal valid submission with no secondary contact', () => {
    expect(addCustomerSchema.safeParse(basePayload).success).toBe(true);
  });

  it('requires the required company/address fields', () => {
    const result = addCustomerSchema.safeParse({ ...basePayload, companyName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.companyName?.[0]).toBe('Company Name is required.');
    }
  });

  it('rejects a primary phone number invalid for the selected country', () => {
    const result = addCustomerSchema.safeParse({ ...basePayload, phonePrimary: '12345' });
    expect(result.success).toBe(false);
  });
});

describe('addCustomerSchema — conditional secondary contact', () => {
  it('does not require any secondary contact field when none are filled in', () => {
    expect(addCustomerSchema.safeParse(basePayload).success).toBe(true);
  });

  it('requires the rest of the secondary contact once just one field is filled in', () => {
    const result = addCustomerSchema.safeParse({
      ...basePayload,
      firstNameSecondary: 'John',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.lastNameSecondary?.[0]).toBe('Last Name is required.');
      expect(fieldErrors.phoneSecondary?.[0]).toBe('Phone Number is required.');
      expect(fieldErrors.countryCodeSecondary?.[0]).toBe('Country code is required.');
      expect(fieldErrors.emailSecondary?.[0]).toBe('Email is required.');
      expect(fieldErrors.roleIdSecondary?.[0]).toBe('Role is required.');
      // The field that was actually filled in should not itself be flagged.
      expect(fieldErrors.firstNameSecondary).toBeUndefined();
    }
  });

  it('validates the secondary phone number against its own country code once both are present', () => {
    const result = addCustomerSchema.safeParse({
      ...basePayload,
      firstNameSecondary: 'John',
      lastNameSecondary: 'Smith',
      phoneSecondary: '12345',
      countryCodeSecondary: '+1',
      emailSecondary: 'john.smith@example.com',
      roleIdSecondary: 'recruiter',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phoneSecondary?.[0]).toBe(
        'Enter a valid phone number for the selected country.'
      );
    }
  });

  it('accepts a fully-completed secondary contact', () => {
    const result = addCustomerSchema.safeParse({
      ...basePayload,
      firstNameSecondary: 'John',
      lastNameSecondary: 'Smith',
      phoneSecondary: '9876543210',
      countryCodeSecondary: '+91',
      emailSecondary: 'john.smith@example.com',
      roleIdSecondary: 'recruiter',
    });
    expect(result.success).toBe(true);
  });
});
