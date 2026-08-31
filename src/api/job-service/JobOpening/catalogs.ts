import { jobApi } from '../jobApi';
import type {
  ClosureReason,
  InterviewRoundType,
  JobMode,
  Language,
  MasterJobType,
  OrganizationJobType,
  OrganizationShift,
  SkillCatalogEntry,
} from '../types';

const toJobTypeOption = (item: MasterJobType): OrganizationJobType => ({
  id: item.job_type_id,
  name: item.name,
  description: item.description,
});

export type ListJobTypesArgs = {
  /**
   * Super Admin tokens have no `tenant_id`, so GET /job-types 403s with
   * "this endpoint requires a tenant user". Their catalogue is
   * GET /platform/master-job-types (MASTER_JOB_TYPE_READ). Company users
   * must use /job-types — SaveJobDetails validates job_type_id against
   * organization_job_type, not the platform suggestion list.
   */
  isMaster?: boolean;
};

type JobTypeListRow = OrganizationJobType & Partial<MasterJobType>;

const catalogsApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listJobTypes: build.query<OrganizationJobType[], ListJobTypesArgs | void>({
      query: (arg) => ({
        url:
          arg && typeof arg === 'object' && arg.isMaster
            ? '/platform/master-job-types'
            : '/job-types',
        method: 'GET',
      }),
      transformResponse: (response: { job_types?: JobTypeListRow[] }) =>
        (response.job_types ?? []).map((item) => ({
          id: item.id || item.job_type_id || '',
          name: item.name,
          description: item.description,
        })),
      providesTags: ['JobTypes'],
    }),

    // Same isMaster split as listJobTypes above: a Super Admin token has no
    // tenant_id (GET/POST /job-types 403s "requires a tenant user"), so
    // Super Admin's Company Settings catalogue tab must write through
    // /platform/master-job-types while a tenant's own Job Settings tab (and
    // this screen's "add job type" affordance for a tenant caller) writes
    // through /job-types.
    createJobType: build.mutation<
      OrganizationJobType,
      { name: string; description?: string | null; isMaster?: boolean }
    >({
      query: ({ isMaster, ...body }) => ({
        url: isMaster ? '/platform/master-job-types' : '/job-types',
        method: 'POST',
        body,
      }),
      transformResponse: (response: MasterJobType) => toJobTypeOption(response),
      invalidatesTags: ['JobTypes'],
    }),

    updateJobType: build.mutation<
      OrganizationJobType,
      { jobTypeId: string; name: string; description?: string | null; isMaster?: boolean }
    >({
      query: ({ jobTypeId, isMaster, ...body }) => ({
        url: isMaster ? `/platform/master-job-types/${jobTypeId}` : `/job-types/${jobTypeId}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (response: MasterJobType) => toJobTypeOption(response),
      invalidatesTags: ['JobTypes'],
    }),

    deleteJobType: build.mutation<void, { jobTypeId: string; isMaster?: boolean }>({
      query: ({ jobTypeId, isMaster }) => ({
        url: isMaster ? `/platform/master-job-types/${jobTypeId}` : `/job-types/${jobTypeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JobTypes'],
    }),

    listShifts: build.query<OrganizationShift[], void>({
      query: () => ({ url: '/shifts', method: 'GET' }),
      transformResponse: (response: { shifts: OrganizationShift[] }) => response.shifts ?? [],
      providesTags: ['Shifts'],
    }),

    createShift: build.mutation<
      OrganizationShift,
      {
        name: string;
        start_time: string;
        end_time: string;
        duration_minutes?: number | null;
      }
    >({
      query: (body) => ({ url: '/shifts', method: 'POST', body }),
      invalidatesTags: ['Shifts'],
    }),

    updateShift: build.mutation<
      OrganizationShift,
      {
        shiftId: string;
        name: string;
        start_time: string;
        end_time: string;
        duration_minutes?: number | null;
      }
    >({
      query: ({ shiftId, ...body }) => ({ url: `/shifts/${shiftId}`, method: 'PUT', body }),
      invalidatesTags: ['Shifts'],
    }),

    deleteShift: build.mutation<void, string>({
      query: (shiftId) => ({ url: `/shifts/${shiftId}`, method: 'DELETE' }),
      invalidatesTags: ['Shifts'],
    }),

    listJobModes: build.query<JobMode[], void>({
      query: () => ({ url: '/master/job-modes', method: 'GET' }),
      transformResponse: (response: { job_modes: JobMode[] }) => response.job_modes ?? [],
      providesTags: ['JobModes'],
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

    // GET /skills — every active skill visible to this caller (platform
    // catalogue plus this org's own additions), no query, no cap. Backs a
    // skill dropdown's initial options before the recruiter has typed
    // anything into searchSkills above.
    listActiveSkills: build.query<SkillCatalogEntry[], void>({
      query: () => ({ url: '/skills', method: 'GET' }),
      transformResponse: (response: { skills: SkillCatalogEntry[] }) => response.skills ?? [],
      providesTags: ['Skills'],
    }),

    createOrganizationSkill: build.mutation<
      {
        skill_id: string;
        name: string;
        description: string | null;
        skill_category_id: string | null;
      },
      { name: string; description?: string | null; skill_category_id?: string | null }
    >({
      query: (body) => ({
        url: '/skills',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Skills'],
    }),
  }),
});

export const {
  useListJobTypesQuery,
  useCreateJobTypeMutation,
  useUpdateJobTypeMutation,
  useDeleteJobTypeMutation,
  useListShiftsQuery,
  useCreateShiftMutation,
  useUpdateShiftMutation,
  useDeleteShiftMutation,
  useListJobModesQuery,
  useListLanguagesQuery,
  useListClosureReasonsQuery,
  useListInterviewRoundTypesQuery,
  useSearchSkillsQuery,
  useLazySearchSkillsQuery,
  useListActiveSkillsQuery,
  useCreateOrganizationSkillMutation,
} = catalogsApi;
