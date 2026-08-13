import { describe, expect, it } from 'vitest';
import { acceptInvitationSchema } from '../../../src/components/AcceptInvitation/AcceptInvitationSchema';

const basePayload = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  password: 'Str0ng!Passw0rd',
  confirmPassword: 'Str0ng!Passw0rd',
  mfaAcknowledged: true,
};

describe('acceptInvitationSchema', () => {
  it('accepts a matching password + acknowledged MFA setup', () => {
    const result = acceptInvitationSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
  });

  it('accepts a missing last name — it is optional', () => {
    const result = acceptInvitationSchema.safeParse({ ...basePayload, lastName: '' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing first name — required for every tenant invite', () => {
    const result = acceptInvitationSchema.safeParse({ ...basePayload, firstName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.firstName?.[0]).toBe('First name is required.');
    }
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

  it('rejects submission until MFA is acknowledged', () => {
    const result = acceptInvitationSchema.safeParse({ ...basePayload, mfaAcknowledged: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.mfaAcknowledged?.[0]).toBe(
        'Add the key to your authenticator app to continue.'
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
