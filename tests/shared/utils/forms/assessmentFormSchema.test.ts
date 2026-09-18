import { describe, expect, it } from 'vitest';
import {
  scoreSchema,
  passFailSchema,
} from '../../../../src/shared/utils/forms/assessmentFormSchema';

describe('scoreSchema', () => {
  it('accepts a score within 1-5 unchanged', () => {
    const result = scoreSchema.safeParse(3);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(3);
    }
  });

  it('defaults to 1 when no score is given', () => {
    const result = scoreSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(1);
    }
  });

  it('rejects a score below 1 rather than clamping it — the .min() check runs before the clamp transform, so out-of-range values never reach it', () => {
    const result = scoreSchema.safeParse(0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Score must be at least 1');
    }
  });

  it('rejects a score above 5 rather than clamping it, for the same reason', () => {
    const result = scoreSchema.safeParse(6);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Score must not exceed 5');
    }
  });
});

describe('passFailSchema', () => {
  it('accepts true and false', () => {
    expect(passFailSchema.safeParse(true)).toMatchObject({ success: true, data: true });
    expect(passFailSchema.safeParse(false)).toMatchObject({ success: true, data: false });
  });

  it('defaults to null when omitted', () => {
    const result = passFailSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('accepts an explicit null', () => {
    expect(passFailSchema.safeParse(null)).toMatchObject({ success: true, data: null });
  });
});
