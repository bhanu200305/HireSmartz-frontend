import { jobApi } from '../jobApi';
import type { JobDetailsResponse, SaveJobDetailsRequest } from '../types';

/**
 * Create-path "save" — creates a MANUAL draft then writes Job Details.
 * Kept under the legacy hook name `useSaveJobOpeningMutation` so existing
 * screens keep compiling while the payload moves to the real contract.
 */
type SaveJobOpeningArgs = {
  details: SaveJobDetailsRequest;
};

type SaveJobOpeningResult = {
  org_job_opening_id: string;
  job_profile_code: string;
  details: JobDetailsResponse;
};

type UpdateJobOpeningArgs = {
  jobOpeningId: string;
  body: SaveJobDetailsRequest;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    saveJobOpening: build.mutation<SaveJobOpeningResult, SaveJobOpeningArgs>({
      async queryFn({ details }, _api, _extra, baseQuery) {
        const draftResult = await baseQuery({
          url: '/job-openings/draft',
          method: 'POST',
          body: { entry_path: 'MANUAL' },
        });
        if (draftResult.error) {
          return { error: draftResult.error };
        }
        const draft = draftResult.data as {
          org_job_opening_id: string;
          job_profile_code: string;
        };
        const detailsResult = await baseQuery({
          url: `/job-openings/${draft.org_job_opening_id}/details`,
          method: 'PUT',
          body: details,
        });
        if (detailsResult.error) {
          return { error: detailsResult.error };
        }
        return {
          data: {
            org_job_opening_id: draft.org_job_opening_id,
            job_profile_code: draft.job_profile_code,
            details: detailsResult.data as JobDetailsResponse,
          },
        };
      },
      invalidatesTags: [{ type: 'JobOpenings', id: 'LIST' }, 'JobStats'],
    }),

    updateJobOpening: build.mutation<JobDetailsResponse, UpdateJobOpeningArgs>({
      query: ({ jobOpeningId, body }) => ({
        url: `/job-openings/${jobOpeningId}/details`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [
        { type: 'JobOpenings', id: 'LIST' },
        { type: 'JobOpeningById', id: jobOpeningId },
        { type: 'JobDetails', id: jobOpeningId },
        { type: 'WizardState', id: jobOpeningId },
      ],
    }),

    getJobDetails: build.query<JobDetailsResponse, string>({
      query: (jobOpeningId) => ({
        url: `/job-openings/${jobOpeningId}/details`,
        method: 'GET',
      }),
      providesTags: (_r, _e, jobOpeningId) => [{ type: 'JobDetails', id: jobOpeningId }],
    }),
  }),
});

export const {
  useSaveJobOpeningMutation,
  useUpdateJobOpeningMutation,
  useGetJobDetailsQuery,
  useLazyGetJobDetailsQuery,
} = extendedApi;
