import { describe, it, expect } from 'vitest';
import { getSpecialKindFromRoundName } from '../../../src/shared/utils/roundInfoContent';

describe('getSpecialKindFromRoundName', () => {
  it('maps the seeded round names to their kind, ignoring case and spaces', () => {
    expect(getSpecialKindFromRoundName('Resume Round')).toBe('resume');
    expect(getSpecialKindFromRoundName('  intake call round ')).toBe('intake_call');
    expect(getSpecialKindFromRoundName('Identity Verification')).toBe('verification');
  });

  it('returns undefined for other or missing names', () => {
    expect(getSpecialKindFromRoundName('AI Video Round')).toBeUndefined();
    expect(getSpecialKindFromRoundName('')).toBeUndefined();
    expect(getSpecialKindFromRoundName(null)).toBeUndefined();
  });
});
