import { jobApi } from '../jobApi';
import type {
  AudioQuestionResponse,
  FailedQuestionRowResponse,
  JobQuestionsResponse,
  QuestionRequest,
  QuestionResponse,
  RoundQuestionsResponse,
  SkippedDuplicateRowResponse,
} from '../types';

export const jobQuestionsApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getJobQuestions: build.query<JobQuestionsResponse, string>({
      query: (jobOpeningId) => ({
        url: `/job-openings/${jobOpeningId}/questions`,
        method: 'GET',
      }),
      providesTags: (_r, _e, jobOpeningId) => [{ type: 'JobQuestions', id: jobOpeningId }],
    }),

    getAudioQuestions: build.query<{ questions: AudioQuestionResponse[] }, string>({
      query: (jobOpeningId) => ({
        url: `/job-openings/${jobOpeningId}/intake-call-questions`,
        method: 'GET',
      }),
    }),

    saveJobQuestions: build.mutation<
      JobQuestionsResponse,
      { jobOpeningId: string; questions: QuestionRequest[] }
    >({
      query: ({ jobOpeningId, questions }) => ({
        url: `/job-openings/${jobOpeningId}/questions`,
        method: 'PUT',
        body: { questions },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [
        { type: 'JobQuestions', id: jobOpeningId },
        { type: 'WizardState', id: jobOpeningId },
      ],
    }),

    generateJobQuestions: build.mutation<
      { generation_status?: 'GENERATING' },
      {
        jobOpeningId: string;
        question_count: number;
        interview_round_id?: string | null;
        // Hiring Panel section pick, ignored otherwise.
        category_codes?: string[] | null;
      }
    >({
      query: ({ jobOpeningId, question_count, interview_round_id, category_codes }) => ({
        url: `/job-openings/${jobOpeningId}/questions/generate`,
        method: 'POST',
        body: {
          question_count,
          interview_round_id: interview_round_id ?? null,
          category_codes: category_codes ?? null,
        },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [{ type: 'JobQuestions', id: jobOpeningId }],
    }),

    regenerateJobQuestions: build.mutation<
      { generation_status?: 'GENERATING' },
      {
        jobOpeningId: string;
        question_count: number;
        instruction?: string | null;
        interview_round_id?: string | null;
        category_codes?: string[] | null;
      }
    >({
      query: ({
        jobOpeningId,
        question_count,
        instruction,
        interview_round_id,
        category_codes,
      }) => ({
        url: `/job-openings/${jobOpeningId}/questions/regenerate`,
        method: 'POST',
        body: {
          question_count,
          instruction: instruction ?? null,
          interview_round_id: interview_round_id ?? null,
          category_codes: category_codes ?? null,
        },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [{ type: 'JobQuestions', id: jobOpeningId }],
    }),

    bulkImportJobQuestions: build.mutation<
      {
        imported_count: number;
        questions: QuestionResponse[];
        failed_rows: FailedQuestionRowResponse[];
        skipped_duplicate_rows: SkippedDuplicateRowResponse[];
      },
      { jobOpeningId: string; file: File; interview_round_id?: string | null }
    >({
      query: ({ jobOpeningId, file, interview_round_id }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/job-openings/${jobOpeningId}/questions/bulk-import`,
          method: 'POST',
          body: formData,
          params: interview_round_id ? { interview_round_id } : undefined,
        };
      },
      invalidatesTags: (_r, _e, { jobOpeningId }) => [{ type: 'JobQuestions', id: jobOpeningId }],
    }),

    getQuestionImportTemplate: build.query<{ download_url: string; expires_in: number }, void>({
      query: () => ({
        url: '/master/question-import-template',
        method: 'GET',
      }),
    }),
  }),
});

export type { RoundQuestionsResponse };

export const {
  useGetJobQuestionsQuery,
  useGetAudioQuestionsQuery,
  useSaveJobQuestionsMutation,
  useGenerateJobQuestionsMutation,
  useRegenerateJobQuestionsMutation,
  useBulkImportJobQuestionsMutation,
  useLazyGetQuestionImportTemplateQuery,
} = jobQuestionsApi;
