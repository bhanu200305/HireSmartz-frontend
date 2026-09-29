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

/** Matches `candidate_message_dto.CandidateMessageSendResponse` — was
 * missing `skipped_reason` (the same field the bulk variant's
 * `BulkCandidateMessageResult` already carries below), even though
 * `send_candidate_email`/`send_candidate_sms` return it same as the bulk
 * routes do. Currently unused either way — every real send, single
 * candidate or several, goes through the bulk mutations below (a 1-element
 * `candidateIds` array for "one candidate"), so this type had never been
 * exercised against a real response; kept accurate regardless. */
export type CandidateMessageSendResponse = {
  candidate_id: string;
  sent: boolean;
  skipped_reason: string | null;
};

export type PreviewCandidateEmailRequest = SendCandidateEmailRequest;
export type PreviewCandidateSmsRequest = SendCandidateSmsRequest;

/** `body_html` was declared non-nullable here — the real
 * `candidate_message_dto.CandidateMessagePreviewResponse` has it as
 * `str | None` (an SMS preview plausibly has none). Harmless in practice:
 * `TemplatePreviewModal.tsx`'s `preview?.body_html ? ... : ...` already
 * treats a falsy value as "fall back to plain text," so this was never a
 * live bug — just a wrong type. */
export type CandidateMessagePreviewResponse = {
  subject: string | null;
  body_html: string | null;
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

/** candidate-service `MessageHistoryItemView` — one delivered (or failed)
 * email/SMS. `channel` is notification-service's channel code ("sms",
 * "email"); `status` its delivery status. */
export type MessageHistoryItemView = {
  id: string;
  notification_id: string;
  notification_type: string;
  category: string;
  channel: string;
  recipient_address: string;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  status: string;
  failure_reason: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  read_at: string | null;
};

export type MessageHistoryView = {
  items: MessageHistoryItemView[];
  /** Cursor for the next (older) page; null when there is none. */
  next_before: string | null;
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
      invalidatesTags: (_r, _e, { candidateId }) => [
        { type: 'CandidateMessageHistory', id: candidateId },
      ],
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
      invalidatesTags: (_r, _e, { candidateId }) => [
        { type: 'CandidateMessageHistory', id: candidateId },
      ],
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
      invalidatesTags: (_r, _e, { candidateIds }) =>
        candidateIds.map((id) => ({ type: 'CandidateMessageHistory' as const, id })),
    }),

    sendBulkCandidateSms: build.mutation<BulkCandidateMessageResponse, SendBulkCandidateSmsRequest>(
      {
        query: ({ candidateIds, smsBody }) => ({
          url: '/candidates/messages/sms/bulk',
          method: 'POST',
          body: { candidate_ids: candidateIds, sms_body: smsBody },
        }),
        invalidatesTags: (_r, _e, { candidateIds }) =>
          candidateIds.map((id) => ({ type: 'CandidateMessageHistory' as const, id })),
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

    // GET /candidates/{id}/messages/history — everything already sent to one
    // candidate (recruiter ad-hoc AND system mails/SMS), newest first,
    // keyset-paged: pass the previous page's `next_before` as `before`.
    // `notificationType: 'candidate_adhoc_message'` narrows to messages a
    // recruiter typed. 502 when notification-service can't be reached.
    listCandidateMessageHistory: build.query<
      MessageHistoryView,
      { candidateId: string; notificationType?: string; limit?: number; before?: string }
    >({
      query: ({ candidateId, notificationType, limit, before }) => ({
        url: `/candidates/${candidateId}/messages/history`,
        params: { notification_type: notificationType, limit, before },
      }),
      providesTags: (_r, _e, { candidateId }) => [
        { type: 'CandidateMessageHistory', id: candidateId },
      ],
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
  useListCandidateMessageHistoryQuery,
} = extendedApi;
