import { describe, it, expect } from 'vitest';
import {
  isPhoneValidForCountry,
  restrictPhoneDigits,
  restrictPhoneDigitsForCountry,
  toE164,
  splitE164,
  phoneWithCountry,
  PHONE_VALIDATION_MESSAGE,
} from '../../src/shared/utils/validation/phoneValidation';

// Real, valid mobile numbers used throughout: US (+1) 10 digits, India (+91) 10 digits.
const US_MOBILE = '2015550123';
const INDIA_MOBILE = '9876543210';

describe('isPhoneValidForCountry', () => {
  it('accepts a valid US mobile number', () => {
    expect(isPhoneValidForCountry(US_MOBILE, '+1')).toBe(true);
  });

  it('accepts a valid India mobile number', () => {
    expect(isPhoneValidForCountry(INDIA_MOBILE, '+91')).toBe(true);
  });

  it('rejects a US number that is too short', () => {
    expect(isPhoneValidForCountry('12345', '+1')).toBe(false);
  });

  it('rejects an empty number or missing dial code', () => {
    expect(isPhoneValidForCountry('', '+1')).toBe(false);
    expect(isPhoneValidForCountry(US_MOBILE, '')).toBe(false);
  });

  it('falls back to a raw E.164 check for an unrecognized dial code', () => {
    // '+999' isn't in constants/countryCode.ts, so isoForDialCode resolves
    // to undefined and the function falls back to isPossiblePhoneNumber
    // on the concatenated string rather than throwing.
    expect(isPhoneValidForCountry(US_MOBILE, '+999')).toBe(false);
  });
});

describe('restrictPhoneDigits', () => {
  it('strips non-digit characters', () => {
    expect(restrictPhoneDigits('(201) 555-0123')).toBe('2015550123');
  });

  it('caps at the E.164 ceiling of 15 digits', () => {
    expect(restrictPhoneDigits('1'.repeat(20))).toHaveLength(15);
  });
});

describe('restrictPhoneDigitsForCountry', () => {
  it('caps US input at 10 digits, dropping the 11th keystroke', () => {
    expect(restrictPhoneDigitsForCountry(US_MOBILE + '9', '+1')).toBe(US_MOBILE);
  });

  it('does not cap a slightly-longer India number at the mobile length, since 11-13 digit numbers are still possible in that numbering plan', () => {
    // Unlike NANP (US), India's metadata treats 11-13 digit sequences as
    // possible (e.g. premium/toll-free ranges), so the "not possible ->
    // trim to mobile length" guard never fires here.
    expect(restrictPhoneDigitsForCountry(INDIA_MOBILE + '9', '+91')).toBe(INDIA_MOBILE + '9');
  });

  it('trims a very long India number down to the longest still-possible length', () => {
    // 20 nines: first capped to the flat 15-digit E.164 ceiling, then
    // trimmed digit-by-digit while TOO_LONG, bottoming out at 13 digits —
    // the longest sequence of 9s libphonenumber-js still calls "possible"
    // for India.
    expect(restrictPhoneDigitsForCountry('9'.repeat(20), '+91')).toBe('9'.repeat(13));
  });

  it('falls back to the flat E.164 cap for an unrecognized dial code', () => {
    const raw = '1'.repeat(20);
    expect(restrictPhoneDigitsForCountry(raw, '+999')).toBe(restrictPhoneDigits(raw));
  });
});

describe('toE164 / splitE164', () => {
  it('joins a dial code and national number into E.164', () => {
    expect(toE164('+91', INDIA_MOBILE)).toBe(`+91${INDIA_MOBILE}`);
  });

  it('strips non-digits from the national number before joining', () => {
    expect(toE164('+1', '(201) 555-0123')).toBe(`+1${US_MOBILE}`);
  });

  it('splits a stored E.164 value back into dial code + national number', () => {
    expect(splitE164(`+91${INDIA_MOBILE}`)).toEqual({
      countryCode: '+91',
      phoneNumber: INDIA_MOBILE,
    });
  });

  it('returns empty fields for a missing value', () => {
    expect(splitE164(undefined)).toEqual({ countryCode: '', phoneNumber: '' });
    expect(splitE164(null)).toEqual({ countryCode: '', phoneNumber: '' });
  });

  it('falls back to raw digits with no dial code for an unparsable value', () => {
    expect(splitE164('not-a-number')).toEqual({ countryCode: '', phoneNumber: '' });
  });
});

describe('phoneWithCountry (zod superRefine)', () => {
  const addIssue = () => {
    const issues: Array<{ path: unknown[]; message: string }> = [];
    const ctx = { addIssue: (issue: { path: unknown[]; message: string }) => issues.push(issue) };
    return { ctx, issues };
  };

  it('requires a phone number by default', () => {
    const { ctx, issues } = addIssue();
    phoneWithCountry('countryCode', 'phone')({ countryCode: '+1', phone: '' }, ctx as any);

    expect(issues).toEqual([
      { code: 'custom', path: ['phone'], message: 'Phone Number is required.' },
    ]);
  });

  it('does not require a phone number when required: false', () => {
    const { ctx, issues } = addIssue();
    phoneWithCountry('countryCode', 'phone', { required: false })(
      { countryCode: '+1', phone: '' },
      ctx as any
    );

    expect(issues).toEqual([]);
  });

  it('skips the digit-count check when no dial code is set yet', () => {
    const { ctx, issues } = addIssue();
    phoneWithCountry('countryCode', 'phone')({ countryCode: '', phone: US_MOBILE }, ctx as any);

    expect(issues).toEqual([]);
  });

  it('flags a phone number with the wrong digit count for the country', () => {
    const { ctx, issues } = addIssue();
    phoneWithCountry('countryCode', 'phone')({ countryCode: '+1', phone: '12345' }, ctx as any);

    expect(issues).toEqual([
      { code: 'custom', path: ['phone'], message: PHONE_VALIDATION_MESSAGE },
    ]);
  });

  it('passes for a valid phone number + country pair', () => {
    const { ctx, issues } = addIssue();
    phoneWithCountry('countryCode', 'phone')(
      { countryCode: '+91', phone: INDIA_MOBILE },
      ctx as any
    );

    expect(issues).toEqual([]);
  });
});
