import {
  PlatformApiErrorBody,
  getPlatformErrorBody,
  getPlatformErrorCode,
  getPlatformErrorMessage,
  getPlatformErrorRequestId,
} from '../api/platformErrorEnvelope';

/**
 * organization-service's flat error envelope — identical shape to
 * authentication-service's (both build on `cfp_platform`'s shared exception
 * handler; see RBAC_API.md's example body). Every org-service screen should
 * read errors through this instead of a local `err?.data?.message` chain, so
 * `error_code`-specific handling (DUPLICATE_INVITATION,
 * LAST_ADMIN_REMOVAL_BLOCKED, PRIVILEGE_ESCALATION_BLOCKED,
 * ADMIN_ROLE_REQUIRES_INVITE, DEPARTMENT_HAS_ACTIVE_JOBS, …) stays in one
 * place per call site instead of re-deriving the envelope shape each time.
 */
export type OrgApiErrorBody = PlatformApiErrorBody;

export const getOrgErrorBody = getPlatformErrorBody;

/** The message to show a user — the backend's own wording, never invented client-side. */
export const getOrgErrorMessage = getPlatformErrorMessage;

/** Branch on this for a specific `error_code`; never on the message text. */
export const getOrgErrorCode = getPlatformErrorCode;

/** Worth surfacing in support-facing copy — ties a user's report to a server-side log line. */
export const getOrgErrorRequestId = getPlatformErrorRequestId;
