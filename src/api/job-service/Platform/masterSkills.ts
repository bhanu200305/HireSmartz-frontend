import { jobApi } from '../jobApi';
import type { CatalogPage, SearchArgs } from '../JobOpening/catalogs';

// The Super Admin's platform-wide skill catalogue. Rows with
// organization_id set are a company's own additions, surfaced here
// read-only for visibility — is_organization_specific distinguishes them.
export type PlatformSkill = {
  skill_id: string;
  skill: string;
  skill_description: string | null;
  skill_category_id: string | null;
  organization_id: string | null;
  is_organization_specific: boolean;
  is_deleted?: boolean;
  is_active?: boolean;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformSkills: build.query<PlatformSkill[], void>({
      query: () => '/platform/master-skills',
      transformResponse: (response: { skills: PlatformSkill[] }) => response.skills,
      providesTags: ['PlatformSkills'],
    }),
    searchPlatformSkills: build.query<CatalogPage<PlatformSkill>, SearchArgs>({
      query: ({ page, pageSize, search, sortBy, sortDir, includeInactive }) => ({
        url: '/platform/master-skills/search',
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
        skills?: PlatformSkill[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.skills ?? [],
        total: response.total ?? (response.skills ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['PlatformSkills'],
    }),
    createPlatformSkill: build.mutation<
      PlatformSkill,
      { skill: string; skill_description?: string | null; skill_category_id?: string | null }
    >({
      query: (body) => ({ url: '/platform/master-skills', method: 'POST', body }),
      invalidatesTags: ['PlatformSkills'],
    }),
    updatePlatformSkill: build.mutation<
      PlatformSkill,
      {
        skillId: string;
        skill: string;
        skill_description?: string | null;
        skill_category_id?: string | null;
      }
    >({
      query: ({ skillId, ...body }) => ({
        url: `/platform/master-skills/${skillId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformSkills'],
    }),
    // Blocked server-side while a job or the title-suggestion cache still
    // references it.
    deletePlatformSkill: build.mutation<void, string>({
      query: (skillId) => ({
        url: `/platform/master-skills/${skillId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformSkills'],
    }),
    // Undoes deletePlatformSkill's soft-delete.
    reactivatePlatformSkill: build.mutation<void, string>({
      query: (skillId) => ({
        url: `/platform/master-skills/${skillId}/reactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['PlatformSkills'],
    }),
    // Status-toggle Switch in the catalogue table - sets is_active without
    // touching is_deleted, unlike deletePlatformSkill above.
    activatePlatformSkill: build.mutation<void, string>({
      query: (skillId) => ({
        url: `/platform/master-skills/${skillId}/activate`,
        method: 'POST',
      }),
      invalidatesTags: ['PlatformSkills'],
    }),
    deactivatePlatformSkill: build.mutation<void, string>({
      query: (skillId) => ({
        url: `/platform/master-skills/${skillId}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['PlatformSkills'],
    }),
  }),
});

export const {
  useListPlatformSkillsQuery,
  useSearchPlatformSkillsQuery,
  useCreatePlatformSkillMutation,
  useUpdatePlatformSkillMutation,
  useDeletePlatformSkillMutation,
  useReactivatePlatformSkillMutation,
  useActivatePlatformSkillMutation,
  useDeactivatePlatformSkillMutation,
} = extendedApi;
