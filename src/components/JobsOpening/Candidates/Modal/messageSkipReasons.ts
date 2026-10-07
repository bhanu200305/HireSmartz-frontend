// Readable text for `skipped_reason` on candidate-service's bulk email / SMS
// results (`BulkCandidateMessageResult`). The first four come from
// candidate-service itself, `no_address` and `suppressed_or_opted_out` are
// passed through from notification-service. `sent: false` with a null reason
// is notification-service treating the send as a duplicate: it drops any
// further message to the same candidate within a 5-minute window.
const SKIP_REASON_LABELS: Record<string, string> = {
  candidate_not_found: 'Candidate not found',
  no_email_on_file: 'No email address on file',
  no_phone_on_file: 'No phone number on file',
  no_sms_consent: 'Candidate has not given SMS consent',
  duplicate: 'Already sent a moment ago.',
  channel_unavailable: "SMS isn't available right now.",
  no_address: 'No email or phone on file.',
  suppressed_or_opted_out: 'This candidate has opted out.',
  send_failed: "Couldn't send to this candidate. Try again.",
};

export const describeSkippedReason = (reason: string | null | undefined): string =>
  reason ? (SKIP_REASON_LABELS[reason] ?? reason.replace(/_/g, ' ')) : 'Already sent a moment ago.';
