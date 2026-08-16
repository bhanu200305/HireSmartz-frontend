import {
  PlatformApiErrorBody,
  getPlatformErrorBody,
  getPlatformErrorCode,
  getPlatformErrorMessage,
  getPlatformErrorRequestId,
} from '../api/platformErrorEnvelope';

/**
 * notification-service's error envelope — same flat
 * `{error_code, message, request_id, details?}` shape every CFPro service
 * returns via `cfp_platform`'s shared exception handler (confirmed against
 * `cfp_platform/middleware/exception_handler.py`, not the service's own
 * docs/API.md, whose `{"error": {...}}` example is stale). Same wrapper
 * pattern as `orgError.helpers.ts`.
 *
 * `VALIDATION_ERROR` on `PUT /v1/preferences/me` carries the refused
 * `category` in `details.category` — see `getNotifErrorBody(err)?.details`.
 */
export type NotifApiErrorBody = PlatformApiErrorBody;

export const getNotifErrorBody = getPlatformErrorBody;

/** The message to show a user — the backend's own wording, never invented client-side. */
export const getNotifErrorMessage = getPlatformErrorMessage;

/** Branch on this for a specific `error_code`; never on the message text. */
export const getNotifErrorCode = getPlatformErrorCode;

export const getNotifErrorRequestId = getPlatformErrorRequestId;
