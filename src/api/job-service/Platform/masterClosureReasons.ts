import { jobApi } from '../jobApi';
import type { CatalogPage, SearchArgs } from '../JobOpening/catalogs';

// GET/POST/PUT/DELETE /platform/master-closure-reasons — the Super Admin's
// job-closure reason catalogue. `requires_input` gates whether closing a
// job with this reason demands free-text detail.
export type PlatformClosureReason = {
  reason_id: string;
  reason: string;
  requires_input: boolean;
  description: string | null;
  is_deleted?: boolean;
  is_active?: boolean;
};

type ClosureReasonWriteBody = {
  reason: string;
  requires_input: boolean;
  description?: string | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformClosureReasons: build.query<PlatformClosureReason[], void>({
      query: () => '/platform/master-closure-reasons',
      transformResponse: (response: { reasons: PlatformClosureReason[] }) => response.reasons,
      providesTags: ['PlatformClosureReasons'],
    }),
    searchPlatformClosureReasons: build.query<CatalogPage<PlatformClosureReason>, SearchArgs>({
      query: ({ page, pageSize, search, sortBy, sortDir, includeInactive }) => ({
        url: '/platform/master-closure-reasons/search',
        method: 'GET',
        params: {
          page,
          page_size: pageSize,
          search: search || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
          include_inactive: includeInactive || undefined,
        },
      }),
      transformResponse: (response: {
        reasons?: PlatformClosureReason[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.reasons ?? [],
        total: response.total ?? (response.reasons ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['PlatformClosureReasons'],
    }),
    createPlatformClosureReason: build.mutation<PlatformClosureReason, ClosureReasonWriteBody>({
      query: (body) => ({ url: '/platform/master-closure-reasons', method: 'POST', body }),
      invalidatesTags: ['PlatformClosureReasons'],
    }),
    updatePlatformClosureReason: build.mutation<
      PlatformClosureReason,
      ClosureReasonWriteBody & { reasonId: string }
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
    // Undoes deletePlatformClosureReason's soft-delete.
    reactivatePlatformClosureReason: build.mutation<void, string>({
      query: (reasonId) => ({
        url: `/platform/master-closure-reasons/${reasonId}/reactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['PlatformClosureReasons'],
    }),
    // Status-toggle Switch in the catalogue table - sets is_active without
    // touching is_deleted, unlike deletePlatformClosureReason above.
    activatePlatformClosureReason: build.mutation<void, string>({
      query: (reasonId) => ({
        url: `/platform/master-closure-reasons/${reasonId}/activate`,
        method: 'POST',
      }),
      invalidatesTags: ['PlatformClosureReasons'],
    }),
    deactivatePlatformClosureReason: build.mutation<void, string>({
      query: (reasonId) => ({
        url: `/platform/master-closure-reasons/${reasonId}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['PlatformClosureReasons'],
    }),
  }),
});

export const {
  useListPlatformClosureReasonsQuery,
  useSearchPlatformClosureReasonsQuery,
  useCreatePlatformClosureReasonMutation,
  useUpdatePlatformClosureReasonMutation,
  useDeletePlatformClosureReasonMutation,
  useReactivatePlatformClosureReasonMutation,
  useActivatePlatformClosureReasonMutation,
  useDeactivatePlatformClosureReasonMutation,
} = extendedApi;
