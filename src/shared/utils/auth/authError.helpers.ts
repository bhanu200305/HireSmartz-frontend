import {
  PlatformApiErrorBody,
  getPlatformErrorBody,
  getPlatformErrorCode,
  getPlatformErrorDetails,
  getPlatformErrorMessage,
  toToastCase,
} from '../api/platformErrorEnvelope';

/**
 * authentication-service's flat error envelope, returned by every endpoint
 * on every failure (docs/API_CONTRACT.md §3). Thin, auth-service-named
 * wrapper around the generic platform envelope parser
 * (shared/utils/api/platformErrorEnvelope.ts) — every other service (see
 * orgError.helpers.ts) gets the same wrapper shape instead of a copy of the
 * parsing logic.
 */
export type AuthApiErrorBody = PlatformApiErrorBody;

export const getAuthErrorBody = getPlatformErrorBody;

/**
 * The message to show a user. Never branch UI logic on this string — only
 * on `error_code` (getAuthErrorCode) — the contract deliberately keeps
 * several failure modes worded identically to avoid becoming an
 * account-enumeration oracle (§4.1).
 *
 * Special-cased for `password_policy_violation`: `PasswordPolicyError`'s own
 * `.message` is just the generic "password does not meet the policy" — EVERY
 * specific reason (too short, too common, contains the user's email, …) is
 * reported as a list under `details.violations`
 * (authentication-service's `PasswordPolicy.violations()`, which deliberately
 * returns every broken rule at once, not just the first). Falling through to
 * `getPlatformErrorMessage` alone would show only that generic sentence and
 * hide the actual reason — the "form looked valid, then a generic error"
 * complaint this exists to fix — so read the specific list first and only
 * fall back to the generic message when there isn't one.
 */
export const getAuthErrorMessage = (err: unknown, fallback: string): string => {
  if (getPlatformErrorCode(err) === 'password_policy_violation') {
    const violations = getPlatformErrorDetails(err)?.violations;
    if (Array.isArray(violations) && violations.length > 0) {
      return toToastCase(violations.map(String).join('; '));
    }
  }
  return getPlatformErrorMessage(err, fallback);
};

export const getAuthErrorCode = getPlatformErrorCode;
