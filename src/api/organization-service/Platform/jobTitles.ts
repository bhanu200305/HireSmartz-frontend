import { orgApi } from '../orgApi';

export type PlatformJobTitle = {
  job_title_id: string;
  code: string;
  name: string;
  description: string | null;
};

export type CreateJobTitleRequest = {
  code: string;
  name: string;
  description?: string;
};

export type UpdateJobTitleRequest = {
  jobTitleId: string;
  name?: string;
  description?: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformJobTitles: build.query<PlatformJobTitle[], void>({
      query: () => '/v1/platform/job-titles',
      transformResponse: (response: { job_titles: PlatformJobTitle[] }) => response.job_titles,
      providesTags: ['JobTitles'],
    }),
    createPlatformJobTitle: build.mutation<PlatformJobTitle, CreateJobTitleRequest>({
      query: (body) => ({
        url: '/v1/platform/job-titles',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobTitles'],
    }),
    updatePlatformJobTitle: build.mutation<PlatformJobTitle, UpdateJobTitleRequest>({
      query: ({ jobTitleId, ...body }) => ({
        url: `/v1/platform/job-titles/${jobTitleId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['JobTitles'],
    }),
    // Blocked server-side while a tenant's own title was seeded from it.
    deletePlatformJobTitle: build.mutation<void, string>({
      query: (jobTitleId) => ({
        url: `/v1/platform/job-titles/${jobTitleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JobTitles'],
    }),
  }),
});

export const {
  useListPlatformJobTitlesQuery,
  useCreatePlatformJobTitleMutation,
  useUpdatePlatformJobTitleMutation,
  useDeletePlatformJobTitleMutation,
} = extendedApi;
