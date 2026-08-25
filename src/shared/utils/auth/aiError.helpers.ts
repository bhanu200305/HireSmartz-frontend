import {
  PlatformApiErrorBody,
  getPlatformErrorBody,
  getPlatformErrorCode,
  getPlatformErrorMessage,
  getPlatformErrorRequestId,
} from '../api/platformErrorEnvelope';

/** ai-service's flat error envelope — same shape/reasoning as
 * orgError.helpers.ts / jobError.helpers.ts. */
export type AiApiErrorBody = PlatformApiErrorBody;

export const getAiErrorBody = getPlatformErrorBody;
export const getAiErrorMessage = getPlatformErrorMessage;
export const getAiErrorCode = getPlatformErrorCode;
export const getAiErrorRequestId = getPlatformErrorRequestId;
