import { orgApi } from '../orgApi';

export type InterviewQuestion = {
  question_id: string;
  question_text: string;
  // Which ResumeTemplateField (see ../resumeTemplateFields.ts) this
  // question's spoken answer is meant to fill in — required at the API
  // layer on every create/update, but `null` is still a real value here: a
  // legacy row created before this field existed can come back untagged
  // (organization-service migration 0057 reverted an unsafe NOT NULL —
  // there's no correct value to backfill an old row to). The Resume Field
  // picker in both Intake Questions tabs already renders that as
  // "unassigned" rather than assuming a value.
  field_id: string | null;
};

export type InterviewQuestionsResponse = {
  questions: InterviewQuestion[];
};

export type CreateInterviewQuestionArgs = {
  tenantId: string;
  question_text: string;
  field_id: string;
};

export type UpdateInterviewQuestionArgs = {
  tenantId: string;
  questionId: string;
  question_text: string;
  field_id: string;
};

export type DeleteInterviewQuestionArgs = {
  tenantId: string;
  questionId: string;
};

/**
 * This tenant's own "Intake Questions" — its HR/interpersonal question set,
 * asked in a candidate's first-round intake call. A tenant with no
 * customization of its own live-inherits the Super Admin's current
 * platform default (see `Platform/interviewQuestions.ts`); editing,
 * removing, or adding one here forks an independent copy that then stops
 * tracking further platform-side changes. Backed by organization-service's
 * `/v1/tenants/{tenant_id}/audio-questions` (renamed 2026-08-17 from
 * `interview-questions`, see internal_router.py) — there is no bulk
 * replace-the-set endpoint and no AI "suggest" endpoint on this contract,
 * but POST does exist to add a question back up to the same 8-question cap
 * the platform list is held to (e.g. refilling a slot a delete just freed).
 */
const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listInterviewQuestions: build.query<InterviewQuestionsResponse, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/audio-questions`,
      providesTags: (_result, _error, tenantId) => [{ type: 'InterviewQuestions', id: tenantId }],
    }),
    createInterviewQuestion: build.mutation<InterviewQuestion, CreateInterviewQuestionArgs>({
      query: ({ tenantId, question_text, field_id }) => ({
        url: `/v1/tenants/${tenantId}/audio-questions`,
        method: 'POST',
        body: { question_text, field_id },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'InterviewQuestions', id: tenantId },
      ],
    }),
    updateInterviewQuestion: build.mutation<InterviewQuestion, UpdateInterviewQuestionArgs>({
      query: ({ tenantId, questionId, question_text, field_id }) => ({
        url: `/v1/tenants/${tenantId}/audio-questions/${questionId}`,
        method: 'PATCH',
        body: { question_text, field_id },
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
  useCreateInterviewQuestionMutation,
  useUpdateInterviewQuestionMutation,
  useDeleteInterviewQuestionMutation,
} = extendedApi;
