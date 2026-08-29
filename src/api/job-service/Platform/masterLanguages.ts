import { jobApi } from '../jobApi';

// GET/POST/PUT/DELETE /platform/master-languages — the Super Admin's
// language catalogue. What a job's `language_ids` on Job Details pick from
// (via the tenant-facing read-only /master/languages).
export type PlatformLanguage = {
  language_id: string;
  name: string;
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
      { name: string; language_code: string }
    >({
      query: (body) => ({ url: '/platform/master-languages', method: 'POST', body }),
      invalidatesTags: ['PlatformLanguages'],
    }),
    updatePlatformLanguage: build.mutation<
      PlatformLanguage,
      { languageId: string; name: string; language_code: string }
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
