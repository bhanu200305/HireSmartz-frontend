import { jobApi } from '../jobApi';
import type { JobDetailsResponse, SaveJobDetailsRequest } from '../types';

/**
 * Legacy filename kept for import stability. Updates go through
 * PUT /job-openings/{id}/details on the real job-service.
 */
type UpdateJobOpeningArgs = {
  jobOpeningId: string;
  body: SaveJobDetailsRequest;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    // Alias also exported from AddJobOpening — overrideExisting lets either
    // import path work without colliding at inject time.
    updateJobOpeningDetails: build.mutation<JobDetailsResponse, UpdateJobOpeningArgs>({
      query: ({ jobOpeningId, body }) => ({
        url: `/job-openings/${jobOpeningId}/details`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [
        { type: 'JobOpenings', id: 'LIST' },
        { type: 'JobOpeningById', id: jobOpeningId },
        { type: 'JobDetails', id: jobOpeningId },
        'JobStats',
      ],
    }),
  }),
  overrideExisting: true,
});

// Re-export the primary update hook from AddJobOpening so existing
// `from '.../UpdateJobOpening'` imports keep working.
export { useUpdateJobOpeningMutation } from './AddJobOpening';
export const { useUpdateJobOpeningDetailsMutation } = extendedApi;
