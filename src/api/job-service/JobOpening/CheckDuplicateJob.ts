import { jobApi } from '../jobApi';

/**
 * POST /job-openings/duplicate-check: open jobs that already have this job title and
 * department at one or more of these offices. Saving such a job is refused.
 */
export type DuplicateJobMatch = {
  job_id: string;
  job_profile_code: string;
  location_ids: string[];
};

export type CheckDuplicateJobArgs = {
  jobTitleId: string;
  departmentId: string;
  locationIds: string[];
  excludeJobId?: string;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    checkDuplicateJob: build.query<{ matches: DuplicateJobMatch[] }, CheckDuplicateJobArgs>({
      query: ({ jobTitleId, departmentId, locationIds, excludeJobId }) => ({
        url: '/job-openings/duplicate-check',
        method: 'POST',
        body: {
          job_title_id: jobTitleId,
          department_id: departmentId,
          location_ids: locationIds,
          ...(excludeJobId ? { exclude_job_id: excludeJobId } : {}),
        },
      }),
    }),
  }),
});

export const { useCheckDuplicateJobQuery } = extendedApi;
