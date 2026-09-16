import { jobApi } from '../jobApi';
import type {
  ActiveJobCountResponse,
  JobCountsByDepartmentResponse,
  JobCountsByLocationResponse,
  JobListArgs,
  JobListResponse,
  SuggestedSkillsArgs,
  SuggestedSkillsResponse,
} from './types';

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    // -- suggested skills --------------------------------------------------
    getSuggestedSkills: build.query<SuggestedSkillsResponse, SuggestedSkillsArgs>({
      query: ({ jobId, ...params }) => ({
        url: `/job-openings/${jobId}/skills/suggested`,
        params,
      }),
      providesTags: (_result, _error, { jobId }) => [{ type: 'JobSuggestedSkills', id: jobId }],
    }),

    // -- listing / stats / counts --------------------------------------------
    // Untransformed `{items, total}` shape, distinct from GetJobOpening.ts's
    // `getJobOpenings` (`{data, total, totalElements}`) — consumers
    // (CompanyMetrics/JobOpeningsListModal.tsx, OpenJobsSection.tsx) need
    // this one's raw shape.
    getJobOpeningsListLegacy: build.query<JobListResponse, JobListArgs | void>({
      query: (params) => ({ url: '/job-openings', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({
                type: 'Jobs' as const,
                id: item.org_job_opening_id,
              })),
              'Jobs',
            ]
          : ['Jobs'],
    }),

    // Not rendered anywhere yet, but correctly implemented and tagged for
    // when that widget is built — not a duplicate like the block above.
    getActiveJobCountByLocation: build.query<ActiveJobCountResponse, string>({
      query: (locationId) => ({
        url: '/job-openings/count-active-jobs-by-location',
        params: { location_id: locationId },
      }),
      providesTags: ['JobStats'],
    }),
    getJobCountsByDepartment: build.query<JobCountsByDepartmentResponse, void>({
      query: () => '/job-openings/counts-by-department',
      providesTags: ['JobStats'],
    }),
    getJobCountsByLocation: build.query<JobCountsByLocationResponse, void>({
      query: () => '/job-openings/counts-by-location',
      providesTags: ['JobStats'],
    }),
  }),
});

export const {
  useGetSuggestedSkillsQuery,
  useLazyGetSuggestedSkillsQuery,
  useGetJobOpeningsListLegacyQuery,
  useLazyGetJobOpeningsListLegacyQuery,
  useGetActiveJobCountByLocationQuery,
  useGetJobCountsByDepartmentQuery,
  useGetJobCountsByLocationQuery,
} = extendedApi;
