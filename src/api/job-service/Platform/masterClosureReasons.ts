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
      query: ({ page, pageSize, search, sortBy, sortDir }) => ({
        url: '/platform/master-closure-reasons/search',
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
  }),
});

export const {
  useListPlatformClosureReasonsQuery,
  useSearchPlatformClosureReasonsQuery,
  useCreatePlatformClosureReasonMutation,
  useUpdatePlatformClosureReasonMutation,
  useDeletePlatformClosureReasonMutation,
} = extendedApi;
