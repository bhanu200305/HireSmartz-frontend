import { api } from '../../index';

export type JobScoringStage = 'RESUME' | 'INTERVIEW';

export type JobScoringWeight = {
  id: number;
  categoryName: string;
  weightPercentage: number;
};

export type JobScoringConfigEntry = {
  id: number;
  jobOpeningId: number;
  stage: JobScoringStage;
  isDefaultSnapshot: boolean;
  sourceConfigId: number | null;
  weights: JobScoringWeight[];
  createdAt: string;
  updatedAt: string;
};

export type JobScoringConfigData = {
  jobOpeningId: number;
  resumeConfig: JobScoringConfigEntry;
  interviewConfig: JobScoringConfigEntry;
};

export type JobScoringConfigResponse = {
  success: boolean;
  message: string;
  data: JobScoringConfigData;
};

export type UpdateJobScoringConfigRequest = {
  jobId: number;
  stage: JobScoringStage;
  weights: JobScoringWeight[];
};

export type UpdateJobScoringConfigResponse = {
  success: boolean;
  message: string;
  data: JobScoringConfigEntry;
};

export const jobScoringConfigApi = api.injectEndpoints({
  endpoints: (build) => ({
    getJobScoringConfig: build.query<JobScoringConfigResponse, number>({
      query: (jobId) => ({
        url: `/job-scoring-configs/${jobId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, jobId) => [
        { type: 'SAMPLE_TAG_TYPES', id: `job-scoring-${jobId}` },
      ],
    }),

    updateJobScoringConfig: build.mutation<
      UpdateJobScoringConfigResponse,
      UpdateJobScoringConfigRequest
    >({
      query: ({ jobId, stage, weights }) => ({
        url: `/job-scoring-configs/${jobId}`,
        method: 'PUT',
        body: { stage, weights },
      }),
      invalidatesTags: (_result, _error, { jobId }) => [
        { type: 'SAMPLE_TAG_TYPES', id: `job-scoring-${jobId}` },
      ],
    }),

    resetJobScoringConfig: build.mutation<
      UpdateJobScoringConfigResponse,
      { jobId: number; stage: JobScoringStage }
    >({
      query: ({ jobId, stage }) => ({
        url: `/job-scoring-configs/${jobId}/reset`,
        method: 'POST',
        params: { stage },
        body: '',
      }),
      invalidatesTags: (_result, _error, { jobId }) => [
        { type: 'SAMPLE_TAG_TYPES', id: `job-scoring-${jobId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetJobScoringConfigQuery,
  useUpdateJobScoringConfigMutation,
  useResetJobScoringConfigMutation,
} = jobScoringConfigApi;
