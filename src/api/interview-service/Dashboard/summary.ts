import api from '../..';

// GET /dashboard/summary?job_id={uuid} — interview-service's own
// self-contained aggregates for one job. Round-type breakdown
// (Audio/AI/Panel) that used to live here was removed along with
// `average_score` (see the backend DTO's own docstring) — `status_counts`
// is keyed by booking status (scheduled/completed/cancelled/no_show), not
// interview type, so that split isn't available from this endpoint today.
export type InterviewSummary = {
  job_id: string;
  total_bookings: number;
  status_counts: Record<string, number>;
  /** `null` when total_bookings is 0. */
  no_show_rate: number | null;
  completion_rate: number | null;
};

type SuccessEnvelope<T> = {
  status: 'success';
  status_code: number;
  message: string;
  data: T;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getInterviewSummary: build.query<InterviewSummary, string>({
      query: (jobId) => ({ url: '/dashboard/summary', params: { job_id: jobId } }),
      transformResponse: (response: SuccessEnvelope<InterviewSummary>) => response.data,
    }),
  }),
});

export const { useGetInterviewSummaryQuery } = extendedApi;
