import { jobApi } from '../jobApi';
import type {
  ClosureReason,
  InterviewRoundType,
  JobMode,
  Language,
  MasterJobType,
  OrganizationClosureReason,
  OrganizationJobMode,
  OrganizationJobType,
  SkillCatalogEntry,
} from '../types';

// Tenant (`/job-types`) responds with `id`, platform (`/platform/master-job-types`)
// with `job_type_id` - same split `listJobTypes` above tolerates.
const toJobTypeOption = (
  item: Partial<MasterJobType> & OrganizationJobType
): OrganizationJobType => ({
  id: item.id || item.job_type_id || '',
  job_type_name: item.job_type_name,
  job_type_description: item.job_type_description,
});

/** Shared shape for every paginated catalogue list response. */
export type CatalogPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Shared args for a catalogue's `/search` sibling that takes no `isMaster`
 * split - one org-scoped table, one route. */
export type SearchArgs = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export type ListJobTypesArgs = {
  /** Super Admin tokens have no tenant_id, so they must read the platform
   * catalogue (/platform/master-job-types) instead of /job-types. Required,
   * not optional - an omitted flag silently reads the wrong tenant's data
   * instead of erroring, so every caller must decide explicitly. */
  isMaster: boolean;
};

/** GET /job-types(/search) never accepts pagination params on the plain
 * variant - dropdown consumers need the complete unbounded list. Only
 * `searchJobTypes` below (a separate endpoint) paginates. */
