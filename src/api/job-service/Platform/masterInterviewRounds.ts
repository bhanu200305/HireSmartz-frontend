import { jobApi } from '../jobApi';
import type { CatalogPage, SearchArgs } from '../JobOpening/catalogs';

// The Super Admin's interview-round-type catalogue.
export type PlatformInterviewRoundType = {
  round_type_id: string;
  round_name: string;
  special_kind:
    | 'intake_call'
    | 'resume'
    | 'verification'
    | 'audio_screening'
    | 'live_video'
    | 'in_person'
    | null;
  is_mandatory: boolean;
  max_occurrences: number | null;
  requires_duration: boolean;
  available_variants: string[] | null;
  round_description: string | null;
  variant_labels: Record<string, string> | null;
};

export type SaveInterviewRoundTypeRequest = {
  round_name: string;
  special_kind?: 'intake_call' | 'resume' | 'verification' | null;
  is_mandatory?: boolean;
  max_occurrences?: number | null;
  requires_duration?: boolean;
  available_variants?: string[] | null;
  round_description?: string | null;
};

// Only name, description and variant labels are editable.
export type UpdateInterviewRoundTypeRequest = {
  round_name: string;
  round_description?: string | null;
  variant_labels?: Record<string, string> | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformInterviewRoundTypes: build.query<PlatformInterviewRoundType[], void>({
      query: () => '/platform/master-interview-rounds',
      transformResponse: (response: { round_types: PlatformInterviewRoundType[] }) =>
        response.round_types,
      providesTags: ['PlatformInterviewRoundTypes'],
    }),
    searchPlatformInterviewRoundTypes: build.query<
      CatalogPage<PlatformInterviewRoundType>,
      SearchArgs
    >({
      query: ({ page, pageSize, search, sortBy, sortDir }) => ({
        url: '/platform/master-interview-rounds/search',
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
        round_types?: PlatformInterviewRoundType[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.round_types ?? [],
        total: response.total ?? (response.round_types ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['PlatformInterviewRoundTypes'],
    }),
    createPlatformInterviewRoundType: build.mutation<
      PlatformInterviewRoundType,
      SaveInterviewRoundTypeRequest
    >({
      query: (body) => ({ url: '/platform/master-interview-rounds', method: 'POST', body }),
      invalidatesTags: ['PlatformInterviewRoundTypes'],
    }),
    updatePlatformInterviewRoundType: build.mutation<
      PlatformInterviewRoundType,
      UpdateInterviewRoundTypeRequest & { roundTypeId: string }
    >({
      query: ({ roundTypeId, ...body }) => ({
        url: `/platform/master-interview-rounds/${roundTypeId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformInterviewRoundTypes'],
    }),
    // Blocked server-side while a job's sequence still references it.
    deletePlatformInterviewRoundType: build.mutation<void, string>({
      query: (roundTypeId) => ({
        url: `/platform/master-interview-rounds/${roundTypeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformInterviewRoundTypes'],
    }),
  }),
});

export const {
  useListPlatformInterviewRoundTypesQuery,
  useSearchPlatformInterviewRoundTypesQuery,
  useCreatePlatformInterviewRoundTypeMutation,
  useUpdatePlatformInterviewRoundTypeMutation,
  useDeletePlatformInterviewRoundTypeMutation,
} = extendedApi;
