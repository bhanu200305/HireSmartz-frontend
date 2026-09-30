import { jobApi } from '../jobApi';
import type { CatalogPage, SearchArgs } from '../JobOpening/catalogs';

// This organization's own configured shift instances — what a job's Shift
// dropdown offers, and what `shift_id` on Job Details references. Distinct
// from Master/master.ts's fixed shift-type suggestion catalog.
export type OrganizationShift = {
  id: string;
  shift_name: string;
  shift_description: string | null;
  start_time: string; // HH:MM:SS
  end_time: string;
  duration_minutes: number | null;
  created_by?: string | null;
  is_deleted?: boolean;
  is_active?: boolean;
};

export type SaveOrganizationShiftArgs = {
  shift_name: string;
  shift_description?: string | null;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getOrganizationShifts: build.query<{ shifts: OrganizationShift[] }, void>({
      query: () => '/shifts',
      providesTags: ['OrgShifts'],
    }),
    searchOrganizationShifts: build.query<CatalogPage<OrganizationShift>, SearchArgs>({
      query: ({ page, pageSize, search, sortBy, sortDir, includeInactive }) => ({
        url: '/shifts/search',
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
        shifts?: OrganizationShift[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.shifts ?? [],
        total: response.total ?? (response.shifts ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['OrgShifts'],
    }),
    // Targeted single-row lookup by id, even if deactivated - resolves a
    // job's currently-assigned shift without a bounded batch fetch.
    getOrganizationShiftById: build.query<OrganizationShift, string>({
      query: (shiftId) => ({ url: `/shifts/${shiftId}`, method: 'GET' }),
      providesTags: ['OrgShifts'],
    }),
    createOrganizationShift: build.mutation<OrganizationShift, SaveOrganizationShiftArgs>({
      query: (body) => ({ url: '/shifts', method: 'POST', body }),
      invalidatesTags: ['OrgShifts'],
    }),
    updateOrganizationShift: build.mutation<
      OrganizationShift,
      SaveOrganizationShiftArgs & { shiftId: string }
    >({
      query: ({ shiftId, ...body }) => ({ url: `/shifts/${shiftId}`, method: 'PUT', body }),
      invalidatesTags: ['OrgShifts'],
    }),
    deleteOrganizationShift: build.mutation<void, string>({
      query: (shiftId) => ({ url: `/shifts/${shiftId}`, method: 'DELETE' }),
      invalidatesTags: ['OrgShifts'],
    }),
    reactivateOrganizationShift: build.mutation<void, string>({
      query: (shiftId) => ({ url: `/shifts/${shiftId}/reactivate`, method: 'POST' }),
      invalidatesTags: ['OrgShifts'],
    }),
    // Status-toggle Switch in the catalogue table - sets is_active without
    // touching is_deleted, unlike deleteOrganizationShift above.
    activateOrganizationShift: build.mutation<void, string>({
      query: (shiftId) => ({ url: `/shifts/${shiftId}/activate`, method: 'POST' }),
      invalidatesTags: ['OrgShifts'],
    }),
    deactivateOrganizationShift: build.mutation<void, string>({
      query: (shiftId) => ({ url: `/shifts/${shiftId}/deactivate`, method: 'POST' }),
      invalidatesTags: ['OrgShifts'],
    }),
  }),
});

export const {
  useGetOrganizationShiftsQuery,
  useSearchOrganizationShiftsQuery,
  useGetOrganizationShiftByIdQuery,
  useCreateOrganizationShiftMutation,
  useUpdateOrganizationShiftMutation,
  useDeleteOrganizationShiftMutation,
  useReactivateOrganizationShiftMutation,
  useActivateOrganizationShiftMutation,
  useDeactivateOrganizationShiftMutation,
} = extendedApi;
