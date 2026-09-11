import { jobApi } from '../jobApi';
import type { CategoryWeightOverride, ScoringCriteriaResponse } from '../types';

export type JobScoringStage = 'RESUME' | 'INTERVIEW';

export type JobScoringWeight = {
  id: string | number;
  categoryName: string;
  displayName?: string;
  description?: string;
  weightPercentage: number;
  appliesPanel?: boolean;
};

export type JobScoringConfigData = {
  jobOpeningId: string;
  isLocked: boolean;
  resumeConfig: { weights: JobScoringWeight[] };
  interviewConfig: { weights: JobScoringWeight[] };
};

export type JobScoringConfigResponse = {
  success: boolean;
  message: string;
  data: JobScoringConfigData;
};

export type UpdateJobScoringConfigRequest = {
  jobId: string;
  /** Both panels are always submitted together on the real contract. */
  resumeWeights: JobScoringWeight[];
  interviewWeights: JobScoringWeight[];
};

const toApiWeights = (weights: JobScoringWeight[]): CategoryWeightOverride[] =>
  weights.map((w) => ({
    category_code: w.categoryName,
    weight_pct: w.weightPercentage,
  }));

const fromApiWeights = (
  weights: ScoringCriteriaResponse['resume']['weights']
): JobScoringWeight[] =>
  (weights ?? []).map((w, index) => ({
    id: w.category_code || index + 1,
    categoryName: w.category_code,
    displayName: w.display_name,
    description: w.description,
    weightPercentage: Number(w.weight_pct),
    appliesPanel: w.applies_panel,
  }));

const toUiResponse = (response: ScoringCriteriaResponse): JobScoringConfigResponse => ({
  success: true,
  message: 'OK',
  data: {
    jobOpeningId: response.org_job_opening_id,
    isLocked: response.is_locked,
    resumeConfig: { weights: fromApiWeights(response.resume?.weights ?? []) },
    interviewConfig: { weights: fromApiWeights(response.interview?.weights ?? []) },
  },
});

export const jobScoringConfigApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getJobScoringConfig: build.query<JobScoringConfigResponse, string>({
      query: (jobId) => ({
        url: `/job-openings/${jobId}/scoring-criteria`,
        method: 'GET',
      }),
      transformResponse: toUiResponse,
      providesTags: (_r, _e, jobId) => [{ type: 'JobScoring', id: jobId }],
    }),

    updateJobScoringConfig: build.mutation<JobScoringConfigResponse, UpdateJobScoringConfigRequest>(
      {
        query: ({ jobId, resumeWeights, interviewWeights }) => ({
          url: `/job-openings/${jobId}/scoring-criteria`,
          method: 'PUT',
          body: {
            resume_weights: toApiWeights(resumeWeights),
            interview_weights: toApiWeights(interviewWeights),
          },
        }),
        transformResponse: toUiResponse,
        invalidatesTags: (_r, _e, { jobId }) => [
          { type: 'JobScoring', id: jobId },
          { type: 'WizardState', id: jobId },
        ],
      }
    ),

    resetJobScoringConfig: build.mutation<JobScoringConfigResponse, { jobId: string }>({
      query: ({ jobId }) => ({
        url: `/job-openings/${jobId}/scoring-criteria/reset`,
        method: 'POST',
      }),
      transformResponse: toUiResponse,
      invalidatesTags: (_r, _e, { jobId }) => [{ type: 'JobScoring', id: jobId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetJobScoringConfigQuery,
  useUpdateJobScoringConfigMutation,
  useResetJobScoringConfigMutation,
} = jobScoringConfigApi;
