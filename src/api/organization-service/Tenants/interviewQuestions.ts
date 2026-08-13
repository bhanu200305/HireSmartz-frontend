import { orgApi } from '../orgApi';

export const MAX_INTERVIEW_QUESTIONS = 8;

export type InterviewQuestion = {
  question_id: string;
  question_text: string;
};

export type InterviewQuestionsResponse = {
  questions: InterviewQuestion[];
};

export type SuggestInterviewQuestionsArgs = {
  tenantId: string;
  count: number;
};

export type SuggestedInterviewQuestions = {
  questions: string[];
};

export type SaveInterviewQuestionsArgs = {
  tenantId: string;
  questions: string[];
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listInterviewQuestions: build.query<InterviewQuestionsResponse, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/interview-questions`,
      providesTags: (_result, _error, tenantId) => [{ type: 'InterviewQuestions', id: tenantId }],
    }),
    // Preview only — nothing saved. A separate save call (below) is required
    // to persist the reviewed set.
    suggestInterviewQuestions: build.mutation<
      SuggestedInterviewQuestions,
      SuggestInterviewQuestionsArgs
    >({
      query: ({ tenantId, count }) => ({
        url: `/v1/tenants/${tenantId}/interview-questions/suggest`,
        method: 'POST',
        body: { count },
      }),
    }),
    // Replaces the whole saved set — not additive.
    saveInterviewQuestions: build.mutation<InterviewQuestionsResponse, SaveInterviewQuestionsArgs>({
      query: ({ tenantId, questions }) => ({
        url: `/v1/tenants/${tenantId}/interview-questions`,
        method: 'PUT',
        body: { questions },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'InterviewQuestions', id: tenantId },
      ],
    }),
  }),
});

export const {
  useListInterviewQuestionsQuery,
  useSuggestInterviewQuestionsMutation,
  useSaveInterviewQuestionsMutation,
} = extendedApi;
