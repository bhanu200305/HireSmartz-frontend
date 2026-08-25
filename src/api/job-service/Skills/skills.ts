import { jobApi } from '../jobApi';

export type SkillSearchResult = {
  skill_id: string;
  skill_label: string;
  skill_category_id: string | null;
  category_name: string | null;
};

export type SkillSearchResponse = {
  skills: SkillSearchResult[];
};

export type SkillSearchArgs = {
  q?: string;
  category_id?: string;
};

export type CreateOrganizationSkillArgs = {
  name: string;
  description?: string;
  skill_category_id?: string;
};

export type OrganizationSkill = {
  id: string;
  name: string;
  description: string | null;
  skill_category_id: string | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /skills/search — autocomplete across platform + org-only skills.
    searchSkills: build.query<SkillSearchResponse, SkillSearchArgs | void>({
      query: (params) => ({ url: '/skills/search', params: params ?? undefined }),
      providesTags: ['Skills'],
    }),
    // POST /skills — add an org-only skill to this tenant's own catalog.
    createOrganizationSkill: build.mutation<OrganizationSkill, CreateOrganizationSkillArgs>({
      query: (body) => ({ url: '/skills', method: 'POST', body }),
      invalidatesTags: ['Skills'],
    }),
  }),
});

export const {
  useSearchSkillsQuery,
  useLazySearchSkillsQuery,
  useCreateOrganizationSkillMutation,
} = extendedApi;
