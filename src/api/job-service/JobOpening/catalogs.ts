import { jobApi } from '../jobApi';
import type {
  ClosureReason,
  InterviewRoundType,
  JobMode,
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

    createJobType: build.mutation<
      OrganizationJobType,
      { name: string; description?: string | null }
    >({
      query: (body) => ({ url: '/platform/master-job-types', method: 'POST', body }),
      transformResponse: (response: MasterJobType) => toJobTypeOption(response),
      invalidatesTags: ['JobTypes'],
    }),

    updateJobType: build.mutation<
      OrganizationJobType,
      { jobTypeId: string; name: string; description?: string | null }
    >({
      query: ({ jobTypeId, name, description }) => ({
        url: `/platform/master-job-types/${jobTypeId}`,
        method: 'PUT',
        body: { name, description },
      }),
      transformResponse: (response: MasterJobType) => toJobTypeOption(response),
      invalidatesTags: ['JobTypes'],
    }),

    deleteJobType: build.mutation<void, string>({
      query: (jobTypeId) => ({
        url: `/platform/master-job-types/${jobTypeId}`,
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

    listJobModes: build.query<JobMode[], void>({
      query: () => ({ url: '/master/job-modes', method: 'GET' }),
      transformResponse: (response: { job_modes: JobMode[] }) => response.job_modes ?? [],
      providesTags: ['JobModes'],
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
  useListJobModesQuery,
  useListClosureReasonsQuery,
  useListInterviewRoundTypesQuery,
  useSearchSkillsQuery,
  useLazySearchSkillsQuery,
  useCreateOrganizationSkillMutation,
} = catalogsApi;
