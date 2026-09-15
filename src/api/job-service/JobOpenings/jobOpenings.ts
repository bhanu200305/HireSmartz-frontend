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

// Duplicate endpoints of names already defined elsewhere (AddJobOpening.ts,
// JobOpeningNotes.ts, etc.) were removed from here — dead, never-invalidated
// cache tags with zero real callers.
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
    // Renamed from `getJobOpenings` (was colliding with GetJobOpening.ts's
    // endpoint of the same name, which returns a different, transformed
    // response shape — `{data, total, totalElements}` there vs this one's
    // untransformed `{items, total}`). Consumers of *this* implementation
    // (CompanyMetrics/JobOpeningsListModal.tsx, OpenJobsSection.tsx) still
    // need the `{items}` shape, so rather than deleting it and risking a
    // shape mismatch, it's kept under a name that can't collide — same
    // implementation, same behavior, just no longer fighting over the same
    // registration key.
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
