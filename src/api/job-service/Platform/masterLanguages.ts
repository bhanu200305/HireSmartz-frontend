import { jobApi } from '../jobApi';

// The Super Admin's language catalogue. What a job's `language_ids` pick
// from (via the tenant-facing read-only /master/languages).
export type PlatformLanguage = {
  language_id: string;
  language_name: string;
  language_code: string;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformLanguages: build.query<PlatformLanguage[], void>({
      query: () => '/platform/master-languages',
      transformResponse: (response: { languages: PlatformLanguage[] }) => response.languages,
      providesTags: ['PlatformLanguages'],
    }),
    createPlatformLanguage: build.mutation<
      PlatformLanguage,
      { language_name: string; language_code: string }
    >({
      query: (body) => ({ url: '/platform/master-languages', method: 'POST', body }),
      invalidatesTags: ['PlatformLanguages'],
    }),
    updatePlatformLanguage: build.mutation<
      PlatformLanguage,
      { languageId: string; language_name: string; language_code: string }
    >({
      query: ({ languageId, ...body }) => ({
        url: `/platform/master-languages/${languageId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformLanguages'],
    }),
    deletePlatformLanguage: build.mutation<void, string>({
      query: (languageId) => ({
        url: `/platform/master-languages/${languageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformLanguages'],
    }),
  }),
});

export const {
  useListPlatformLanguagesQuery,
  useCreatePlatformLanguageMutation,
  useUpdatePlatformLanguageMutation,
  useDeletePlatformLanguageMutation,
} = extendedApi;
