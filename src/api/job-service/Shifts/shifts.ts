import { jobApi } from '../jobApi';

// This organization's own configured shift instances — what a job's Shift
// dropdown offers, and what `shift_id` on Job Details references. Distinct
// from Master/master.ts's fixed shift-type suggestion catalog.
export type OrganizationShift = {
  id: string;
  shift_name: string;
  start_time: string; // HH:MM:SS
  end_time: string;
  duration_minutes: number | null;
};

export type SaveOrganizationShiftArgs = {
  shift_name: string;
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
  useCreateOrganizationShiftMutation,
  useUpdateOrganizationShiftMutation,
  useDeleteOrganizationShiftMutation,
} = extendedApi;
