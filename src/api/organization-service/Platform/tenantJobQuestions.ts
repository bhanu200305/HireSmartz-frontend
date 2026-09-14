import { orgApi } from '../orgApi';
import type { InterviewQuestion, InterviewQuestionsResponse } from '../Tenants/interviewQuestions';

export type { InterviewQuestion, InterviewQuestionsResponse };

export type CreatePlatformTenantJobQuestionArgs = {
  tenantId: string;
  question_text: string;
  field_id: string;
};

export type UpdatePlatformTenantJobQuestionArgs = {
  tenantId: string;
  questionId: string;
  question_text: string;
  field_id: string;
};

export type DeletePlatformTenantJobQuestionArgs = {
  tenantId: string;
  questionId: string;
};

export type BulkImportJobQuestionsResponse = {
  created: InterviewQuestion[];
  replaced_count: number;
};

/**
 * GET/POST/PATCH/DELETE /v1/platform/tenants/{tenant_id}/audio-questions[/{id}]
 * — a Super Admin viewing, adding to, or editing ONE SPECIFIC company's own
 * question set, regardless of who owns it. Same contract shape as the
 * tenant's own self-service view (Tenants/interviewQuestions.ts — mirrors
 * that file's own reasoning), just tenant-bound from a path param picked
 * in the Intake Questions tab's company dropdown instead of the signed-in
 * session. If this company hasn't customized its own questions yet, GET
 * here returns the live platform default (see ListJobQuestionsUseCase on
 * the backend) — adding, editing, or removing one of those forks this
 * company its own independent copy from that point on, same as if its own
 * Company Admin had made the change.
 */
const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getPlatformTenantJobQuestions: build.query<InterviewQuestionsResponse, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/audio-questions`,
      providesTags: (_result, _error, tenantId) => [
        { type: 'InterviewQuestions', id: `platform-${tenantId}` },
      ],
    }),
    createPlatformTenantJobQuestion: build.mutation<
      InterviewQuestion,
      CreatePlatformTenantJobQuestionArgs
    >({
      query: ({ tenantId, question_text, field_id }) => ({
        url: `/v1/platform/tenants/${tenantId}/audio-questions`,
        method: 'POST',
        body: { question_text, field_id },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'InterviewQuestions', id: `platform-${tenantId}` },
        { type: 'InterviewQuestions', id: tenantId },
      ],
    }),
    updatePlatformTenantJobQuestion: build.mutation<
      InterviewQuestion,
      UpdatePlatformTenantJobQuestionArgs
    >({
      query: ({ tenantId, questionId, question_text, field_id }) => ({
        url: `/v1/platform/tenants/${tenantId}/audio-questions/${questionId}`,
        method: 'PATCH',
        body: { question_text, field_id },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'InterviewQuestions', id: `platform-${tenantId}` },
        { type: 'InterviewQuestions', id: tenantId },
      ],
    }),
    deletePlatformTenantJobQuestion: build.mutation<
      { status: string },
      DeletePlatformTenantJobQuestionArgs
    >({
      query: ({ tenantId, questionId }) => ({
        url: `/v1/platform/tenants/${tenantId}/audio-questions/${questionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'InterviewQuestions', id: `platform-${tenantId}` },
        { type: 'InterviewQuestions', id: tenantId },
      ],
    }),
    // No separate template endpoint here — the file is identical regardless
    // of which company is selected, so this reuses
    // `useLazyGetIntakeQuestionsTemplateQuery` from Platform/interviewQuestions.ts.
    // Replaces this ONE company's entire list, never the platform default
    // or any other company — see BulkImportJobQuestionsUseCase on the backend.
    bulkImportPlatformTenantJobQuestions: build.mutation<
      BulkImportJobQuestionsResponse,
      { tenantId: string; file: File }
    >({
      query: ({ tenantId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/v1/platform/tenants/${tenantId}/audio-questions/bulk-import`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'InterviewQuestions', id: `platform-${tenantId}` },
        { type: 'InterviewQuestions', id: tenantId },
      ],
    }),
  }),
});

export const {
  useGetPlatformTenantJobQuestionsQuery,
  useCreatePlatformTenantJobQuestionMutation,
  useUpdatePlatformTenantJobQuestionMutation,
  useDeletePlatformTenantJobQuestionMutation,
  useBulkImportPlatformTenantJobQuestionsMutation,
} = extendedApi;
