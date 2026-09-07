import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import type { RefinementCtx } from 'zod';
import { countryCodes } from '../../../constants/countryCode';

// ITU E.164's own ceiling on a full number (dial code + national number) —
// used only to stop a raw input field from accepting an absurd number of
// keystrokes as someone types. The real, per-country digit count is
// enforced by `isPhoneValidForCountry` below at validate/submit time, not
// by this cap; a country's actual national-number length is usually far
// shorter than 15 and isn't a single fixed value everywhere (some countries
// accept more than one length), so capping input tighter than this per
// keystroke isn't reliable — `isValidPhoneNumber`'s own metadata is.
const E164_MAX_DIGITS = 15;

const isoForDialCode = (dialCode: string): string | undefined =>
  countryCodes.find((c) => c.value === dialCode)?.short;

/**
 * `nationalNumber` is digits only (no dial code, no punctuation).
 * `dialCode` is what this codebase's country pickers already store —
 * `countryCodes[].value`, e.g. `"+91"` — resolved here to the ISO country
 * (`countryCodes[].short`) libphonenumber-js actually validates against,
 * since a shared dial code (`+1` covers both US and Canada, `+44` covers
 * the UK and several territories) can't reliably identify a country on its
 * own the way the ISO code can.
 */
export const isPhoneValidForCountry = (nationalNumber: string, dialCode: string): boolean => {
  const digits = nationalNumber.replace(/\D/g, '');
  if (!digits || !dialCode) return false;
  const iso = isoForDialCode(dialCode);
  return iso
    ? isValidPhoneNumber(digits, iso as CountryCode)
    : isValidPhoneNumber(`${dialCode}${digits}`);
};

export const PHONE_VALIDATION_MESSAGE =
  'Enter a valid phone number for the selected country — the digit count must match.';

/** Digits only, capped at the E.164 ceiling — see that constant's own comment. */
export const restrictPhoneDigits = (raw: string): string =>
  raw.replace(/\D/g, '').slice(0, E164_MAX_DIGITS);

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
          message: 'Phone number is required.',
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
