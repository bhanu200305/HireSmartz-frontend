import { jobApi } from '../jobApi';

// GET/POST/PUT/DELETE /platform/master-skills — the Super Admin's
// platform-wide skill catalogue. Rows with organization_id set are a
// company's own additions (POST /skills, see catalogs.ts's
// createOrganizationSkill) surfaced here read-only for visibility, not
// something Super Admin edits — is_organization_specific distinguishes them.
export type PlatformSkill = {
  skill_id: string;
  name: string;
  description: string | null;
  skill_category_id: string | null;
  organization_id: string | null;
  is_organization_specific: boolean;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformSkills: build.query<PlatformSkill[], void>({
      query: () => '/platform/master-skills',
      transformResponse: (response: { skills: PlatformSkill[] }) => response.skills,
      providesTags: ['PlatformSkills'],
    }),
    createPlatformSkill: build.mutation<
      PlatformSkill,
      { name: string; description?: string | null; skill_category_id?: string | null }
    >({
      query: (body) => ({ url: '/platform/master-skills', method: 'POST', body }),
      invalidatesTags: ['PlatformSkills'],
    }),
    updatePlatformSkill: build.mutation<
      PlatformSkill,
      {
        skillId: string;
        name: string;
        description?: string | null;
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
  }),
});

export const {
  useListPlatformSkillsQuery,
  useCreatePlatformSkillMutation,
  useUpdatePlatformSkillMutation,
  useDeletePlatformSkillMutation,
} = extendedApi;
