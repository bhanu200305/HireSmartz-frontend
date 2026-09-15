import { jobApi } from '../jobApi';

// The Super Admin's education-preference catalogue. What a new tenant's own
// configured education-preference list is seeded from.
export type PlatformEducationPreference = {
  education_preference_id: string;
  education_preference_name: string;
  education_preference_description: string | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformEducationPreferences: build.query<PlatformEducationPreference[], void>({
      query: () => '/platform/master-education-preferences',
      transformResponse: (response: { education_preferences: PlatformEducationPreference[] }) =>
        response.education_preferences,
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
  }),
});

export const {
  useListPlatformEducationPreferencesQuery,
  useCreatePlatformEducationPreferenceMutation,
  useUpdatePlatformEducationPreferenceMutation,
  useDeletePlatformEducationPreferenceMutation,
} = extendedApi;
