import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';

// Shared between PipelineBoard.tsx (visual pipeline + Send Invite/Skip
// Round gating) and CandidateDetails.tsx (the ADVANCE button's disabled
// state) — one definition of "what round is this candidate really on" and
// "is that round's real-world outcome already known", so the two can never
// disagree about either.

export type RoundBucket = 'done' | 'current' | 'pending' | 'failed';

// Mirrors candidate-service's own `KNOWN_ROUND_STATUSES` / `normalise_round_status`
// (interview_round_status.py) — interview-service owns this vocabulary and can
// report a value outside this set at any time, so an unrecognised status folds
// to 'pending' (the least alarming bucket) rather than throwing.
const ROUND_STATUS_BUCKET: Record<string, RoundBucket> = {
  completed: 'done',
  skipped: 'done',
  scheduled: 'current',
  in_progress: 'current',
  rescheduled: 'current',
  to_be_scheduled: 'pending',
  pending: 'pending',
  no_show: 'failed',
  cancelled: 'failed',
  aborted: 'failed',
};

export const bucketForStatus = (status: string): RoundBucket => {
  const key = status
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
  return ROUND_STATUS_BUCKET[key] ?? 'pending';
};

/** Mirrors candidate-service's `_current_round.resolve_current_round` — the
 * round ADVANCE would complete next, and SEND INVITE would announce. The
 * resume stage is excluded while still inert (`due_at === null`): an
 * instant-call candidate with no resume yet has nothing here for either
 * action to act on until a resume is attached, even though its `status`
 * literally reads `to_be_scheduled` same as a real pending round.
 *
 * Assumes `rounds` already arrives in plan order (resume stage first, then
 * job-service's own sequence) — same as the real `GET .../interview-rounds`
 * response and every existing caller of this array.
 */
export const resolveCurrentRound = (
  rounds: CandidateInterviewRoundView[]
): CandidateInterviewRoundView | null => {
  const outstanding = rounds.filter(
    (r) => r.status !== 'completed' && (r.stage_type !== 'resume' || r.due_at !== null)
  );
  return outstanding[0] ?? null;
};

/** A round whose real-world outcome is already known one way or another
 * (the interview happened, or definitively didn't — no-show/cancelled/
 * aborted) — safe for ADVANCE to complete. Anything still bucketed
 * `current` or `pending` means the interview hasn't concluded yet
 * (scheduled/in_progress/rescheduled/to_be_scheduled/pending): advancing
 * past it now would mark a round "completed" that was never actually
 * conducted. */
export const isRoundConcluded = (round: CandidateInterviewRoundView): boolean => {
  const bucket = bucketForStatus(round.status);
  return bucket === 'done' || bucket === 'failed';
};

/** Grace period after a round's `scheduled_at` before treating it as
 * overdue rather than "still due any moment." Long enough that a call
 * that's legitimately ringing or just wrapping up isn't flagged. */
export const OVERDUE_GRACE_MINUTES = 30;

/** True when a round was scheduled to happen a while ago but its status
 * never moved past "not yet concluded." This is a client-side inference,
 * not a real backend status — candidate-service has no "the call never
 * happened" state to report today. Two known backend gaps produce exactly
 * this shape (scheduled_at in the past, status stuck): interview-service
 * can silently drop a due call when it can't resolve a phone number
 * (`trigger_due_audio_calls.py`'s `no_phone_number` branch never retries
 * or fails the booking), and candidate-service can lose the status update
 * to a race between linking the booking and recording its status
 * (`update_interview_round_status.py`'s "unresolvable booking" case,
 * which also never retries). Surfacing this in the UI is a stopgap until
 * either side reports a real failure state — see the intake-call
 * findings write-up. */
export const isOverdue = (round: CandidateInterviewRoundView): boolean => {
  const bucket = bucketForStatus(round.status);
  if (bucket !== 'current' && bucket !== 'pending') return false;
  if (!round.scheduled_at) return false;
  const scheduledMs = new Date(round.scheduled_at).getTime();
  if (Number.isNaN(scheduledMs)) return false;
  return scheduledMs < Date.now() - OVERDUE_GRACE_MINUTES * 60_000;
};