export type SearchJobTypesArgs = {
  isMaster: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

type JobTypeListRow = OrganizationJobType & Partial<MasterJobType>;

const catalogsApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listJobTypes: build.query<OrganizationJobType[], ListJobTypesArgs>({
      query: ({ isMaster }) => ({
        url: isMaster ? '/platform/master-job-types' : '/job-types',
        method: 'GET',
      }),
      transformResponse: (response: { job_types?: JobTypeListRow[] }) =>
        (response.job_types ?? []).map((item) => ({
          id: item.id || item.job_type_id || '',
          job_type_name: item.job_type_name,
          job_type_description: item.job_type_description,
        })),
      providesTags: ['JobTypes'],
    }),

    searchJobTypes: build.query<CatalogPage<OrganizationJobType>, SearchJobTypesArgs>({
      query: ({ isMaster, page, pageSize, search, sortBy, sortDir }) => ({
        url: isMaster ? '/platform/master-job-types/search' : '/job-types/search',
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
        job_types?: JobTypeListRow[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: (response.job_types ?? []).map((item) => ({
          id: item.id || item.job_type_id || '',
          job_type_name: item.job_type_name,
          job_type_description: item.job_type_description,
        })),
        total: response.total ?? (response.job_types ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['JobTypes'],
    }),

    // Same isMaster split as listJobTypes above - required for the same reason.
    createJobType: build.mutation<
      OrganizationJobType,
      { job_type_name: string; job_type_description?: string | null; isMaster: boolean }
    >({
      query: ({ isMaster, ...body }) => ({
        url: isMaster ? '/platform/master-job-types' : '/job-types',
        method: 'POST',
        body,
      }),
      transformResponse: (response: Partial<MasterJobType> & OrganizationJobType) =>
        toJobTypeOption(response),
      invalidatesTags: ['JobTypes'],
    }),

    updateJobType: build.mutation<
      OrganizationJobType,
      {
        jobTypeId: string;
        job_type_name: string;
        job_type_description?: string | null;
        isMaster: boolean;
      }
    >({
      query: ({ jobTypeId, isMaster, ...body }) => ({
        url: isMaster ? `/platform/master-job-types/${jobTypeId}` : `/job-types/${jobTypeId}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (response: Partial<MasterJobType> & OrganizationJobType) =>
        toJobTypeOption(response),
      invalidatesTags: ['JobTypes'],
    }),

    deleteJobType: build.mutation<void, { jobTypeId: string; isMaster: boolean }>({
      query: ({ jobTypeId, isMaster }) => ({
        url: isMaster ? `/platform/master-job-types/${jobTypeId}` : `/job-types/${jobTypeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JobTypes'],
    }),

    // Shift CRUD lives in ../Shifts/shifts.ts, not here.

    // The platform-wide job-mode suggestion catalogue (Super Admin managed) —
    // distinct from this organization's own configured list below.
    listJobModes: build.query<JobMode[], void>({
      query: () => ({ url: '/master/job-modes', method: 'GET' }),
      transformResponse: (response: { job_modes: JobMode[] }) => response.job_modes ?? [],
      providesTags: ['JobModes'],
    }),

    // This organization's own configured job-mode list.
    listOrganizationJobModes: build.query<OrganizationJobMode[], void>({
      query: () => ({ url: '/job-modes', method: 'GET' }),
      transformResponse: (response: { job_modes: OrganizationJobMode[] }) =>
        response.job_modes ?? [],
      providesTags: ['JobModes'],
    }),

    searchOrganizationJobModes: build.query<CatalogPage<OrganizationJobMode>, SearchArgs>({
      query: ({ page, pageSize, search, sortBy, sortDir }) => ({
        url: '/job-modes/search',
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
        job_modes?: OrganizationJobMode[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.job_modes ?? [],
        total: response.total ?? (response.job_modes ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['JobModes'],
    }),

    createJobMode: build.mutation<
      OrganizationJobMode,
      { job_mode_name: string; job_mode_description?: string | null }
    >({
      query: (body) => ({ url: '/job-modes', method: 'POST', body }),
      invalidatesTags: ['JobModes'],
    }),

    updateJobMode: build.mutation<
      OrganizationJobMode,
      { jobModeId: string; job_mode_name: string; job_mode_description?: string | null }
    >({
      query: ({ jobModeId, ...body }) => ({
        url: `/job-modes/${jobModeId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['JobModes'],
    }),

    deleteJobMode: build.mutation<void, string>({
      query: (jobModeId) => ({ url: `/job-modes/${jobModeId}`, method: 'DELETE' }),
      invalidatesTags: ['JobModes'],
    }),

    listLanguages: build.query<Language[], void>({
      query: () => ({ url: '/master/languages', method: 'GET' }),
      transformResponse: (response: { languages: Language[] }) => response.languages ?? [],
      providesTags: ['Languages'],
    }),

    listClosureReasons: build.query<ClosureReason[], void>({
      query: () => ({ url: '/master/closure-reasons', method: 'GET' }),
      transformResponse: (response: { reasons: ClosureReason[] }) => response.reasons ?? [],
      providesTags: ['ClosureReasons'],
    }),

    // This organization's own configured closure-reason list - the
    // catalogue-management read side, paired with the create/update/delete
    // mutations below (all on /job-closure-reasons).
    listOrganizationJobClosureReasons: build.query<OrganizationClosureReason[], void>({
      query: () => ({ url: '/job-closure-reasons', method: 'GET' }),
      transformResponse: (response: { closure_reasons: OrganizationClosureReason[] }) =>
        response.closure_reasons ?? [],
      providesTags: ['ClosureReasons'],
    }),

    searchOrganizationJobClosureReasons: build.query<
      CatalogPage<OrganizationClosureReason>,
      SearchArgs
    >({
      query: ({ page, pageSize, search, sortBy, sortDir }) => ({
        url: '/job-closure-reasons/search',
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
        closure_reasons?: OrganizationClosureReason[];
        total?: number;
        page?: number;
        page_size?: number;
      }) => ({
        items: response.closure_reasons ?? [],
        total: response.total ?? (response.closure_reasons ?? []).length,
        page: response.page ?? 1,
        pageSize: response.page_size ?? 20,
      }),
      providesTags: ['ClosureReasons'],
    }),

    // Write side of this organization's closure-reason list.
    createClosureReason: build.mutation<
      OrganizationClosureReason,
      { reason: string; description?: string | null }
    >({
      query: (body) => ({ url: '/job-closure-reasons', method: 'POST', body }),
      invalidatesTags: ['ClosureReasons'],
    }),

    updateClosureReason: build.mutation<
      OrganizationClosureReason,
      { closureReasonId: string; reason: string; description?: string | null }
    >({
      query: ({ closureReasonId, ...body }) => ({
        url: `/job-closure-reasons/${closureReasonId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ClosureReasons'],
    }),

    deleteClosureReason: build.mutation<void, string>({
      query: (closureReasonId) => ({
        url: `/job-closure-reasons/${closureReasonId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ClosureReasons'],
    }),

    listInterviewRoundTypes: build.query<InterviewRoundType[], void>({
      query: () => ({ url: '/master/interview-rounds', method: 'GET' }),
      transformResponse: (response: { round_types: InterviewRoundType[] }) =>
        response.round_types ?? [],
      providesTags: ['InterviewRoundTypes'],
    }),

    searchSkills: build.query<SkillCatalogEntry[], { q: string; categoryId?: string }>({
      query: ({ q, categoryId }) => ({
        url: '/skills/search',
        method: 'GET',
        params: {
          q,
          ...(categoryId ? { category_id: categoryId } : {}),
        },
      }),
      transformResponse: (response: { skills: SkillCatalogEntry[] }) => response.skills ?? [],
      providesTags: ['Skills'],
    }),

    // All active skills visible to this caller, no query/cap. Backs a
    // skill dropdown's initial options before the user searches.
    listActiveSkills: build.query<SkillCatalogEntry[], void>({
      query: () => ({ url: '/skills', method: 'GET' }),
      transformResponse: (response: { skills: SkillCatalogEntry[] }) => response.skills ?? [],
      providesTags: ['Skills'],
    }),

    createOrganizationSkill: build.mutation<
      {
        skill_id: string;
        skill_label: string;
        skill_description: string | null;
        skill_category_id: string | null;
      },
      { skill: string; skill_description?: string | null; skill_category_id?: string | null }
    >({
      query: (body) => ({
        url: '/skills',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Skills'],
    }),

    // 404s for a platform-global skill or another organization's - backend enforces ownership.
    updateOrganizationSkill: build.mutation<
      {
        skill_id: string;
        skill_label: string;
        skill_description: string | null;
        skill_category_id: string | null;
      },
      {
        skillId: string;
        skill: string;
        skill_description?: string | null;
        skill_category_id?: string | null;
      }
    >({
      query: ({ skillId, ...body }) => ({
        url: `/skills/${skillId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Skills'],
    }),

    // Same ownership scoping as the rename above; blocked while any job still selects it.
    deleteOrganizationSkill: build.mutation<void, { skillId: string }>({
      query: ({ skillId }) => ({
        url: `/skills/${skillId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Skills'],
    }),
  }),
});

export const {
  useListJobTypesQuery,
  useSearchJobTypesQuery,
  useCreateJobTypeMutation,
  useUpdateJobTypeMutation,
  useDeleteJobTypeMutation,
  useListJobModesQuery,
  useListOrganizationJobModesQuery,
  useSearchOrganizationJobModesQuery,
  useCreateJobModeMutation,
  useUpdateJobModeMutation,
  useDeleteJobModeMutation,
  useListLanguagesQuery,
  useListClosureReasonsQuery,
  useSearchOrganizationJobClosureReasonsQuery,
  useCreateClosureReasonMutation,
  useUpdateClosureReasonMutation,
  useDeleteClosureReasonMutation,
  useListInterviewRoundTypesQuery,
  useSearchSkillsQuery,
  useLazySearchSkillsQuery,
  useListActiveSkillsQuery,
  useCreateOrganizationSkillMutation,
  useUpdateOrganizationSkillMutation,
  useDeleteOrganizationSkillMutation,
} = catalogsApi;
