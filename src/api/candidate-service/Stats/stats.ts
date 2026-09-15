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
  //: "AUDIO" | "AVATAR" | "VIDEO" — rounds that don't classify into one of
  //: these three (e.g. Identity Verification) are excluded by the backend,
  //: not given a 4th bucket. Added 2026-09-15 alongside the Hiring
  //: Manager/Recruiter KPI additions — "Interviews by Status & Type" needs
  //: the type split for its grouped bar, not just status.
  round_type: string;
  status: string;
  count: number;
};

export type InterviewsByStatusView = { counts: InterviewStatusCount[] };

export type CompletedInterviewsView = { total: number };

/** `job_opening_id`/`average` per job — a job with no scored candidates yet
 * is simply absent, not present with a `0`/`null` average. */
export type AverageResumeScoreByJobItem = { job_opening_id: string; average: number };
export type AverageResumeScoreByJobView = { jobs: AverageResumeScoreByJobItem[] };

/** A job with no candidate currently SCHEDULED for a Panel round is simply
 * absent from `jobs`, not present with a `0`. */
export type PanelInterviewsScheduledByJobItem = { job_opening_id: string; count: number };
export type PanelInterviewsScheduledByJobView = {
  jobs: PanelInterviewsScheduledByJobItem[];
};

export type CandidatesInReviewView = { total: number };

export type PendingDecisionsView = { total: number };

/** A location with zero SELECTED candidates is simply absent, not present
 * with a `0`. */
export type SelectedCandidatesByLocationItem = { location: string; count: number };
export type SelectedCandidatesByLocationView = {
  locations: SelectedCandidatesByLocationItem[];
};

/** One row of "Qualified candidate pool" or "Pending decisions" — job name
 * and candidate display name are resolved client-side (job-service /
 * org-service data), same as everywhere else in this app. */
export type CandidatePoolItem = {
  candidate_id: string;
  job_opening_id: string;
  first_name: string | null;
  last_name: string | null;
  location: string | null;
  resume_score: number | null;
  interview_score: number | null;
  stage: string;
  status_code: string | null;
  status_label: string | null;
  applied_date: string | null;
};

export type CandidatePoolListView = {
  items: CandidatePoolItem[];
  limit: number;
  offset: number;
  total: number;
};

export type CandidatePoolListParams = CandidateStatsParams & { limit?: number; offset?: number };

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

    // -- Hiring Manager / Recruiter KPI additions (2026-09-15) -------------

    getAverageResumeScoreByJob: build.query<
      AverageResumeScoreByJobView,
      CandidateStatsParams | void
    >({
      query: (params) => ({
        url: '/candidates/stats/average-resume-score-by-job',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),

    getPanelInterviewsScheduledByJob: build.query<
      PanelInterviewsScheduledByJobView,
      CandidateStatsParams | void
    >({
      query: (params) => ({
        url: '/candidates/stats/panel-interviews-scheduled-by-job',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),

    getCandidatesInReview: build.query<CandidatesInReviewView, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/candidates-in-review',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),

    getPendingDecisions: build.query<PendingDecisionsView, CandidateStatsParams | void>({
      query: (params) => ({
        url: '/candidates/stats/pending-decisions',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),

    getSelectedCandidatesByLocation: build.query<
      SelectedCandidatesByLocationView,
      CandidateStatsParams | void
    >({
      query: (params) => ({
        url: '/candidates/stats/selected-candidates-by-location',
        params: { job_opening_id: params?.jobOpeningId },
      }),
      providesTags: ['CandidateStats'],
    }),

    getQualifiedCandidatePool: build.query<CandidatePoolListView, CandidatePoolListParams | void>({
      query: (params) => ({
        url: '/candidates/stats/qualified-candidate-pool',
        params: {
          job_opening_id: params?.jobOpeningId,
          limit: params?.limit,
          offset: params?.offset,
        },
      }),
      providesTags: ['CandidateStats'],
    }),

    getPendingDecisionsList: build.query<CandidatePoolListView, CandidatePoolListParams | void>({
      query: (params) => ({
        url: '/candidates/stats/pending-decisions-list',
        params: {
          job_opening_id: params?.jobOpeningId,
          limit: params?.limit,
          offset: params?.offset,
        },
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
  useGetAverageResumeScoreByJobQuery,
  useGetPanelInterviewsScheduledByJobQuery,
  useGetCandidatesInReviewQuery,
  useGetPendingDecisionsQuery,
  useGetSelectedCandidatesByLocationQuery,
  useGetQualifiedCandidatePoolQuery,
  useGetPendingDecisionsListQuery,
} = extendedApi;
