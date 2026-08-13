import { get } from 'lodash-es';

/**
 * The flat error envelope every CFPro backend service returns on failure —
 * `{error_code, message, request_id}` from `cfp_platform`'s shared exception
 * handler (organization-service docs/RBAC_API.md; authentication-service
 * docs/API_CONTRACT.md §3 documents the identical shape independently, since
 * both build on the same shared package). One generic parser lives here so
 * every service-specific caller (authError.helpers.ts, orgError.helpers.ts,
 * …) reads it the same way instead of each re-deriving its own
 * `err?.data?.message` chain — DRY across service boundaries, not just within
 * one.
 */
export type PlatformApiErrorBody = {
  error_code?: string;
  message?: string;
  request_id?: string | null;
  details?: Record<string, unknown>;
};

export const getPlatformErrorBody = (err: unknown): PlatformApiErrorBody | undefined =>
  get(err, 'data') as PlatformApiErrorBody | undefined;

/**
 * The message to show a user. Never branch UI logic on this string — only on
 * `error_code` (getPlatformErrorCode) — services deliberately keep some
 * failure modes worded identically (e.g. auth's anti-enumeration responses).
 */
export const getPlatformErrorMessage = (err: unknown, fallback: string): string =>
  get(err, 'data.message', fallback);

export const getPlatformErrorCode = (err: unknown): string | undefined =>
  get(err, 'data.error_code');

export const getPlatformErrorRequestId = (err: unknown): string | undefined =>
  get(err, 'data.request_id') || undefined;
