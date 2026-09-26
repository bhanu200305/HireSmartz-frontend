import { jobApi } from '../jobApi';
import type { CatalogPage, SearchArgs } from '../JobOpening/catalogs';

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
    searchPlatformLanguages: build.query<CatalogPage<PlatformLanguage>, SearchArgs>({
      query: ({ page, pageSize, search, sortBy, sortDir }) => ({
        url: '/platform/master-languages/search',
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
        languages?: PlatformLanguage[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.languages ?? [],
        total: response.total ?? (response.languages ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
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
  useSearchPlatformLanguagesQuery,
  useCreatePlatformLanguageMutation,
  useUpdatePlatformLanguageMutation,
  useDeletePlatformLanguageMutation,
} = extendedApi;
