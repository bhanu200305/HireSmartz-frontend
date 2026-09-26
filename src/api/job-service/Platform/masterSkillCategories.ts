import { jobApi } from '../jobApi';
import type { CatalogPage, SearchArgs } from '../JobOpening/catalogs';

// The Super Admin's skill-category catalogue. What a skill's
// `skill_category_id` references.
export type PlatformSkillCategory = {
  category_id: string;
  skill_category: string;
  category_description: string | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformSkillCategories: build.query<PlatformSkillCategory[], void>({
      query: () => '/platform/master-skill-categories',
      transformResponse: (response: { categories: PlatformSkillCategory[] }) => response.categories,
      providesTags: ['PlatformSkillCategories'],
    }),
    searchPlatformSkillCategories: build.query<CatalogPage<PlatformSkillCategory>, SearchArgs>({
      query: ({ page, pageSize, search, sortBy, sortDir }) => ({
        url: '/platform/master-skill-categories/search',
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
        categories?: PlatformSkillCategory[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.categories ?? [],
        total: response.total ?? (response.categories ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['PlatformSkillCategories'],
    }),
    createPlatformSkillCategory: build.mutation<
      PlatformSkillCategory,
      { skill_category: string; category_description?: string | null }
    >({
      query: (body) => ({ url: '/platform/master-skill-categories', method: 'POST', body }),
      invalidatesTags: ['PlatformSkillCategories'],
    }),
    updatePlatformSkillCategory: build.mutation<
      PlatformSkillCategory,
      { categoryId: string; skill_category: string; category_description?: string | null }
    >({
      query: ({ categoryId, ...body }) => ({
        url: `/platform/master-skill-categories/${categoryId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformSkillCategories'],
    }),
    // Blocked server-side while a skill still references it.
    deletePlatformSkillCategory: build.mutation<void, string>({
      query: (categoryId) => ({
        url: `/platform/master-skill-categories/${categoryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformSkillCategories'],
    }),
  }),
});

export const {
  useListPlatformSkillCategoriesQuery,
  useSearchPlatformSkillCategoriesQuery,
  useCreatePlatformSkillCategoryMutation,
  useUpdatePlatformSkillCategoryMutation,
  useDeletePlatformSkillCategoryMutation,
} = extendedApi;
