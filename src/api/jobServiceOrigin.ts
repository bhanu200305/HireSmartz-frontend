/**
 * Host of job-service, without the `/api/v1` prefix jobApi adds.
 *
 * No localhost fallback, deliberately: a misconfigured deploy that's
 * missing `VITE_JOB_SERVICE_ENDPOINT` should fail loudly right here,
 * not silently point SSE/streaming at localhost and fail confusingly
 * in the user's browser instead.
 */
export const jobServiceOrigin = (): string => {
  const endpoint = import.meta.env.VITE_JOB_SERVICE_ENDPOINT;
  if (!endpoint) {
    throw new Error('VITE_JOB_SERVICE_ENDPOINT is not set');
  }
  return new URL(endpoint).origin;
};
