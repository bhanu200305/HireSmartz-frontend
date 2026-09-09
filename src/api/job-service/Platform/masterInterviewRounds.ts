import { jobApi } from '../jobApi';

// The Super Admin's interview-round-type catalogue.
export type PlatformInterviewRoundType = {
  round_type_id: string;
  round_name: string;
  special_kind: 'intake_call' | 'resume' | 'verification' | null;
  is_mandatory: boolean;
  max_occurrences: number | null;
  requires_duration: boolean;
  available_variants: string[] | null;
};

export type SaveInterviewRoundTypeRequest = {
  round_name: string;
  special_kind?: 'intake_call' | 'resume' | 'verification' | null;
  is_mandatory?: boolean;
  max_occurrences?: number | null;
  requires_duration?: boolean;
  available_variants?: string[] | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformInterviewRoundTypes: build.query<PlatformInterviewRoundType[], void>({
      query: () => '/platform/master-interview-rounds',
      transformResponse: (response: { round_types: PlatformInterviewRoundType[] }) =>
        response.round_types,
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
      SaveInterviewRoundTypeRequest & { roundTypeId: string }
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
  useCreatePlatformInterviewRoundTypeMutation,
  useUpdatePlatformInterviewRoundTypeMutation,
  useDeletePlatformInterviewRoundTypeMutation,
} = extendedApi;
