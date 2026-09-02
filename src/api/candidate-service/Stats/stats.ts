import candidateApi from '../candidateApi';

/**
 * Candidate-pipeline stats for the recruiter/company-admin dashboard —
 * `API_CONTRACT.md`'s "Candidate Stats" section
 * (`/api/v1/candidates/stats/*`): one endpoint per metric, not a bundled
 * dashboard payload, since these are independent numbers with different
 * query shapes and different callers. Every route takes an optional
 * `job_opening_id` — org-wide by default, narrowed to one job when passed.
 *
 * Rewritten onto the real `candidateApi` client (was riding the legacy
 * shared `api` instance, pointed at whatever backend `VITE_BACKEND_ENDPOINT`
 * happens to be — the URLs were already correct, the client wasn't). Also
 * adds the 2 endpoints the previous version was missing
 * (`resume-score-distribution`, `average-resume-score`) and the
 * `granularity` param on `applications-over-time`.
 */

export type TotalApplicationsView = { total: number };

export type ApplicationsOverTimePoint = {
  date: string;
  count: number;
};

/** Zero-filled series — every day/week/month in range appears, even with count 0. */
export type ApplicationsOverTimeView = { points: ApplicationsOverTimePoint[] };

/**
 * Four INDEPENDENT counts, not a strict step-down funnel where each number
 * is a subset of the last — don't render this as a classic funnel chart
 * assuming monotonic decrease unless you've confirmed the data behaves
 * that way for your data set (API_CONTRACT.md's own explicit warning).
 */
export type FunnelStage = {
  stage: 'applied' | 'ai_screened' | 'interview_scheduled' | 'selected';
  count: number;
};

export type HiringFunnelView = { stages: FunnelStage[] };

export type InterviewStatusCount = {
  status: string;
  count: number;
};

export type InterviewsByStatusView = { counts: InterviewStatusCount[] };

export type CompletedInterviewsView = { total: number };

/** `band` is always one of these five fixed strings — not a free-form range. */
export type ResumeScoreBand = '0-2' | '2-4' | '4-6' | '6-8' | '8-10';

export type ResumeScoreDistributionBand = {
  band: ResumeScoreBand;
  count: number;
};

export type ResumeScoreDistributionView = { bands: ResumeScoreDistributionBand[] };

/** `null` means "nothing has been scored yet," not `0` — render "—", not "0.0". */
export type AverageResumeScoreView = { average: number | null };

export type CandidateStatsParams = { jobOpeningId?: string };

const extendedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    getTotalApplications: build.query<TotalApplicationsView, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/total-applications',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),

    getApplicationsOverTime: build.query<
      ApplicationsOverTimeView,
      | (CandidateStatsParams & { days?: number; granularity?: 'daily' | 'weekly' | 'monthly' })
      | void
    >({
      query: (params) => ({
        url: '/candidates/stats/applications-over-time',
        params: {
          job_opening_id: params?.jobOpeningId,
          days: params?.days,
          granularity: params?.granularity,
        },
      }),
      providesTags: ['CandidateStats'],
    }),

    getHiringFunnel: build.query<HiringFunnelView, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/hiring-funnel',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),

    getInterviewsByStatus: build.query<InterviewsByStatusView, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/interviews-by-status',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),

    getCompletedInterviews: build.query<CompletedInterviewsView, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/completed-interviews',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),

    getResumeScoreDistribution: build.query<
      ResumeScoreDistributionView,
      CandidateStatsParams | void
    >({
      query: (params) => ({
        url: '/candidates/stats/resume-score-distribution',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),

    getAverageResumeScore: build.query<AverageResumeScoreView, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/average-resume-score',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTotalApplicationsQuery,
  useGetApplicationsOverTimeQuery,
  useGetHiringFunnelQuery,
  useGetInterviewsByStatusQuery,
  useGetCompletedInterviewsQuery,
  useGetResumeScoreDistributionQuery,
  useGetAverageResumeScoreQuery,
} = extendedApi;
