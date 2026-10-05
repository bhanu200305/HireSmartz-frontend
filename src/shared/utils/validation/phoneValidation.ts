import {
  getExampleNumber,
  isPossiblePhoneNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from 'libphonenumber-js';
import examplesMobile from 'libphonenumber-js/examples.mobile.json';
import type { RefinementCtx } from 'zod';
import { countryCodes } from '../../../constants/countryCode';

// ITU E.164's own ceiling on a full number (dial code + national number) —
// the absolute fallback cap when the selected country isn't one
// libphonenumber-js has length metadata for. When it does (the common
// case), `restrictPhoneDigitsForCountry` caps tighter, at that country's
// own longest valid national number, so a US (+1) field stops accepting
// keystrokes at 10 digits rather than 15.
const E164_MAX_DIGITS = 15;

const isoForDialCode = (dialCode: string): string | undefined =>
  countryCodes.find((c) => c.value === dialCode)?.short;

// Length of a typical mobile number for a country (from libphonenumber-js's
// own example-number metadata), memoised. Used as the input cap when the
// number so far isn't itself a valid one — see `restrictPhoneDigitsForCountry`.
const mobileLengthCache = new Map<string, number>();
const exampleMobileLength = (iso: string): number | undefined => {
  const cached = mobileLengthCache.get(iso);
  if (cached !== undefined) return cached || undefined;
  const example = getExampleNumber(iso as CountryCode, examplesMobile);
  const length = example ? example.nationalNumber.length : 0;
  mobileLengthCache.set(iso, length);
  return length || undefined;
};

/**
 * `nationalNumber` is digits only (no dial code, no punctuation).
 * `dialCode` is what this codebase's country pickers already store —
 * `countryCodes[].value`, e.g. `"+91"` — resolved here to the ISO country
 * (`countryCodes[].short`) libphonenumber-js validates against, since a
 * shared dial code (`+1` covers both US and Canada, `+44` covers the UK and
 * several territories) can't reliably identify a country on its own.
 *
 * Uses `isPossiblePhoneNumber` (length/shape for the country), NOT
 * `isValidPhoneNumber` (which additionally checks the number against real
 * assigned area-code ranges). The goal here is "right number of digits, in
 * the right shape for this country" — not "this is a currently-assigned
 * line", which would reject legitimate-looking test data and rot whenever a
 * carrier gets a new area code the bundled metadata doesn't know yet.
 */
export const isPhoneValidForCountry = (nationalNumber: string, dialCode: string): boolean => {
  const digits = nationalNumber.replace(/\D/g, '');
  if (!digits || !dialCode) return false;
  const iso = isoForDialCode(dialCode);
  return iso
    ? isPossiblePhoneNumber(digits, iso as CountryCode)
    : isPossiblePhoneNumber(`${dialCode}${digits}`);
};

export const PHONE_VALIDATION_MESSAGE =
  'Enter a valid phone number for the selected country; the digit count must match.';

/** Digits only, capped at the E.164 ceiling — see that constant's own comment. */
export const restrictPhoneDigits = (raw: string): string =>
  raw.replace(/\D/g, '').slice(0, E164_MAX_DIGITS);

/**
 * Digits only, capped to what the SELECTED country's numbering plan allows —
 * so a `+1` (US/Canada) field refuses an 11th digit, a `+91` (India) field
 * an 11th, etc., instead of accepting keystrokes up to the flat 15-digit
 * E.164 ceiling and only failing on submit.
 *
 * `dialCode` is `countryCodes[].value` (e.g. `"+1"`). Two caps, in order:
 *   1. `TOO_LONG` — longer than *any* valid number of *any* type for the
 *      country (libphonenumber-js metadata). Trimmed digit by digit.
 *   2. Longer than a normal mobile number AND not itself a possible number.
 *      Trimmed to the mobile length. The "not possible" guard is what lets a
 *      country with genuinely long mobiles (Germany, Brazil) through.
 *
 * Falls back to the flat `restrictPhoneDigits` cap when the dial code maps
 * to no ISO country.
 */
export const restrictPhoneDigitsForCountry = (raw: string, dialCode: string): string => {
  let digits = raw.replace(/\D/g, '').slice(0, E164_MAX_DIGITS);
  const iso = isoForDialCode(dialCode);
  if (!iso) return digits;

  while (
    digits.length > 0 &&
    validatePhoneNumberLength(digits, iso as CountryCode) === 'TOO_LONG'
  ) {
    digits = digits.slice(0, -1);
  }

  const mobileLength = exampleMobileLength(iso);
  if (
    mobileLength &&
    digits.length > mobileLength &&
    !isPossiblePhoneNumber(digits, iso as CountryCode)
  ) {
    digits = digits.slice(0, mobileLength);
  }

  return digits;
};

/**
 * For a single free-entry E.164 field (no separate country picker) — keeps
 * an optional leading `+`, drops every other non-digit, and caps the digit
 * count at the E.164 ceiling. The caller's own validation still does the
 * real per-country length check at validate time; this only stops the raw
 * field from accepting junk or an unbounded run of keystrokes.
 */
export const restrictE164Input = (raw: string): string => {
  const hasPlus = raw.trimStart().startsWith('+');
  const digits = raw.replace(/\D/g, '').slice(0, E164_MAX_DIGITS);
  return hasPlus ? `+${digits}` : digits;
};

/**
 * A dial code (`countryCodes[].value`, e.g. `"+91"`) and digits-only national
 * number joined into the single E.164 string candidate-service actually
 * stores (`contact_no` — see candidate.py's "E.164, country code included."
 * comment; unlike organization-service's user table, candidates have no
 * separate country_code column).
 */
export const toE164 = (dialCode: string, nationalNumber: string): string =>
  `${dialCode}${nationalNumber.replace(/\D/g, '')}`;

/**
 * The reverse of `toE164` — splits a stored E.164 `contact_no` back into the
 * dial code + national number a `PhoneNumberField` needs to render. Used
 * only when loading an existing candidate into an edit form; a fresh form
 * has nothing to split.
 */
export const splitE164 = (
  value: string | null | undefined
): { countryCode: string; phoneNumber: string } => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return { countryCode: '', phoneNumber: '' };
  const parsed = parsePhoneNumberFromString(trimmed.startsWith('+') ? trimmed : `+${trimmed}`);
  if (parsed) {
    return { countryCode: `+${parsed.countryCallingCode}`, phoneNumber: parsed.nationalNumber };
  }
  // Not a number libphonenumber-js recognizes at all (e.g. legacy data
  // entered before this validation existed) — surface the digits as-is
  // rather than silently dropping them, with no dial code guessed.
  return { countryCode: '', phoneNumber: trimmed.replace(/\D/g, '') };
};

