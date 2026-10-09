// Readable text for `skipped_reason` on candidate-service's bulk email / SMS
// results (`BulkCandidateMessageResult`). The first few come from
// candidate-service itself, `no_address` and `suppressed_or_opted_out` are
// passed through from notification-service. `duplicate` is notification-service
// dropping a further message to the same candidate within a 5-minute window.
// `no_sms_consent` is kept for older results (SMS is opt-out now).
const SKIP_REASON_LABELS: Record<string, string> = {
  candidate_not_found: 'Candidate not found',
  no_email_on_file: 'No email address on file',
  no_phone_on_file: 'No phone number on file',
  no_sms_consent: 'Candidate has not given SMS consent',
  sms_opted_out: 'Candidate opted out of SMS',
  sms_consent_unavailable: "Couldn't check SMS consent. Email was still sent.",
  duplicate: 'Already sent a moment ago.',
  channel_unavailable: "SMS isn't available right now.",
  no_address: 'No email or phone on file.',
  suppressed_or_opted_out: 'This candidate has opted out.',
  send_failed: "Couldn't send to this candidate. Try again.",
};

export const describeSkippedReason = (reason: string | null | undefined): string =>
  reason ? (SKIP_REASON_LABELS[reason] ?? reason.replace(/_/g, ' ')) : 'Already sent a moment ago.';
