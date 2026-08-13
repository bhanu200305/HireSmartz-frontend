import {
  PlatformApiErrorBody,
  getPlatformErrorBody,
  getPlatformErrorCode,
  getPlatformErrorMessage,
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
 */
export const getAuthErrorMessage = getPlatformErrorMessage;

export const getAuthErrorCode = getPlatformErrorCode;
