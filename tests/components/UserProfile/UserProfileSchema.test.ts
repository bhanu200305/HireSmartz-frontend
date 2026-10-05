import { describe, expect, it } from 'vitest';
import { getUserProfileSchema } from '../../../src/components/UserProfile/UserProfileSchema';

const UserProfileSchema = getUserProfileSchema(true);

const basePayload = {
  firstName: 'Jane',
  lastName: 'Doe',
  emailId: 'jane.doe@example.com',
  phoneNumber: '2015550123',
  countryCode: '+1',
  companyName: 'Acme Inc',
};

describe('UserProfileSchema', () => {
  it('accepts a minimal valid profile', () => {
    expect(UserProfileSchema.safeParse(basePayload).success).toBe(true);
  });

  it('requires a first name', () => {
    const result = UserProfileSchema.safeParse({ ...basePayload, firstName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.firstName?.[0]).toBe('First Name is required.');
    }
  });

  it('rejects an invalid email', () => {
    expect(UserProfileSchema.safeParse({ ...basePayload, emailId: 'not-an-email' }).success).toBe(
      false
    );
  });

  it('requires the phone number to be valid for the selected country', () => {
    const result = UserProfileSchema.safeParse({ ...basePayload, phoneNumber: '12345' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phoneNumber?.[0]).toBeDefined();
    }
  });

  it('rejects a postal code shorter than 3 characters when one is provided', () => {
    const result = UserProfileSchema.safeParse({ ...basePayload, pinCode: '12' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.pinCode?.[0]).toBe(
        'Postal code must be at least 3 characters if provided.'
      );
    }
  });

  it('allows the postal code to be omitted or empty', () => {
    expect(UserProfileSchema.safeParse(basePayload).success).toBe(true);
    expect(UserProfileSchema.safeParse({ ...basePayload, pinCode: '' }).success).toBe(true);
  });

  it("never rejects addressLine1 regardless of content — the min-length check is unreachable behind .optional().or(literal(''))", () => {
    // Documents current behavior rather than asserting a desired one: any
    // string satisfies the .optional() branch's own min(1) trivially once
    // non-empty, an empty string is separately allowed via the literal('')
    // branch, and undefined is allowed via .optional() — so the "must not
    // be empty if provided" message can never actually surface.
    expect(UserProfileSchema.safeParse({ ...basePayload, addressLine1: '' }).success).toBe(true);
    expect(UserProfileSchema.safeParse({ ...basePayload, addressLine1: '   ' }).success).toBe(true);
    expect(
      UserProfileSchema.safeParse({ ...basePayload, addressLine1: '123 Main St' }).success
    ).toBe(true);
  });
});

describe('getUserProfileSchema(false) — platform staff, no phone on file', () => {
  // A platform staff/Super Admin invite never collects a phone number (see
  // getUserProfileSchema's own comment), so an existing account with none
  // must still be able to save other edits.
  const PlatformProfileSchema = getUserProfileSchema(false);

  it('allows an empty phone number', () => {
    const result = PlatformProfileSchema.safeParse({ ...basePayload, phoneNumber: '' });
    expect(result.success).toBe(true);
  });

  it('still rejects a phone number that is present but invalid for the country', () => {
    const result = PlatformProfileSchema.safeParse({ ...basePayload, phoneNumber: '12345' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phoneNumber?.[0]).toBeDefined();
    }
  });
});
