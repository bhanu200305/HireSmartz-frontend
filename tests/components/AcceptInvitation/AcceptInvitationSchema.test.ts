import { describe, expect, it } from 'vitest';
import { acceptInvitationSchema } from '../../../src/components/AcceptInvitation/AcceptInvitationSchema';

const basePayload = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  countryCode: '+1',
  phoneNumber: '(555) 123-4567',
  isPlatformInvite: false,
  password: 'Str0ng!Passw0rd',
  confirmPassword: 'Str0ng!Passw0rd',
  methodType: 'email' as const,
  mfaCode: '123456',
};

describe('acceptInvitationSchema', () => {
  it('accepts a matching password + a valid 6-digit MFA code', () => {
    const result = acceptInvitationSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
  });

  it('rejects a missing last name — required (product rule, 2026-10-04)', () => {
    const result = acceptInvitationSchema.safeParse({ ...basePayload, lastName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.lastName?.[0]).toBe('Last Name is required.');
    }
  });

  it('rejects a missing first name — required for every tenant invite', () => {
    const result = acceptInvitationSchema.safeParse({ ...basePayload, firstName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.firstName?.[0]).toBe('First Name is required.');
    }
  });

  it('rejects a missing phone number — required for every tenant invite', () => {
    const result = acceptInvitationSchema.safeParse({ ...basePayload, phoneNumber: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phoneNumber?.[0]).toBe('Phone Number is required.');
    }
  });

  it('rejects a missing country code — required for every tenant invite', () => {
    const result = acceptInvitationSchema.safeParse({ ...basePayload, countryCode: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.countryCode?.[0]).toBe(
        'Please select a country code.'
      );
    }
  });

  it('accepts a platform invite with no country code/phone number at all', () => {
    const result = acceptInvitationSchema.safeParse({
      ...basePayload,
      isPlatformInvite: true,
      countryCode: '',
      phoneNumber: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = acceptInvitationSchema.safeParse({
      ...basePayload,
      confirmPassword: 'SomethingElse1!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword?.[0]).toBe(
        "Passwords don't match."
      );
    }
  });

  it('rejects an mfaCode that is not a 6-digit number', () => {
    const result = acceptInvitationSchema.safeParse({ ...basePayload, mfaCode: '123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.mfaCode?.[0]).toBe(
        'Enter the 6-digit verification code.'
      );
    }
  });

  it('rejects an empty password', () => {
    const result = acceptInvitationSchema.safeParse({
      ...basePayload,
      password: '',
      confirmPassword: '',
    });
    expect(result.success).toBe(false);
  });
});
