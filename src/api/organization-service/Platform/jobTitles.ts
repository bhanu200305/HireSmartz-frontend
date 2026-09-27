import { orgApi } from '../orgApi';

export type PlatformJobTitle = {
  job_title_id: string;
  code: string;
  name: string;
  description: string | null;
  // Only populated on the create response (the department the title was just
  // mapped to) — null on list/get/update, since a title can sit under
  // several departments (many-to-many). See CreateJobTitleUseCase.
  department_id?: string | null;
  is_active: boolean;
};

export type CreateJobTitleRequest = {
  // `code` is derived server-side from `name`, not client-supplied (see
  // JobTitle.create on the backend) — sending it 422s with "extra fields
  // not permitted".
  name: string;
  description?: string;
  department_id: string;
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
    deactivatePlatformJobTitle: build.mutation<void, string>({
      query: (jobTitleId) => ({
        url: `/v1/platform/job-titles/${jobTitleId}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['JobTitles'],
    }),
    // No confirmation needed by convention — restoring access/visibility is
    // the low-risk direction.
    activatePlatformJobTitle: build.mutation<void, string>({
      query: (jobTitleId) => ({
        url: `/v1/platform/job-titles/${jobTitleId}/activate`,
        method: 'POST',
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
  useDeactivatePlatformJobTitleMutation,
  useActivatePlatformJobTitleMutation,
} = extendedApi;
