import { orgApi } from '../orgApi';

export type InterviewQuestion = {
  question_id: string;
  question_text: string;
};

export type InterviewQuestionsResponse = {
  questions: InterviewQuestion[];
};

export type UpdateInterviewQuestionArgs = {
  tenantId: string;
  questionId: string;
  question_text: string;
};

export type DeleteInterviewQuestionArgs = {
  tenantId: string;
  questionId: string;
};

/**
 * This tenant's own HR/interpersonal question set, asked in a candidate's
 * first-round audio interview — seeded from the platform's default set at
 * tenant creation, editable from there on. Backed by organization-service's
 * `/v1/tenants/{tenant_id}/audio-questions` (renamed 2026-08-17 from
 * `interview-questions`, see internal_router.py) — there is no bulk
 * replace-the-set endpoint and no AI "suggest" endpoint on this contract:
 * each question is edited or removed one at a time, matching the routes
 * organization-service actually exposes (GET list, PATCH one, DELETE one —
 * no tenant-level POST to add a brand new question either).
 */
const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listInterviewQuestions: build.query<InterviewQuestionsResponse, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/audio-questions`,
      providesTags: (_result, _error, tenantId) => [{ type: 'InterviewQuestions', id: tenantId }],
    }),
    updateInterviewQuestion: build.mutation<InterviewQuestion, UpdateInterviewQuestionArgs>({
      query: ({ tenantId, questionId, question_text }) => ({
        url: `/v1/tenants/${tenantId}/audio-questions/${questionId}`,
        method: 'PATCH',
        body: { question_text },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'InterviewQuestions', id: tenantId },
      ],
    }),
    // TenantStatusView — a JSON `{status}` body, same as office/department
    // delete on this service (not a 204).
    deleteInterviewQuestion: build.mutation<{ status: string }, DeleteInterviewQuestionArgs>({
      query: ({ tenantId, questionId }) => ({
        url: `/v1/tenants/${tenantId}/audio-questions/${questionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'InterviewQuestions', id: tenantId },
      ],
    }),
  }),
});

export const {
  useListInterviewQuestionsQuery,
  useUpdateInterviewQuestionMutation,
  useDeleteInterviewQuestionMutation,
} = extendedApi;
