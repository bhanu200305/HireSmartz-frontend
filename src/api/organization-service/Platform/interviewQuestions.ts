import { orgApi } from '../orgApi';
import type { InterviewQuestion } from '../Tenants/interviewQuestions';

export type { InterviewQuestion };

export type InterviewQuestionsResponse = {
  questions: InterviewQuestion[];
};

export type CreateInterviewQuestionArgs = {
  question_text: string;
};

export type UpdateInterviewQuestionArgs = {
  questionId: string;
  question_text: string;
};

/**
 * GET/POST /v1/platform/interview-questions, PUT/DELETE
 * /v1/platform/interview-questions/{question_id} — the Super Admin's
 * platform-wide default question set (max 8, enforced server-side). Every
 * tenant with no customization of its own live-inherits this list —
 * editing it here shows up immediately for any tenant that hasn't forked
 * its own copy (see Platform/tenantJobQuestions.ts and
 * Tenants/interviewQuestions.ts for that per-tenant view). Unlike those,
 * this one DOES support add — the SET of questions is decided here.
 */
const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformInterviewQuestions: build.query<InterviewQuestionsResponse, void>({
      query: () => '/v1/platform/interview-questions',
      providesTags: ['InterviewQuestions'],
    }),
    createPlatformInterviewQuestion: build.mutation<
      InterviewQuestion,
      CreateInterviewQuestionArgs
    >({
      query: (body) => ({
        url: '/v1/platform/interview-questions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InterviewQuestions'],
    }),
    updatePlatformInterviewQuestion: build.mutation<
      InterviewQuestion,
      UpdateInterviewQuestionArgs
    >({
      query: ({ questionId, question_text }) => ({
        url: `/v1/platform/interview-questions/${questionId}`,
        method: 'PUT',
        body: { question_text },
      }),
      invalidatesTags: ['InterviewQuestions'],
    }),
    deletePlatformInterviewQuestion: build.mutation<void, string>({
      query: (questionId) => ({
        url: `/v1/platform/interview-questions/${questionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['InterviewQuestions'],
    }),
  }),
});

export const {
  useListPlatformInterviewQuestionsQuery,
  useCreatePlatformInterviewQuestionMutation,
  useUpdatePlatformInterviewQuestionMutation,
  useDeletePlatformInterviewQuestionMutation,
} = extendedApi;
