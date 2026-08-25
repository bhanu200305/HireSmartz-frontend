import { jobApi } from '../jobApi';

// Tenant-facing, read-only master/reference catalogs — JOB_READ only, no
// write surface (that lives under Platform/masterCatalogs.ts, Super Admin
// only). Mirrors app/modules/jobs/api/responses.py's *Response models.

export type InterviewRoundType = {
  round_id: string;
  name: string;
  description: string | null;
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
  name: string;
  description: string | null;
  duration_minutes: number | null;
};

export type MasterJobType = {
  job_type_id: string;
  name: string;
  description: string | null;
};

export type JobMode = {
  job_mode_id: string;
  name: string;
  description: string | null;
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
    // GET /master/question-import-template — a presigned S3 download URL,
    // not the file bytes. Caller fetches `download_url` directly.
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
