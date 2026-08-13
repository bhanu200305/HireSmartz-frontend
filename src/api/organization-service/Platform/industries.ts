import { orgApi } from '../orgApi';

export type Industry = {
  industry_id: string;
  code: string;
  name: string;
  description: string | null;
};

export type CreateIndustryRequest = {
  code: string;
  name: string;
  description?: string;
};

export type UpdateIndustryRequest = {
  industryId: string;
  name?: string;
  description?: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listIndustries: build.query<Industry[], void>({
      query: () => '/v1/platform/industries',
      transformResponse: (response: { industries: Industry[] }) => response.industries,
      providesTags: ['Industries'],
    }),
    createIndustry: build.mutation<Industry, CreateIndustryRequest>({
      query: (body) => ({
        url: '/v1/platform/industries',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Industries'],
    }),
    updateIndustry: build.mutation<Industry, UpdateIndustryRequest>({
      query: ({ industryId, ...body }) => ({
        url: `/v1/platform/industries/${industryId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Industries'],
    }),
    // Blocked server-side (409/422) while an active tenant references it —
    // surfaced through the usual error envelope, not a special response shape.
    deleteIndustry: build.mutation<void, string>({
      query: (industryId) => ({
        url: `/v1/platform/industries/${industryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Industries'],
    }),
  }),
});

export const {
  useListIndustriesQuery,
  useCreateIndustryMutation,
  useUpdateIndustryMutation,
  useDeleteIndustryMutation,
} = extendedApi;