/**
 * A zod `.superRefine()` step for an object schema that has both a
 * dial-code field and a national-number field — phone validity depends on
 * both together, which a single field-level `.regex()` can never express
 * correctly across 180 different countries (the shape a valid number takes
 * is different in each one). Add with
 * `.superRefine(phoneWithCountry('countryCodeField', 'phoneField'))`.
 */
export const phoneWithCountry =
  (countryField: string, phoneField: string, options?: { required?: boolean }) =>
  (data: Record<string, unknown>, ctx: RefinementCtx): void => {
    const phone = String(data[phoneField] ?? '').trim();
    const dialCode = String(data[countryField] ?? '').trim();
    const required = options?.required ?? true;

    if (!phone) {
      if (required) {
        ctx.addIssue({
          code: 'custom',
          path: [phoneField],
          message: 'Phone Number is required.',
        });
      }
      return;
    }

    if (!dialCode) {
      // Nothing to validate the digit count against — the country field's
      // own validation (required elsewhere on the same form) is what
      // surfaces this, not a duplicate complaint here.
      return;
    }

    if (!isPhoneValidForCountry(phone, dialCode)) {
      ctx.addIssue({
        code: 'custom',
        path: [phoneField],
        message: PHONE_VALIDATION_MESSAGE,
      });
    }
  };
