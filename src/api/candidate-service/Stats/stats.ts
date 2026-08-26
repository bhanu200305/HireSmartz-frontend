import api from '../..';

/**
 * Candidate-pipeline stats for the recruiter/company-admin dashboard —
 * mirrors candidate-service's own `stats_router.py` docstring: one endpoint
 * per metric rather than one bundled payload, since these are independent
 * numbers with different query shapes and different callers. Every route
 * takes an optional `job_opening_id` — org-wide by default, narrowed to one
 * job when passed.
 *
 * candidate-service isn't its own RTK Query deployable yet (see
 * `Candidates.ts`'s use of the shared `api` from `src/api`) — these ride on
 * that same shared client rather than inventing a new one.
 */

export type TotalApplicationsResponse = {
  total: number;
};

export type ApplicationsOverTimePoint = {
  date: string;
  count: number;
};

export type ApplicationsOverTimeResponse = {
  points: ApplicationsOverTimePoint[];
};

export type FunnelStage = {
  stage: string;
  count: number;
};

export type HiringFunnelResponse = {
  stages: FunnelStage[];
};

export type InterviewStatusCount = {
  status: string;
  count: number;
};

export type InterviewsByStatusResponse = {
  counts: InterviewStatusCount[];
};

export type CompletedInterviewsResponse = {
  total: number;
};

export type CandidateStatsParams = {
  jobOpeningId?: string;
};

type SuccessEnvelope<T> = {
  status: 'success';
  status_code: number;
  message: string;
  data: T;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getTotalApplications: build.query<TotalApplicationsResponse, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/total-applications',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      transformResponse: (response: SuccessEnvelope<TotalApplicationsResponse>) => response.data,
    }),
    getApplicationsOverTime: build.query<
      ApplicationsOverTimeResponse,
      (CandidateStatsParams & { days?: number }) | void
    >({
      query: (params) => ({
        url: '/candidates/stats/applications-over-time',
        params: { job_opening_id: params?.jobOpeningId, days: params?.days },
      }),
      transformResponse: (response: SuccessEnvelope<ApplicationsOverTimeResponse>) => response.data,
    }),
    getHiringFunnel: build.query<HiringFunnelResponse, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/hiring-funnel',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      transformResponse: (response: SuccessEnvelope<HiringFunnelResponse>) => response.data,
    }),
    getInterviewsByStatus: build.query<InterviewsByStatusResponse, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/interviews-by-status',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      transformResponse: (response: SuccessEnvelope<InterviewsByStatusResponse>) => response.data,
    }),
    getCompletedInterviews: build.query<CompletedInterviewsResponse, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/completed-interviews',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      transformResponse: (response: SuccessEnvelope<CompletedInterviewsResponse>) => response.data,
    }),
  }),
});

export const {
  useGetTotalApplicationsQuery,
  useGetApplicationsOverTimeQuery,
  useGetHiringFunnelQuery,
  useGetInterviewsByStatusQuery,
  useGetCompletedInterviewsQuery,
} = extendedApi;
