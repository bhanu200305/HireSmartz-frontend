import candidateApi from '../candidateApi';

// Candidate Messaging — API_CONTRACT.md's "Candidate Messaging" section.
// New since a previous version of this API; this whole section has no
// legacy equivalent to replace. Bulk send SILENTLY SKIPS a candidate with
// no email/phone/consent rather than failing the whole batch — always
// render `skipped_reason` per row in a bulk-send results screen, never
// assume `sent: true` for everyone just because the call returned 200
// (FRONTEND_INTEGRATION_DETAILS.md §4.9).

export type SendCandidateEmailRequest = {
  subject: string;
  header?: string;
  body: string;
};

export type SendCandidateSmsRequest = { smsBody: string };

export type CandidateMessageSendResponse = {
  candidate_id: string;
  sent: boolean;
};

export type PreviewCandidateEmailRequest = SendCandidateEmailRequest;
export type PreviewCandidateSmsRequest = SendCandidateSmsRequest;

export type CandidateMessagePreviewResponse = {
  subject: string | null;
  body_html: string;
  body_text: string;
};

export type SendBulkCandidateEmailRequest = {
  candidateIds: string[];
  subject: string;
  header?: string;
  body: string;
};

export type SendBulkCandidateSmsRequest = {
  candidateIds: string[];
  smsBody: string;
};

export type BulkCandidateMessageResult = {
  candidate_id: string;
  sent: boolean;
  skipped_reason: string | null;
};

export type BulkCandidateMessageResponse = {
  results: BulkCandidateMessageResult[];
};

export type GenerateSmsContentRequest = { intent: string };
export type SuggestedSmsContentResponse = { message: string };

const extendedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    sendCandidateEmail: build.mutation<
      CandidateMessageSendResponse,
      { candidateId: string; body: SendCandidateEmailRequest }
    >({
      query: ({ candidateId, body }) => ({
        url: `/candidates/${candidateId}/messages/email`,
        method: 'POST',
        body,
      }),
    }),

    sendCandidateSms: build.mutation<
      CandidateMessageSendResponse,
      { candidateId: string; body: SendCandidateSmsRequest }
    >({
      query: ({ candidateId, body }) => ({
        url: `/candidates/${candidateId}/messages/sms`,
        method: 'POST',
        body: { sms_body: body.smsBody },
      }),
    }),

    previewCandidateEmail: build.mutation<
      CandidateMessagePreviewResponse,
      { candidateId: string; body: PreviewCandidateEmailRequest }
    >({
      query: ({ candidateId, body }) => ({
        url: `/candidates/${candidateId}/messages/email/preview`,
        method: 'POST',
        body,
      }),
    }),

    previewCandidateSms: build.mutation<
      CandidateMessagePreviewResponse,
      { candidateId: string; body: PreviewCandidateSmsRequest }
    >({
      query: ({ candidateId, body }) => ({
        url: `/candidates/${candidateId}/messages/sms/preview`,
        method: 'POST',
        body: { sms_body: body.smsBody },
      }),
    }),

    sendBulkCandidateEmail: build.mutation<
      BulkCandidateMessageResponse,
      SendBulkCandidateEmailRequest
    >({
      query: ({ candidateIds, subject, header, body }) => ({
        url: '/candidates/messages/email/bulk',
        method: 'POST',
        body: { candidate_ids: candidateIds, subject, header, body },
      }),
    }),

    sendBulkCandidateSms: build.mutation<BulkCandidateMessageResponse, SendBulkCandidateSmsRequest>(
      {
        query: ({ candidateIds, smsBody }) => ({
          url: '/candidates/messages/sms/bulk',
          method: 'POST',
          body: { candidate_ids: candidateIds, sms_body: smsBody },
        }),
      }
    ),

    generateSmsContent: build.mutation<
      SuggestedSmsContentResponse,
      { candidateId: string; body: GenerateSmsContentRequest }
    >({
      query: ({ candidateId, body }) => ({
        url: `/candidates/${candidateId}/messages/sms/generate`,
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useSendCandidateEmailMutation,
  useSendCandidateSmsMutation,
  usePreviewCandidateEmailMutation,
  usePreviewCandidateSmsMutation,
  useSendBulkCandidateEmailMutation,
  useSendBulkCandidateSmsMutation,
  useGenerateSmsContentMutation,
} = extendedApi;
