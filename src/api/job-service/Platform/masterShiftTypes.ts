import { jobApi } from '../jobApi';

// GET/POST/PUT/DELETE /platform/master-shift-types — the Super Admin's
// shift-type suggestion catalogue (what /master/shift-types offers a
// tenant when they add their own configured shift under /shifts).
export type PlatformShiftType = {
  shift_type_id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformShiftTypes: build.query<PlatformShiftType[], void>({
      query: () => '/platform/master-shift-types',
      transformResponse: (response: { shift_types: PlatformShiftType[] }) => response.shift_types,
      providesTags: ['PlatformShiftTypes'],
    }),
    createPlatformShiftType: build.mutation<
      PlatformShiftType,
      { name: string; description?: string | null; duration_minutes?: number | null }
    >({
      query: (body) => ({ url: '/platform/master-shift-types', method: 'POST', body }),
      invalidatesTags: ['PlatformShiftTypes'],
    }),
    updatePlatformShiftType: build.mutation<
      PlatformShiftType,
      {
        shiftTypeId: string;
        name: string;
        description?: string | null;
        duration_minutes?: number | null;
      }
    >({
      query: ({ shiftTypeId, ...body }) => ({
        url: `/platform/master-shift-types/${shiftTypeId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformShiftTypes'],
    }),
    deletePlatformShiftType: build.mutation<void, string>({
      query: (shiftTypeId) => ({
        url: `/platform/master-shift-types/${shiftTypeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformShiftTypes'],
    }),
  }),
});

export const {
  useListPlatformShiftTypesQuery,
  useCreatePlatformShiftTypeMutation,
  useUpdatePlatformShiftTypeMutation,
  useDeletePlatformShiftTypeMutation,
} = extendedApi;
