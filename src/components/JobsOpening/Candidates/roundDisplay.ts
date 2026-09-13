import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';

// Shared by PipelineBoard.tsx (the pipeline cards) and CandidateDetails.tsx
// (the round drill-down a card click opens) so a round is never labeled one
// thing on the card and something else once you're inside it — both used to
// compute this independently ("Resume Screening" on the card vs. the raw
// backend name "Resume Review" as the drill-down's title).
export const roundLabel = (round: CandidateInterviewRoundView) =>
  round.stage_type === 'resume' ? 'Resume Screening' : round.round_name || 'Round';

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
