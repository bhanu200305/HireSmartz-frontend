import { jobApi } from '../jobApi';
import type {
  GenerateJdResponse,
  JdBulkUploadResponse,
  JdStatusResponse,
  JdUploadBatchSummary,
  UploadJdResponse,
} from '../types';

export type JdUploadResponse = {
  success?: boolean;
  message?: string;
  batchId?: string;
  data?: {
    batchId?: string;
    jobOpeningId?: string;
    org_job_opening_id?: string;
    totalFiles?: number;
    job_ids?: string[];
  };
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    uploadSingleJd: build.mutation<JdUploadResponse, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/job-openings/upload-jd',
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: (response: UploadJdResponse): JdUploadResponse => ({
        success: true,
        data: {
          jobOpeningId: response.org_job_opening_id,
          org_job_opening_id: response.org_job_opening_id,
        },
      }),
      invalidatesTags: [{ type: 'JobOpenings', id: 'LIST' }, 'JobStats'],
    }),

    uploadBulkJd: build.mutation<JdUploadResponse, File[]>({
      query: (files) => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        return {
          url: '/job-openings/upload-jd/bulk',
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: (response: JdBulkUploadResponse): JdUploadResponse => ({
        success: true,
        batchId: response.batch_id,
        data: {
          batchId: response.batch_id,
          totalFiles: response.total_files,
          job_ids: response.job_ids,
        },
      }),
      invalidatesTags: [{ type: 'JobOpenings', id: 'LIST' }, 'JobStats'],
    }),

    getJdUploadBatchSummary: build.query<JdUploadBatchSummary, string>({
      query: (batchId) => ({
        url: `/job-openings/upload-jd/batch/${batchId}/summary`,
        method: 'GET',
      }),
      providesTags: (_r, _e, batchId) => [{ type: 'JdUploadBatch', id: batchId }],
    }),

    generateJdFromPrompt: build.mutation<GenerateJdResponse, { prompt_text: string }>({
      query: (body) => ({
        url: '/job-openings/generate-jd',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'JobOpenings', id: 'LIST' }, 'JobStats'],
    }),

    getJdStatus: build.query<JdStatusResponse, string>({
      query: (jobOpeningId) => ({
        url: `/job-openings/${jobOpeningId}/jd/status`,
        method: 'GET',
      }),
      providesTags: (_r, _e, jobOpeningId) => [{ type: 'JobDescription', id: jobOpeningId }],
    }),

    editJd: build.mutation<{ jd: string | null }, { jobOpeningId: string; jd: string }>({
      query: ({ jobOpeningId, jd }) => ({
        url: `/job-openings/${jobOpeningId}/jd`,
        method: 'PUT',
        body: { jd },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [
        { type: 'JobDescription', id: jobOpeningId },
        { type: 'JobDetails', id: jobOpeningId },
        { type: 'JobOpeningById', id: jobOpeningId },
      ],
    }),

    regenerateJd: build.mutation<
      { jd_status?: 'GENERATING' },
      { jobOpeningId: string; prompt_text: string }
    >({
      query: ({ jobOpeningId, prompt_text }) => ({
        url: `/job-openings/${jobOpeningId}/jd/regenerate`,
        method: 'POST',
        body: { prompt_text },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [{ type: 'JobDescription', id: jobOpeningId }],
    }),

    // Arg is either a bare job id (the auto-trigger right after saving Job
    // Details — no recruiter instructions yet) or `{jobOpeningId,
    // instruction, regenerate}` (the recruiter typed guidance, or hit
    // Regenerate, before clicking Generate/Refine). Manual/Upload-path jobs
    // only — see enhance_jd.py's EntryPath gate on the backend.
    //
    // The backend's `EnhanceJdRequest` (`instruction`/`regenerate`, both
    // with defaults) still requires *some* JSON body — `extra="forbid"`
    // rejects an unrecognised field, and FastAPI 422s a body-less POST
    // outright even though every field on the model is optional. So this
    // always sends a real object, never `undefined`.
    enhanceJd: build.mutation<
      Record<string, never>,
      string | { jobOpeningId: string; instruction?: string; regenerate?: boolean }
    >({
      query: (args) => {
        const jobOpeningId = typeof args === 'string' ? args : args.jobOpeningId;
        const instruction = typeof args === 'string' ? undefined : args.instruction?.trim();
        const regenerate = typeof args === 'string' ? false : Boolean(args.regenerate);
        return {
          url: `/job-openings/${jobOpeningId}/jd/enhance`,
          method: 'POST',
          body: { instruction: instruction || null, regenerate },
        };
      },
      invalidatesTags: (_r, _e, args) => [
        { type: 'JobDescription', id: typeof args === 'string' ? args : args.jobOpeningId },
      ],
    }),

    getJdEnhanceResult: build.query<
      {
        status: 'PROCESSING' | 'READY';
        sections: { section_name: string; original_text: string; enhanced_text: string }[];
        suggested_skills: unknown[];
      },
      string
    >({
      query: (jobOpeningId) => ({
        url: `/job-openings/${jobOpeningId}/jd/enhance/result`,
        method: 'GET',
      }),
    }),

    reviewJdEnhancement: build.mutation<
      { jd: string | null; skills_added: number },
      {
        jobOpeningId: string;
        action: 'accept_all' | 'reject_all' | 'accept_partial' | 'accept_edited';
        accepted_sections?: string[];
        edited_jd?: string | null;
      }
    >({
      query: ({ jobOpeningId, action, accepted_sections, edited_jd }) => ({
        url: `/job-openings/${jobOpeningId}/jd/enhance/review`,
        method: 'POST',
        body: {
          action,
          ...(accepted_sections ? { accepted_sections } : {}),
          ...(edited_jd !== undefined ? { edited_jd } : {}),
        },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [
        { type: 'JobDescription', id: jobOpeningId },
        { type: 'JobDetails', id: jobOpeningId },
        { type: 'JobOpeningById', id: jobOpeningId },
      ],
    }),
  }),
});

export const {
  useUploadSingleJdMutation,
  useUploadBulkJdMutation,
  useGetJdUploadBatchSummaryQuery,
  useLazyGetJdUploadBatchSummaryQuery,
  useGenerateJdFromPromptMutation,
  useGetJdStatusQuery,
  useLazyGetJdStatusQuery,
  useEditJdMutation,
  useRegenerateJdMutation,
  useEnhanceJdMutation,
  useGetJdEnhanceResultQuery,
  useReviewJdEnhancementMutation,
} = extendedApi;
