import {
  PlatformApiErrorBody,
  getPlatformErrorBody,
  getPlatformErrorCode,
  getPlatformErrorMessage,
  getPlatformErrorRequestId,
} from '../api/platformErrorEnvelope';

/**
 * job-service's flat error envelope — identical shape to organization-
 * service's (both build on `cfp_platform`'s shared exception handler /
 * ResponseEnvelopeMiddleware). Every job-service screen should read errors
 * through this instead of a local `err?.data?.message` chain, same
 * convention as orgError.helpers.ts.
 */
export type JobApiErrorBody = PlatformApiErrorBody;

export const getJobErrorBody = getPlatformErrorBody;
export const getJobErrorMessage = getPlatformErrorMessage;
export const getJobErrorCode = getPlatformErrorCode;
export const getJobErrorRequestId = getPlatformErrorRequestId;
