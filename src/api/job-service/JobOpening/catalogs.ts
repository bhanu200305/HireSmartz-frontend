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
  OrganizationShift,
  SkillCatalogEntry,
} from '../types';

const toJobTypeOption = (item: MasterJobType): OrganizationJobType => ({
  id: item.job_type_id,
  job_type_name: item.job_type_name,
  job_type_description: item.job_type_description,
});

export type ListJobTypesArgs = {
  /** Super Admin tokens have no tenant_id, so they must read the platform
   * catalogue (/platform/master-job-types) instead of /job-types. */
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
          job_type_name: item.job_type_name,
          job_type_description: item.job_type_description,
        })),
      providesTags: ['JobTypes'],
    }),

    // Same isMaster split as listJobTypes above.
    createJobType: build.mutation<
      OrganizationJobType,
      { job_type_name: string; job_type_description?: string | null; isMaster?: boolean }
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
      {
        jobTypeId: string;
        job_type_name: string;
        job_type_description?: string | null;
        isMaster?: boolean;
      }
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
        shift_name: string;
        shift_description?: string | null;
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
        shift_name: string;
        shift_description?: string | null;
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

    // Write side of this organization's job-mode list (listJobModes above is read-only).
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
        skill: string;
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
  useCreateJobModeMutation,
  useUpdateJobModeMutation,
  useDeleteJobModeMutation,
  useListLanguagesQuery,
  useListClosureReasonsQuery,
  useCreateClosureReasonMutation,
  useUpdateClosureReasonMutation,
  useDeleteClosureReasonMutation,
  useListInterviewRoundTypesQuery,
  useSearchSkillsQuery,
  useLazySearchSkillsQuery,
  useListActiveSkillsQuery,
  useCreateOrganizationSkillMutation,
} = catalogsApi;
