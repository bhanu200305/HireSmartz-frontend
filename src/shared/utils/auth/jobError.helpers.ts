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

/** permission code -> plain-English action, for the PERMISSION_DENIED
 * message below. Unlisted codes fall back to "do this". */
const PERMISSION_ACTION_LABELS: Record<string, string> = {
  'job:write': 'create job openings',
  'job:update': 'edit job openings',
  'job:delete': 'delete job openings',
  'job:approve': 'publish or close job openings',
  'tenant_job_title:write': 'add job titles',
  'tenant_job_title:update': 'edit job titles',
  'tenant_job_title:delete': 'delete job titles',
  'department:write': 'add departments',
  'department:update': 'edit departments or their job titles',
  'department:delete': 'delete departments',
  'location:read': 'view office locations',
  'location:write': 'add office locations',
  'location:update': 'edit office locations',
  'location:delete': 'delete office locations',
  'organization:read': "view this organization's configured data",
  'organization:update': 'edit these organization settings',
  'tenant_job_title:read': 'view job titles',
};

const ROUND_ERROR_MESSAGES: Record<string, string> = {
  INTAKE_CALL_POSITION_INVALID: 'The Intake Call must be round 2, right after Resume Review.',
  RESUME_ROUND_POSITION_INVALID: 'Resume Review must always be round 1.',
  ASSIGNEE_LOCATION_PERMISSION_DENIED:
    'A selected hiring manager or recruiter is not allowed to work on jobs at this location. Pick someone who has access to it.',
  RESUME_ROUND_CANNOT_BE_MODIFIED: 'Resume Review is required and cannot be removed or changed.',
};

/** The message to show a user — on a PERMISSION_DENIED error, replaces the
 * generic backend text with what they can't do and who to ask. */
export const getJobErrorMessage = (err: unknown, fallback: string): string => {
  const message = getPlatformErrorMessage(err, fallback);
  const code = getPlatformErrorCode(err);
  if (code && ROUND_ERROR_MESSAGES[code]) return ROUND_ERROR_MESSAGES[code];
  if (code !== 'PERMISSION_DENIED') return message;

  const required = getPlatformErrorDetails(err)?.required;
  const codes = Array.isArray(required) ? required : typeof required === 'string' ? [required] : [];
  if (codes.length === 0) return message;

  const actions = codes
    .map((code) => PERMISSION_ACTION_LABELS[String(code)] ?? 'do this')
    .join(' and ');
  return `You don't have permission to ${actions}. Contact your company admin for access.`;
};

/** Branch on this for a specific `error_code`; never on the message text. */
export const getJobErrorCode = getPlatformErrorCode;

/** Structured extras a specific error attached, e.g. `failed_checks`. */
export const getJobErrorDetails = getPlatformErrorDetails;

/** Worth surfacing in support-facing copy — ties a report to a server log. */
export const getJobErrorRequestId = getPlatformErrorRequestId;
