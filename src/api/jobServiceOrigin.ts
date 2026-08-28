/** Host of job-service, without the `/api/v1` prefix jobApi adds. */
export const jobServiceOrigin = (): string => {
  const endpoint = String(import.meta.env.VITE_JOB_SERVICE_ENDPOINT || 'http://localhost:8001');
  try {
    return new URL(endpoint).origin;
  } catch {
    return 'http://localhost:8001';
  }
};
