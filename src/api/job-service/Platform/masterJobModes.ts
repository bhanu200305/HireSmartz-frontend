import { jobApi } from '../jobApi';

// GET/POST/PUT/DELETE /platform/master-job-modes — the Super Admin's job-mode
// catalogue. What a job's `mode_id` on Job Details directly references.
export type PlatformJobMode = {
  job_mode_id: string;
  name: string;
  description: string | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformJobModes: build.query<PlatformJobMode[], void>({
      query: () => '/platform/master-job-modes',
      transformResponse: (response: { job_modes: PlatformJobMode[] }) => response.job_modes,
      providesTags: ['PlatformJobModes'],
    }),
    createPlatformJobMode: build.mutation<
      PlatformJobMode,
      { name: string; description?: string | null }
    >({
      query: (body) => ({ url: '/platform/master-job-modes', method: 'POST', body }),
      invalidatesTags: ['PlatformJobModes'],
    }),
    updatePlatformJobMode: build.mutation<
      PlatformJobMode,
      { jobModeId: string; name: string; description?: string | null }
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
  useCreatePlatformJobModeMutation,
  useUpdatePlatformJobModeMutation,
  useDeletePlatformJobModeMutation,
} = extendedApi;
