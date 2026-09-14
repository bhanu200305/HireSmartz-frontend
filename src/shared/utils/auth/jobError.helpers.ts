import {
  PlatformApiErrorBody,
  getPlatformErrorBody,
  getPlatformErrorCode,
  getPlatformErrorDetails,
  getPlatformErrorMessage,
  getPlatformErrorRequestId,
} from '../api/platformErrorEnvelope';

/**
 * job-service's flat error envelope — identical shape to organization-
 * service / authentication-service (all build on `cfp_platform`'s shared
 * exception handler; see services/job-service/docs/API_CONTRACT.md §3).
 * Branch on `error_code` (e.g. JOB_NOT_FOUND, SCORING_WEIGHTS_NOT_TOTAL_HUNDRED),
 * never on the message text.
 */
export type JobApiErrorBody = PlatformApiErrorBody;

export const getJobErrorBody = getPlatformErrorBody;

/** The message to show a user — the backend's own wording. */
export const getJobErrorMessage = getPlatformErrorMessage;

/** Branch on this for a specific `error_code`; never on the message text. */
export const getJobErrorCode = getPlatformErrorCode;

/** Structured extras a specific error attached, e.g. `failed_checks`. */
export const getJobErrorDetails = getPlatformErrorDetails;

/** Worth surfacing in support-facing copy — ties a report to a server log. */
export const getJobErrorRequestId = getPlatformErrorRequestId;
