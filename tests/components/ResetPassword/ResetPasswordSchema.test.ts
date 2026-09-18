import { describe, expect, it } from 'vitest';
import { resetPasswordSchema } from '../../../src/components/ResetPassword/ResetPasswordSchema';

describe('resetPasswordSchema', () => {
  it('accepts matching, strong passwords', () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: 'NewPass1!',
      confirmNewPassword: 'NewPass1!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: 'NewPass1!',
      confirmNewPassword: 'Different1!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmNewPassword?.[0]).toBe(
        "Passwords don't match."
      );
    }
  });

  it('rejects a new password that fails the strength rules', () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: 'weak',
      confirmNewPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty confirmation', () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: 'NewPass1!',
      confirmNewPassword: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmNewPassword?.[0]).toBe(
        'Please confirm your new password.'
      );
    }
  });
});
