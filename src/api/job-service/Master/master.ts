import { jobApi } from '../jobApi';

// Tenant-facing, read-only master/reference catalogs. Write surface lives
// under Platform/, Super Admin only.

export type InterviewRoundType = {
  round_id: string;
  round_name: string;
  round_description: string | null;
  max_occurrences: number | null;
  requires_duration: boolean;
  available_variants: string[] | null;
};

export type ClosureReason = {
  reason_id: string;
  reason: string;
  description: string | null;
};

export type MasterShiftType = {
  shift_id: string;
  shift_name: string;
  shift_description: string | null;
  duration_minutes: number | null;
};

export type MasterJobType = {
  job_type_id: string;
  job_type_name: string;
  job_type_description: string | null;
};

export type JobMode = {
  job_mode_id: string;
  job_mode_name: string;
  job_mode_description: string | null;
};

export type QuestionImportTemplateResponse = {
  download_url: string;
  expires_in: number;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getMasterInterviewRounds: build.query<{ round_types: InterviewRoundType[] }, void>({
      query: () => '/master/interview-rounds',
      providesTags: ['MasterInterviewRounds'],
    }),
    getMasterClosureReasons: build.query<{ reasons: ClosureReason[] }, void>({
      query: () => '/master/closure-reasons',
      providesTags: ['MasterClosureReasons'],
    }),
    getMasterShiftTypes: build.query<{ shift_types: MasterShiftType[] }, void>({
      query: () => '/master/shift-types',
      providesTags: ['MasterShiftTypes'],
    }),
    getMasterJobTypeSuggestions: build.query<{ job_types: MasterJobType[] }, void>({
      query: () => '/master/job-type-suggestions',
      providesTags: ['MasterJobTypeSuggestions'],
    }),
    getMasterJobModes: build.query<{ job_modes: JobMode[] }, void>({
      query: () => '/master/job-modes',
      providesTags: ['MasterJobModes'],
    }),
    // Returns a presigned download URL, not the file bytes.
    getQuestionImportTemplate: build.query<QuestionImportTemplateResponse, void>({
      query: () => '/master/question-import-template',
    }),
  }),
});

export const {
  useGetMasterInterviewRoundsQuery,
  useGetMasterClosureReasonsQuery,
  useGetMasterShiftTypesQuery,
  useGetMasterJobTypeSuggestionsQuery,
  useGetMasterJobModesQuery,
  useGetQuestionImportTemplateQuery,
  useLazyGetQuestionImportTemplateQuery,
} = extendedApi;
