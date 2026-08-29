import { jobApi } from '../jobApi';

// GET/POST/PUT/DELETE /platform/master-closure-reasons — the Super Admin's
// job-closure reason catalogue. `requires_input` (not `description` — that's
// the tenant-facing read-only shape at /master/closure-reasons) gates
// whether closing a job with this reason demands free-text detail.
export type PlatformClosureReason = {
  reason_id: string;
  reason: string;
  requires_input: boolean;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformClosureReasons: build.query<PlatformClosureReason[], void>({
      query: () => '/platform/master-closure-reasons',
      transformResponse: (response: { reasons: PlatformClosureReason[] }) => response.reasons,
      providesTags: ['PlatformClosureReasons'],
    }),
    createPlatformClosureReason: build.mutation<
      PlatformClosureReason,
      { reason: string; requires_input: boolean }
    >({
      query: (body) => ({ url: '/platform/master-closure-reasons', method: 'POST', body }),
      invalidatesTags: ['PlatformClosureReasons'],
    }),
    updatePlatformClosureReason: build.mutation<
      PlatformClosureReason,
      { reasonId: string; reason: string; requires_input: boolean }
    >({
      query: ({ reasonId, ...body }) => ({
        url: `/platform/master-closure-reasons/${reasonId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformClosureReasons'],
    }),
    // Blocked server-side while a job's closure still references it.
    deletePlatformClosureReason: build.mutation<void, string>({
      query: (reasonId) => ({
        url: `/platform/master-closure-reasons/${reasonId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformClosureReasons'],
    }),
  }),
});

export const {
  useListPlatformClosureReasonsQuery,
  useCreatePlatformClosureReasonMutation,
  useUpdatePlatformClosureReasonMutation,
  useDeletePlatformClosureReasonMutation,
} = extendedApi;
