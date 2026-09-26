import { jobApi } from '../jobApi';
import type { CatalogPage, SearchArgs } from '../JobOpening/catalogs';

// The Super Admin's skill-type catalogue (e.g. "Technical", "Soft Skill").
export type PlatformSkillType = {
  skill_type_id: string;
  skill_type: string;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformSkillTypes: build.query<PlatformSkillType[], void>({
      query: () => '/platform/master-skill-types',
      transformResponse: (response: { skill_types: PlatformSkillType[] }) => response.skill_types,
      providesTags: ['PlatformSkillTypes'],
    }),
    searchPlatformSkillTypes: build.query<CatalogPage<PlatformSkillType>, SearchArgs>({
      query: ({ page, pageSize, search, sortBy, sortDir }) => ({
        url: '/platform/master-skill-types/search',
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
        skill_types?: PlatformSkillType[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.skill_types ?? [],
        total: response.total ?? (response.skill_types ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['PlatformSkillTypes'],
    }),
    createPlatformSkillType: build.mutation<PlatformSkillType, { skill_type: string }>({
      query: (body) => ({ url: '/platform/master-skill-types', method: 'POST', body }),
      invalidatesTags: ['PlatformSkillTypes'],
    }),
    updatePlatformSkillType: build.mutation<
      PlatformSkillType,
      { skillTypeId: string; skill_type: string }
    >({
      query: ({ skillTypeId, ...body }) => ({
        url: `/platform/master-skill-types/${skillTypeId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformSkillTypes'],
    }),
    // Blocked server-side while a job's skill selection or the
    // title-suggestion cache still references it.
    deletePlatformSkillType: build.mutation<void, string>({
      query: (skillTypeId) => ({
        url: `/platform/master-skill-types/${skillTypeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformSkillTypes'],
    }),
  }),
});

export const {
  useListPlatformSkillTypesQuery,
  useSearchPlatformSkillTypesQuery,
  useCreatePlatformSkillTypeMutation,
  useUpdatePlatformSkillTypeMutation,
  useDeletePlatformSkillTypeMutation,
} = extendedApi;
