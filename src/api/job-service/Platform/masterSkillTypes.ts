import { jobApi } from '../jobApi';

// GET/POST/PUT/DELETE /platform/master-skill-types — the Super Admin's
// skill-type catalogue (e.g. "Technical", "Soft Skill").
export type PlatformSkillType = {
  skill_type_id: string;
  name: string;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformSkillTypes: build.query<PlatformSkillType[], void>({
      query: () => '/platform/master-skill-types',
      transformResponse: (response: { skill_types: PlatformSkillType[] }) => response.skill_types,
      providesTags: ['PlatformSkillTypes'],
    }),
    createPlatformSkillType: build.mutation<PlatformSkillType, { name: string }>({
      query: (body) => ({ url: '/platform/master-skill-types', method: 'POST', body }),
      invalidatesTags: ['PlatformSkillTypes'],
    }),
    updatePlatformSkillType: build.mutation<
      PlatformSkillType,
      { skillTypeId: string; name: string }
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
  useCreatePlatformSkillTypeMutation,
  useUpdatePlatformSkillTypeMutation,
  useDeletePlatformSkillTypeMutation,
} = extendedApi;
