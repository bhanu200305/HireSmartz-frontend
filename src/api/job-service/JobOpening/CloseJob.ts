import { jobApi } from '../jobApi';
import type { CloseJobRequest, CloseJobResponse } from '../types';

type CloseJobMutationRequest = {
  jobId: string;
  reasonId?: string | null;
  customReason?: string;
  notifyCandidates?: boolean;
};

type CloseJobMutationResponse = {
  success: boolean;
  message?: string;
  data?: CloseJobResponse;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    closeJob: build.mutation<CloseJobMutationResponse, CloseJobMutationRequest>({
      query: ({ jobId, reasonId, customReason, notifyCandidates = true }) => {
        const body: CloseJobRequest = {
          closure_reason_id: reasonId || null,
          custom_reason: customReason || null,
          notify_candidates: notifyCandidates,
        };
        return {
          url: `/job-openings/${jobId}/close`,
          method: 'POST',
          body,
        };
      },
      transformResponse: (response: CloseJobResponse): CloseJobMutationResponse => ({
        success: true,
        message: 'Job closed successfully.',
        data: response,
      }),
      invalidatesTags: (_r, _e, { jobId }) => [
        { type: 'JobOpenings', id: 'LIST' },
        { type: 'JobDetails', id: jobId },
        'JobStats',
      ],
    }),

    reopenJob: build.mutation<CloseJobResponse, string>({
      query: (jobId) => ({
        url: `/job-openings/${jobId}/reopen`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, jobId) => [
        { type: 'JobOpenings', id: 'LIST' },
        { type: 'JobDetails', id: jobId },
        'JobStats',
      ],
    }),

    publishJob: build.mutation<
      { org_job_opening_id: string; is_draft: boolean; is_published: boolean },
      string
    >({
      query: (jobId) => ({
        url: `/job-openings/${jobId}/publish`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, jobId) => [
        { type: 'JobOpenings', id: 'LIST' },
        { type: 'JobOpeningById', id: jobId },
        { type: 'JobDetails', id: jobId },
        { type: 'WizardState', id: jobId },
        'JobStats',
      ],
    }),

    validateForPublish: build.query<
      {
        is_valid: boolean;
        failed_checks: string[];
        rounds_missing_questions?: string[];
        round_ids_missing_questions?: string[];
      },
      string
    >({
      query: (jobId) => ({
        url: `/job-openings/${jobId}/publish/validate`,
        method: 'GET',
      }),
      providesTags: (_r, _e, jobId) => [
        { type: 'WizardState', id: jobId },
        { type: 'JobQuestions', id: jobId },
        { type: 'JobOpeningById', id: jobId },
      ],
    }),
  }),
});

export const {
  useCloseJobMutation,
  useReopenJobMutation,
  usePublishJobMutation,
  useValidateForPublishQuery,
  useLazyValidateForPublishQuery,
} = extendedApi;
