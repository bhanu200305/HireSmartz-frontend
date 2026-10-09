import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';
import { MAX_REINVITES } from '../../../api/interview-service/client';

// Shared by RoundSidebarItem.tsx (the Assessment round tabs) and CandidateDetails.tsx
// (the round drill-down a card click opens) so a round is never labeled one
// thing on the card and something else once you're inside it — both used to
// compute this independently ("Resume Review" on the card vs. the raw
// backend name "Resume Review" as the drill-down's title).
export const roundLabel = (round: CandidateInterviewRoundView) =>
  round.stage_type === 'resume' ? 'Resume Review' : round.round_name || 'Round';

/** Round status → the label shown on the Interview Scheduling cards and the
 * Assessment tab's round list, so both read the same (backend contract):
 * `booking_created` is an invite waiting on the candidate, not a booking. */
const ROUND_STATUS_LABEL: Record<string, string> = {
  to_be_scheduled: 'Not invited',
  booking_created: 'Invitation sent',
  scheduled: 'Scheduled',
  in_progress: 'Ongoing',
  completed: 'Completed',
  skipped: 'Skipped',
  no_show: 'No-show',
  interviewer_no_show: 'No-show',
  ai_no_show: 'No-show',
  cancelled: 'Cancelled',
  failed: 'Failed',
  rescheduled: 'Rescheduled',
  resume_upload_expired: 'Upload expired',
};

export const roundStatusLabel = (status: string): string | null =>
  ROUND_STATUS_LABEL[
    status
      .trim()
      .toLowerCase()
      .replace(/[-\s]+/g, '_')
  ] ?? null;

export const formatRoundStatus = (status: string) =>
  status
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';

// `BookingView.call_intent` labels, added 2026-09-13 — a fixed, small
// vocabulary from interview-service's `_call_intent.py`/`mark_no_show`/
// `mark_failed`, not a free-form string, so a lookup table beats generic
// snake_case-to-title-case formatting (that would turn `not_interested`
// into "Not Interested", which reads fine, but `ended_unclear` into "Ended
// Unclear", which doesn't — worth spelling out properly).
const CALL_INTENT_LABELS: Record<string, string> = {
  completed: 'Completed the interview',
  reschedule_requested: 'Asked to reschedule',
  not_interested: 'Not interested in the role',
  no_answer: "Didn't pick up",
  technical_failure: 'Call failed (technical issue)',
  ended_unclear: 'Call ended abruptly — no clear reason given',
};

export const formatCallIntent = (callIntent: string | null): string =>
  callIntent != null
    ? (CALL_INTENT_LABELS[callIntent] ?? formatRoundStatus(callIntent))
    : 'Pending';

/** A booking's delivery mode (interview-service: online | offline) as a
 * display label, or null when there is none. */
export const formatDeliveryMode = (mode: string | null | undefined): string | null => {
  const value = (mode ?? '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'online') return 'Online';
  if (value === 'offline') return 'In-person';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

/** A round's reinvite count and link-expiry, preferring candidate-service's
 * round view (`reinvite_count` / `scheduling_link_expired`, added
 * 2026-10-05) and falling back to interview-service's booking for older
 * responses. One source of truth for every card that shows them. */
export const roundReinviteState = (
  round: Pick<CandidateInterviewRoundView, 'reinvite_count' | 'scheduling_link_expired'>,
  booking?: { reinvite_count?: number; max_reinvite_count?: number; link_expired?: boolean } | null
) => ({
  reinvitesUsed: round.reinvite_count ?? booking?.reinvite_count ?? 0,
  // The server's live limit (3 until it says otherwise).
  maxReinvites: booking?.max_reinvite_count ?? MAX_REINVITES,
  linkExpired: round.scheduling_link_expired ?? booking?.link_expired === true,
});
