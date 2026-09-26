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
      query: ({ page, pageSize, search, sortBy, sortDir }) => ({
        url: '/shifts/search',
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
  }),
});

export const {
  useGetOrganizationShiftsQuery,
  useSearchOrganizationShiftsQuery,
  useCreateOrganizationShiftMutation,
  useUpdateOrganizationShiftMutation,
  useDeleteOrganizationShiftMutation,
} = extendedApi;
