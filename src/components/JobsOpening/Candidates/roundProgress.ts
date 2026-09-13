import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';

// Shared between PipelineBoard.tsx (visual pipeline + Send Invite gating)
// and CandidateDetails.tsx (the ADVANCE button's disabled state) — one
// definition of "what round is this candidate really on" and "is that
// round's real-world outcome already known", so the two can never disagree
// about either. Also the one place the resume/intake-call ordering and the
// two intake flows are reasoned about (`orderRoundsForFlow` below).

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

/** The synthetic resume stage — job-service has no round behind it, so it's
 * matched on `stage_type`, never a name. */
export const isResumeStageRound = (round: CandidateInterviewRoundView): boolean =>
  round.stage_type === 'resume';

/** The Intake Call round — `round_type === 'AUDIO'` is candidate-service's
 * real classification (added 2026-09-11, see
 * `CandidateInterviewRoundView.round_type`'s own doc comment), matching
 * interview-service's own `InterviewType.AUDIO` ("the Intake Call" per
 * that enum's docstring). Used to be a name match against `round_name`
 * (`.includes('intake call')`) — a Super-Admin-editable string, not a
 * reliable type signal, and the reason the Intake Call Consistency score
 * could silently fail to show up on a tenant whose round type wasn't
 * literally named that. */
export const isIntakeCallRound = (round: CandidateInterviewRoundView): boolean =>
  round.stage_type === 'interview' && round.round_type === 'AUDIO';

/** The Audio Screening round — same reasoning as `isIntakeCallRound`
 * above. Added 2026-09-13 alongside the call-intent feature, which covers
 * both this and the Intake Call. */
export const isAudioScreeningRound = (round: CandidateInterviewRoundView): boolean =>
  round.stage_type === 'interview' && round.round_type === 'AUDIO_SCREENING';

/** True when this candidate came through the instant-call flow — the Intake
 * Call was placed FIRST and the resume was uploaded within 24h afterwards —
 * rather than the resume-first flow. Detected from the funnel history:
 * `awaiting_resume_upload` is stamped ONLY on the instant-call path
 * (candidate-service `interview_intake_call_finished.py`, Path A), so its
 * presence anywhere in the history is a reliable marker.
 *
 * WHY THE FRONTEND HAS TO DECIDE THIS
 * `GET /candidates/{id}/interview-rounds` orders the synthetic resume stage
 * by the job PLAN's single Resume Round position, which is one value per job
 * and cannot differ between two candidates on the same opening. So two
 * candidates who applied to the same job through the two different flows get
 * the same pipeline order from the backend today. See BACKEND_GAPS.md — once
 * candidate-service orders the resume stage per candidate, `orderRoundsForFlow`
 * below becomes a no-op and both can be removed. */
export const isInstantCallFlow = (statusHistory: { status_code: string }[] | undefined): boolean =>
  (statusHistory ?? []).some((entry) => entry.status_code === 'awaiting_resume_upload');

/** Moves the resume stage to sit immediately AFTER the Intake Call round for
 * instant-call-flow candidates, so the pipeline reads in the order things
 * actually happened for them (call, then resume). Idempotent: a no-op when
 * `instantCallFlow` is false, when either row is missing, or when the resume
 * stage is already positioned after the Intake Call (e.g. once the backend
 * starts ordering this itself). Never reorders anything but those two rows. */
export const orderRoundsForFlow = (
  rounds: CandidateInterviewRoundView[],
  instantCallFlow: boolean
): CandidateInterviewRoundView[] => {
  if (!instantCallFlow) return rounds;
  const resumeIdx = rounds.findIndex(isResumeStageRound);
  const intakeIdx = rounds.findIndex(isIntakeCallRound);
  if (resumeIdx === -1 || intakeIdx === -1 || resumeIdx > intakeIdx) return rounds;
  const reordered = [...rounds];
  const [resume] = reordered.splice(resumeIdx, 1);
  // `intakeIdx` is now the Intake Call round's own new index (it shifted down
  // by one when the earlier resume row was spliced out); inserting at that
  // index drops the resume stage directly after it.
  reordered.splice(intakeIdx, 0, resume);
  return reordered;
};

/** Mirrors candidate-service's `_current_round.resolve_current_round` — the
 * round ADVANCE would complete next, and SEND INVITE would announce. The
 * resume stage is excluded while still inert (`due_at === null`): an
 * instant-call candidate with no resume yet has nothing here for either
 * action to act on until a resume is attached, even though its `status`
 * literally reads `to_be_scheduled` same as a real pending round.
 *
 * Assumes `rounds` already arrives in the order the candidate walks them —
 * the `GET .../interview-rounds` response, optionally after
 * `orderRoundsForFlow` has moved the resume stage for an instant-call
 * candidate. Every caller passes the same (possibly reordered) array.
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
 * happened" state to report today.
 *
 * Used to produce exactly this shape (`scheduled_at` in the past, status
 * still stuck at `to_be_scheduled`/`pending`) via a SECOND known gap:
 * candidate-service used to only ever learn a round was actually scheduled
 * from a separate `interview.status.transitioned` event, which could lose
 * a race against the booking-link write it depended on and never retry.
 * Fixed 2026-09-11 — `CandidateInterviewRound.attach_booking` now stamps
 * `status` to `scheduled` itself the moment a real booking lands, so
 * `scheduled_at` being set is now unconditional proof `status` is at least
 * `scheduled` (bucket `current`), never stuck behind it. What's left for
 * this function to actually catch is a round that reached `scheduled` (or
 * later) and then genuinely never got a conclusion reported — either
 * interview-service silently dropping a due call it couldn't resolve a
 * phone number for (`trigger_due_audio_calls.py`'s `no_phone_number`
 * branch never retries or fails the booking), or any other gap in
 * interview-service ever reporting a final outcome. Surfacing this in the
 * UI is a stopgap until interview-service reports a real failure state for
 * every such case — see the intake-call findings write-up. */
export const isOverdue = (round: CandidateInterviewRoundView): boolean => {
  const bucket = bucketForStatus(round.status);
  if (bucket !== 'current' && bucket !== 'pending') return false;
  if (!round.scheduled_at) return false;
  const scheduledMs = new Date(round.scheduled_at).getTime();
  if (Number.isNaN(scheduledMs)) return false;
  return scheduledMs < Date.now() - OVERDUE_GRACE_MINUTES * 60_000;
};
