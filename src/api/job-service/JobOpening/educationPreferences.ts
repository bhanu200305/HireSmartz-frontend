import { jobApi } from '../jobApi';
import type { CatalogPage, SearchArgs } from './catalogs';

// This organization's own configured education-preference catalogue —
// what a job's `education_preference_id` on Job Details references.
export type OrganizationEducationPreference = {
  id: string;
  education_preference_name: string;
  education_preference_description: string | null;
};

const educationPreferencesApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listEducationPreferences: build.query<OrganizationEducationPreference[], void>({
      query: () => ({ url: '/education-preferences', method: 'GET' }),
      transformResponse: (response: { education_preferences: OrganizationEducationPreference[] }) =>
        response.education_preferences ?? [],
      providesTags: ['EducationPreferences'],
    }),

    searchEducationPreferences: build.query<
      CatalogPage<OrganizationEducationPreference>,
      SearchArgs
    >({
      query: ({ page, pageSize, search, sortBy, sortDir }) => ({
        url: '/education-preferences/search',
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
        education_preferences?: OrganizationEducationPreference[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.education_preferences ?? [],
        total: response.total ?? (response.education_preferences ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['EducationPreferences'],
    }),

    createEducationPreference: build.mutation<
      OrganizationEducationPreference,
      { education_preference_name: string; education_preference_description?: string | null }
    >({
      query: (body) => ({ url: '/education-preferences', method: 'POST', body }),
      invalidatesTags: ['EducationPreferences'],
    }),

    updateEducationPreference: build.mutation<
      OrganizationEducationPreference,
      {
        preferenceId: string;
        education_preference_name: string;
        education_preference_description?: string | null;
      }
    >({
      query: ({ preferenceId, education_preference_name, education_preference_description }) => ({
        url: `/education-preferences/${preferenceId}`,
        method: 'PUT',
        body: { education_preference_name, education_preference_description },
      }),
      invalidatesTags: ['EducationPreferences'],
    }),

    deleteEducationPreference: build.mutation<void, string>({
      query: (preferenceId) => ({
        url: `/education-preferences/${preferenceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['EducationPreferences'],
    }),
  }),
});

export const {
  useListEducationPreferencesQuery,
  useSearchEducationPreferencesQuery,
  useCreateEducationPreferenceMutation,
  useUpdateEducationPreferenceMutation,
  useDeleteEducationPreferenceMutation,
} = educationPreferencesApi;
