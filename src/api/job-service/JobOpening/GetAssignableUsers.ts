import { jobApi } from '../jobApi';

/**
 * Backs the Hiring Manager and Recruiter dropdowns' location filter:
 * POST /job-openings/assignable-users narrows candidate ids to hiring managers
 * holding job:write and recruiters holding job:read at one or more of the
 * offices, and says which office each holds the role at. Any caller who can
 * edit jobs may use it, unlike the role permission matrix.
 */
export type AssignableOffice = {
  location_id: string;
  hiring_manager_ids: string[];
  recruiter_ids: string[];
};

export type AssignableUsersResponse = {
  hiring_manager_ids: string[];
  recruiter_ids: string[];
  offices: AssignableOffice[];
};

export type GetAssignableUsersArgs = {
  locationIds: string[];
  hiringManagerIds?: string[];
  recruiterIds?: string[];
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getAssignableUsers: build.query<AssignableUsersResponse, GetAssignableUsersArgs>({
      query: ({ locationIds, hiringManagerIds = [], recruiterIds = [] }) => ({
        url: '/job-openings/assignable-users',
        method: 'POST',
        body: {
          location_ids: locationIds,
          hiring_manager_ids: hiringManagerIds,
          recruiter_ids: recruiterIds,
        },
      }),
    }),
  }),
});

export const { useGetAssignableUsersQuery } = extendedApi;
