import { jobApi } from '../jobApi';

// GET/POST/PUT/DELETE /education-preferences — this organization's own
// configured education-preference catalogue (job-service migration 0014,
// `organization_education_preference`). What a job's
// `education_preference_id` on Job Details actually references — replaces
// the old fictional hardcoded list in useJobOpeningDropdown.
export type OrganizationEducationPreference = {
  id: string;
  name: string;
};

const educationPreferencesApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listEducationPreferences: build.query<OrganizationEducationPreference[], void>({
      query: () => ({ url: '/education-preferences', method: 'GET' }),
      transformResponse: (response: { education_preferences: OrganizationEducationPreference[] }) =>
        response.education_preferences ?? [],
      providesTags: ['EducationPreferences'],
    }),

    createEducationPreference: build.mutation<OrganizationEducationPreference, { name: string }>({
      query: (body) => ({ url: '/education-preferences', method: 'POST', body }),
      invalidatesTags: ['EducationPreferences'],
    }),

    updateEducationPreference: build.mutation<
      OrganizationEducationPreference,
      { preferenceId: string; name: string }
    >({
      query: ({ preferenceId, name }) => ({
        url: `/education-preferences/${preferenceId}`,
        method: 'PUT',
        body: { name },
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
  useCreateEducationPreferenceMutation,
  useUpdateEducationPreferenceMutation,
  useDeleteEducationPreferenceMutation,
} = educationPreferencesApi;
