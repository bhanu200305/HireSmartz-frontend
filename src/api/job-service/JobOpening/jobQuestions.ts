import { jobApi } from '../jobApi';
import type {
  AudioQuestionResponse,
  JobQuestionsResponse,
  QuestionRequest,
  RoundQuestionsResponse,
} from '../types';

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getJobQuestions: build.query<JobQuestionsResponse, string>({
      query: (jobOpeningId) => ({
        url: `/job-openings/${jobOpeningId}/questions`,
        method: 'GET',
      }),
      providesTags: (_r, _e, jobOpeningId) => [{ type: 'JobQuestions', id: jobOpeningId }],
    }),

    // Backend route (job-service migration 0015 "Split the mandatory round
    // into Intake Call + optional Audio Screening") renamed this from
    // /audio-questions to /intake-call-questions — response shape
    // (`{ questions: [{ question_id, question_text }] }`) is unchanged.
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
      { jobOpeningId: string; question_count: number }
    >({
      query: ({ jobOpeningId, question_count }) => ({
        url: `/job-openings/${jobOpeningId}/questions/generate`,
        method: 'POST',
        body: { question_count },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [{ type: 'JobQuestions', id: jobOpeningId }],
    }),

    regenerateJobQuestions: build.mutation<
      { generation_status?: 'GENERATING' },
      { jobOpeningId: string; question_count: number; instruction?: string | null }
    >({
      query: ({ jobOpeningId, question_count, instruction }) => ({
        url: `/job-openings/${jobOpeningId}/questions/regenerate`,
        method: 'POST',
        body: { question_count, instruction: instruction ?? null },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [{ type: 'JobQuestions', id: jobOpeningId }],
    }),

    bulkImportJobQuestions: build.mutation<
      {
        imported_count: number;
        questions: unknown[];
        failed_rows: unknown[];
        skipped_duplicate_rows: unknown[];
      },
      { jobOpeningId: string; file: File }
    >({
      query: ({ jobOpeningId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/job-openings/${jobOpeningId}/questions/bulk-import`,
          method: 'POST',
          body: formData,
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
} = extendedApi;
