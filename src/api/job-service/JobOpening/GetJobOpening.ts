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
};

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
            ...(args.sortBy ? { sort_by: args.sortBy } : {}),
            ...(args.sortDir ? { sort_dir: String(args.sortDir).toLowerCase() } : {}),
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

    getJobStats: build.query<JobStatsResponse, void>({
      query: () => ({
        url: '/job-openings/stats',
        method: 'GET',
      }),
      providesTags: ['JobStats'],
    }),
  }),
});

export const { useGetJobOpeningsQuery, useGetJobStatsQuery } = extendedApi;
