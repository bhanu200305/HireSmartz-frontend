import { jobApi } from '../jobApi';
import { mapJobSummaryToListRow } from '../mappers';
import type { JobListResponse, JobListStatus, JobStatsResponse } from '../types';
import type { JobFilterRequest, JobFilterResponse } from '../../../types';

type ListJobOpeningsArgs = Partial<JobFilterRequest> & {
  isDraft?: boolean;
  isClosed?: boolean;
  isAll?: boolean;
  status?: boolean;
  text?: string;
  searchQuery?: string;
  startDateTime?: string;
  endDateTime?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
  globalSearchRequestDto?: { text: string; field: string };
  assignedToMe?: boolean;
  locationId?: string;
};

// Maps UI sortKeys to job-service's sort_by values. Unmapped keys (e.g.
// "jobTitleName", not sortable server-side yet) are dropped, not forwarded.
const SORT_BY_MAP: Record<string, string> = {
  locationName: 'location_name',
  candidateCount: 'candidate_count',
  jobOpenDate: 'job_open_date',
  createdAt: 'created_at',
  vacancies: 'vacancies',
  jobProfileCode: 'job_profile_code',
};

// Defaults to 'published' when no filter flag is set at all - a new caller
// wanting every status must pass isAll: true explicitly, or it silently
// only sees published jobs.
const resolveListStatus = (args: ListJobOpeningsArgs): JobListStatus | undefined => {
  if (args.isAll) return undefined;
  if (args.isDraft) return 'draft';
  if (args.isClosed) return 'closed';
  if (args.status === true) return 'published';
  if (args.status === false) return 'closed';
  return 'published';
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getJobOpenings: build.query<JobFilterResponse, ListJobOpeningsArgs>({
      query: (args) => {
        const page = (args.page ?? 0) + 1; // job-service is 1-based
        const pageSize = args.size ?? 10;
        const text =
          args.text?.trim() ||
          args.searchQuery?.trim() ||
          args.globalSearchRequestDto?.text?.trim() ||
          undefined;
        const status = resolveListStatus(args);
        const sortBy = args.sortBy ? SORT_BY_MAP[args.sortBy] : undefined;

        return {
          url: '/job-openings',
          method: 'GET',
          params: {
            page,
            page_size: pageSize,
            ...(status ? { status } : {}),
            ...(text ? { text } : {}),
            ...(args.startDateTime ? { open_date_from: args.startDateTime } : {}),
            ...(args.endDateTime ? { open_date_to: args.endDateTime } : {}),
            ...(sortBy ? { sort_by: sortBy } : {}),
            ...(args.sortDir ? { sort_dir: String(args.sortDir).toLowerCase() } : {}),
            ...(args.assignedToMe ? { assigned_to_me: true } : {}),
            ...(args.locationId ? { location_id: args.locationId } : {}),
          },
        };
      },
      transformResponse: (response: JobListResponse): JobFilterResponse => ({
        data: (response.items ?? []).map(mapJobSummaryToListRow),
        total: response.total ?? 0,
        totalElements: response.total ?? 0,
        success: true,
      }),
      providesTags: [{ type: 'JobOpenings', id: 'LIST' }],
    }),

    getJobStats: build.query<
      JobStatsResponse,
      { assignedToMe?: boolean; locationId?: string } | void
    >({
      query: (args) => ({
        url: '/job-openings/stats',
        method: 'GET',
        params: {
          ...(args?.assignedToMe ? { assigned_to_me: true } : {}),
          ...(args?.locationId ? { location_id: args.locationId } : {}),
        },
      }),
      providesTags: ['JobStats'],
    }),
  }),
});

export const { useGetJobOpeningsQuery, useGetJobStatsQuery } = extendedApi;
