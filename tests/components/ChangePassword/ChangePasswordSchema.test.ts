import { describe, expect, it } from 'vitest';
import { passwordSchema } from '../../../src/components/ChangePassword/ChangePasswordSchema';

// 12+ characters — matches authentication-service's MIN_PASSWORD_LENGTH.
const basePayload = {
  currentPassword: 'OldPassword1!',
  newPassword: 'NewPassword1!',
  confirmNewPassword: 'NewPassword1!',
};

describe('passwordSchema', () => {
  it('accepts a valid password change', () => {
    expect(passwordSchema(false).safeParse(basePayload).success).toBe(true);
  });

  it('requires the current password, with wording depending on isTemporary', () => {
    const permanent = passwordSchema(false).safeParse({ ...basePayload, currentPassword: '' });
    expect(permanent.success).toBe(false);
    if (!permanent.success) {
      expect(permanent.error.flatten().fieldErrors.currentPassword?.[0]).toBe(
        'Current password is required.'
      );
    }

    const temporary = passwordSchema(true).safeParse({ ...basePayload, currentPassword: '' });
    expect(temporary.success).toBe(false);
    if (!temporary.success) {
      expect(temporary.error.flatten().fieldErrors.currentPassword?.[0]).toBe(
        'Temporary password is required.'
      );
    }
  });

  it('rejects a confirmation that does not match the new password', () => {
    const result = passwordSchema(false).safeParse({
      ...basePayload,
      confirmNewPassword: 'Different1!Longer',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmNewPassword?.[0]).toBe(
        "Passwords don't match."
      );
    }
  });

  it('rejects a new password identical to the current password', () => {
    const result = passwordSchema(false).safeParse({
      ...basePayload,
      newPassword: 'OldPassword1!',
      confirmNewPassword: 'OldPassword1!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.newPassword?.[0]).toBe(
        'New password must be different from current password.'
      );
    }
  });

  it('rejects a new password that fails the strength rules', () => {
    const result = passwordSchema(false).safeParse({
      ...basePayload,
      newPassword: 'weak',
      confirmNewPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });
});
