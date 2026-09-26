import { jobApi } from '../jobApi';
import type { CatalogPage, SearchArgs } from '../JobOpening/catalogs';

// The Super Admin's job-mode catalogue. What a job's `mode_id` references.
export type PlatformJobMode = {
  job_mode_id: string;
  job_mode_name: string;
  job_mode_description: string | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformJobModes: build.query<PlatformJobMode[], void>({
      query: () => '/platform/master-job-modes',
      transformResponse: (response: { job_modes: PlatformJobMode[] }) => response.job_modes,
      providesTags: ['PlatformJobModes'],
    }),
    searchPlatformJobModes: build.query<CatalogPage<PlatformJobMode>, SearchArgs>({
      query: ({ page, pageSize, search, sortBy, sortDir }) => ({
        url: '/platform/master-job-modes/search',
        method: 'GET',
        params: {
          page,
          page_size: pageSize,
          search: search || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
        },
      }),
      transformResponse: (response: {
        job_modes?: PlatformJobMode[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.job_modes ?? [],
        total: response.total ?? (response.job_modes ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['PlatformJobModes'],
    }),
    createPlatformJobMode: build.mutation<
      PlatformJobMode,
      { job_mode_name: string; job_mode_description?: string | null }
    >({
      query: (body) => ({ url: '/platform/master-job-modes', method: 'POST', body }),
      invalidatesTags: ['PlatformJobModes'],
    }),
    updatePlatformJobMode: build.mutation<
      PlatformJobMode,
      { jobModeId: string; job_mode_name: string; job_mode_description?: string | null }
    >({
      query: ({ jobModeId, ...body }) => ({
        url: `/platform/master-job-modes/${jobModeId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformJobModes'],
    }),
    deletePlatformJobMode: build.mutation<void, string>({
      query: (jobModeId) => ({
        url: `/platform/master-job-modes/${jobModeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformJobModes'],
    }),
  }),
});

export const {
  useListPlatformJobModesQuery,
  useSearchPlatformJobModesQuery,
  useCreatePlatformJobModeMutation,
  useUpdatePlatformJobModeMutation,
  useDeletePlatformJobModeMutation,
} = extendedApi;
