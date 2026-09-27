import { orgApi } from '../orgApi';

export type Industry = {
  industry_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type ListIndustriesArgs = {
  // Omit (or true) to get everything, including deactivated rows — that's
  // this endpoint's own default, and what the management table (which shows
  // both, with a toggle to switch between them) relies on. Pass `false`
  // wherever an industry is being picked for something NEW — the "Add
  // Company" form, e.g. — since Industry has no separate picker endpoint the
  // way Department/Job Title/Office each do; this same list is it.
  includeInactive?: boolean;
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
    listIndustries: build.query<Industry[], ListIndustriesArgs | void>({
      query: (args) =>
        args?.includeInactive === false
          ? '/v1/platform/industries?include_inactive=false'
          : '/v1/platform/industries',
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
    deactivateIndustry: build.mutation<void, string>({
      query: (industryId) => ({
        url: `/v1/platform/industries/${industryId}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['Industries'],
    }),
    // No confirmation needed by convention — see IndustriesTab.tsx's own
    // reactivate handler comment: restoring is the low-risk direction.
    activateIndustry: build.mutation<void, string>({
      query: (industryId) => ({
        url: `/v1/platform/industries/${industryId}/activate`,
        method: 'POST',
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
  useDeactivateIndustryMutation,
  useActivateIndustryMutation,
} = extendedApi;
