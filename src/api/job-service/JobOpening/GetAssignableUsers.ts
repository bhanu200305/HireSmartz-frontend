import { jobApi } from '../jobApi';

/**
 * Backs the Hiring Manager and Recruiter dropdowns' location filter:
 * POST /job-openings/assignable-users narrows candidate ids to hiring managers
 * holding job:write and recruiters holding job:read at one office. Any caller who
 * can edit jobs may use it, unlike the role permission matrix.
 */
export type AssignableUsersResponse = {
  hiring_manager_ids: string[];
  recruiter_ids: string[];
};

export type GetAssignableUsersArgs = {
  locationId: string;
  hiringManagerIds?: string[];
  recruiterIds?: string[];
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getAssignableUsers: build.query<AssignableUsersResponse, GetAssignableUsersArgs>({
      query: ({ locationId, hiringManagerIds = [], recruiterIds = [] }) => ({
        url: '/job-openings/assignable-users',
        method: 'POST',
        body: {
          location_id: locationId,
          hiring_manager_ids: hiringManagerIds,
          recruiter_ids: recruiterIds,
        },
      }),
    }),
  }),
});

export const { useGetAssignableUsersQuery } = extendedApi;
