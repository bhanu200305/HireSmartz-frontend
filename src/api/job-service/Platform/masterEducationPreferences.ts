import { jobApi } from '../jobApi';
import type { CatalogPage, SearchArgs } from '../JobOpening/catalogs';

// The Super Admin's education-preference catalogue. What a new tenant's own
// configured education-preference list is seeded from.
export type PlatformEducationPreference = {
  education_preference_id: string;
  education_preference_name: string;
  education_preference_description: string | null;
  is_deleted?: boolean;
  is_active?: boolean;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformEducationPreferences: build.query<PlatformEducationPreference[], void>({
      query: () => '/platform/master-education-preferences',
      transformResponse: (response: { education_preferences: PlatformEducationPreference[] }) =>
        response.education_preferences,
      providesTags: ['PlatformEducationPreferences'],
    }),
    searchPlatformEducationPreferences: build.query<
      CatalogPage<PlatformEducationPreference>,
      SearchArgs
    >({
      query: ({ page, pageSize, search, sortBy, sortDir, includeInactive }) => ({
        url: '/platform/master-education-preferences/search',
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
        education_preferences?: PlatformEducationPreference[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.education_preferences ?? [],
        total: response.total ?? (response.education_preferences ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['PlatformEducationPreferences'],
    }),
    createPlatformEducationPreference: build.mutation<
      PlatformEducationPreference,
      { education_preference_name: string; education_preference_description?: string | null }
    >({
      query: (body) => ({ url: '/platform/master-education-preferences', method: 'POST', body }),
      invalidatesTags: ['PlatformEducationPreferences'],
    }),
    updatePlatformEducationPreference: build.mutation<
      PlatformEducationPreference,
      {
        educationPreferenceId: string;
        education_preference_name: string;
        education_preference_description?: string | null;
      }
    >({
      query: ({ educationPreferenceId, ...body }) => ({
        url: `/platform/master-education-preferences/${educationPreferenceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformEducationPreferences'],
    }),
    deletePlatformEducationPreference: build.mutation<void, string>({
      query: (educationPreferenceId) => ({
        url: `/platform/master-education-preferences/${educationPreferenceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformEducationPreferences'],
    }),
    // Undoes deletePlatformEducationPreference's soft-delete.
    reactivatePlatformEducationPreference: build.mutation<void, string>({
      query: (educationPreferenceId) => ({
        url: `/platform/master-education-preferences/${educationPreferenceId}/reactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['PlatformEducationPreferences'],
    }),
    // Status-toggle Switch in the catalogue table - sets is_active without
    // touching is_deleted, unlike deletePlatformEducationPreference above.
    activatePlatformEducationPreference: build.mutation<void, string>({
      query: (educationPreferenceId) => ({
        url: `/platform/master-education-preferences/${educationPreferenceId}/activate`,
        method: 'POST',
      }),
      invalidatesTags: ['PlatformEducationPreferences'],
    }),
    deactivatePlatformEducationPreference: build.mutation<void, string>({
      query: (educationPreferenceId) => ({
        url: `/platform/master-education-preferences/${educationPreferenceId}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['PlatformEducationPreferences'],
    }),
  }),
});

export const {
  useListPlatformEducationPreferencesQuery,
  useSearchPlatformEducationPreferencesQuery,
  useCreatePlatformEducationPreferenceMutation,
  useUpdatePlatformEducationPreferenceMutation,
  useDeletePlatformEducationPreferenceMutation,
  useReactivatePlatformEducationPreferenceMutation,
  useActivatePlatformEducationPreferenceMutation,
  useDeactivatePlatformEducationPreferenceMutation,
} = extendedApi;
