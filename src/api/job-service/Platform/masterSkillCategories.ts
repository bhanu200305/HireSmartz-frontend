import { jobApi } from '../jobApi';

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
  useCreatePlatformSkillCategoryMutation,
  useUpdatePlatformSkillCategoryMutation,
  useDeletePlatformSkillCategoryMutation,
} = extendedApi;
