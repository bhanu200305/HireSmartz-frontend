import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';

// Shared between PipelineBoard.tsx (visual pipeline) and
// CandidateDetails.tsx (the ADVANCE button's disabled state) — one
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
  interviewer_no_show: 'failed',
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

/** The AI Video round — same reasoning as `isIntakeCallRound` above.
 * Added 2026-09-14: the call-intent/reschedule-request feature extended
 * to cover this round type too, alongside Audio Screening and the Intake
 * Call. */
export const isAiVideoRound = (round: CandidateInterviewRoundView): boolean =>
  round.stage_type === 'interview' && round.round_type === 'AI_VIDEO';

/** True when a round's real-world outcome was specifically "the
 * interviewer never joined" — distinct from `no_show` (candidate-service's
 * existing vocabulary for a CANDIDATE no-show). Both bucket to 'failed' (the
 * round genuinely concluded, just not successfully), but the two must never
 * render as the same badge: an interviewer no-show is the company's failure,
 * not the candidate's, and lumping them together on the card misattributes
 * it. Normalised the same way `bucketForStatus` is, since interview-service
 * owns this vocabulary and casing/separators aren't guaranteed. */
export const isInterviewerNoShowRound = (round: CandidateInterviewRoundView): boolean =>
  round.status
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_') === 'interviewer_no_show';

/** Moves the resume stage to sit immediately AFTER the Intake Call round for
 * instant-call-flow candidates, so the pipeline reads in the order things
 * actually happened for them (call, then resume). Driven entirely by the
 * resume stage's own `follows_intake_call` (candidate-service migration
 * 0023) — the one per-candidate fact for this, since `sequence` is a
 * plan-level position shared by every candidate on the job and can't tell
 * a resume-first candidate apart from an instant-call one on the same
 * opening. Used to be inferred client-side from `awaiting_resume_upload`
 * turning up in the status history; that heuristic is gone now that the
 * backend reports the fact directly.
 *
 * Idempotent: a no-op when the resume stage doesn't have
 * `follows_intake_call` set, when either row is missing, or when the resume
 * stage is already positioned after the Intake Call. Never reorders
 * anything but those two rows. */
export const orderRoundsForFlow = (
  rounds: CandidateInterviewRoundView[]
): CandidateInterviewRoundView[] => {
  const resumeIdx = rounds.findIndex(isResumeStageRound);
  if (resumeIdx === -1 || !rounds[resumeIdx].follows_intake_call) return rounds;
  const intakeIdx = rounds.findIndex(isIntakeCallRound);
  if (intakeIdx === -1 || resumeIdx > intakeIdx) return rounds;
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
// A stale real round named "Resume Round", distinct from the synthetic
// "resume" stage (always shown as "Resume Screening").
export const isStaleResumeRound = (round: CandidateInterviewRoundView): boolean =>
  round.stage_type === 'interview' && round.round_name.trim().toLowerCase() === 'resume round';

export const resolveCurrentRound = (
  rounds: CandidateInterviewRoundView[]
): CandidateInterviewRoundView | null => {
  const outstanding = rounds.filter(
    (r) =>
      !isStaleResumeRound(r) &&
      r.status !== 'completed' &&
      (r.stage_type !== 'resume' || r.due_at !== null)
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
