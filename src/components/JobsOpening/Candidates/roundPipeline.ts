import dayjs from 'dayjs';
import type { BadgeStatus } from '../../shared/ui/badge';
import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';
import type { CandidateInterviewScoreView } from '../../../api/candidate-service/Candidates/scoring';
import type { InterviewType } from '../../../api/interview-service/client';
import {
  bucketForStatus,
  isOverdue,
  isRoundConcluded,
  resolveCurrentRound,
  type RoundBucket,
} from './roundProgress';

// Pipeline-level derivations for the Assessment tab's round sidebar and
// summary bar — moved here verbatim from the old PipelineBoard.tsx card row
// (removed 2026-09-29, its features now live in the Assessment tab). Same
// data, same two queries (`useListCandidateInterviewRoundsQuery` /
// `useListCandidateInterviewScoresQuery` in CandidateDetails.tsx); every
// figure (avg score, rounds completed) is derived client-side, no
// backend field carries them today.

export const BUCKET_META: Record<
  RoundBucket,
  { badgeStatus: BadgeStatus; stepBg: string; stepText: string }
> = {
  done: { badgeStatus: 'success', stepBg: 'bg-success', stepText: 'text-white' },
  current: { badgeStatus: 'warning', stepBg: 'bg-warning', stepText: 'text-white' },
  pending: { badgeStatus: 'neutral', stepBg: 'bg-neutral-200', stepText: 'text-neutral-600' },
  failed: { badgeStatus: 'danger', stepBg: 'bg-danger', stepText: 'text-white' },
};

/** The recruiter's Human score (resume scoring + per-round scoring) is a
 * 1-5 star value, saved as-is (2026-09-29 product decision). */
export const HUMAN_SCORE_MAX = 5;

/** Every AI score — resume, intake consistency, each round and its
 * per-category breakdown — is 0-5 (ai-service rescale, 2026-09-29; was
 * 0-10). Same range as the Human score, so the two average like-for-like
 * with no conversion. Every "/ max" label, bar width and colour band reads
 * this rather than a hardcoded number. */
export const AI_SCORE_MAX = 5;

/** A 0-AI_SCORE_MAX score as a clamped 0-100 bar width. */
export const aiScorePercent = (value: number) =>
  Math.max(0, Math.min(100, (value / AI_SCORE_MAX) * 100));

/** Badge colour for an average score — green from 70% of the max, amber
 * from 40%, red below (same relative cut points as the old 7/4 of 10). */
export const scoreBadgeStatus = (value: number): BadgeStatus =>
  value >= AI_SCORE_MAX * 0.7 ? 'success' : value >= AI_SCORE_MAX * 0.4 ? 'warning' : 'danger';

/** interview-service's `interview_type` for a round's booking, from the
 * round's real `round_type` (candidate-service) — AUDIO is the Intake Call,
 * a DIFFERENT Vapi assistant from AUDIO_SCREENING. Used to be inferred from
 * `round_name` alone (anything not "panel"/"video" became
 * `audio_screening`), which booked a manual Intake Call as an Audio
 * Screening call. Name matching is kept only as a fallback for a round
 * whose type is unclassifiable (`round_type === null`). */
export const interviewTypeForRound = (round: CandidateInterviewRoundView): InterviewType => {
  switch (round.round_type) {
    case 'PANEL':
      return 'panel';
    case 'AI_VIDEO':
      return 'ai_video';
    case 'AUDIO_SCREENING':
      return 'audio_screening';
    case 'AUDIO':
      return 'audio';
  }
  const name = (round.round_name ?? '').toLowerCase();
  // Live Video / In-Person before the AI "video" check below.
  if (name.includes('panel') || name.includes('live video') || name.includes('in-person')) {
    return 'panel';
  }
  if (name.includes('video')) return 'ai_video';
  if (name.includes('intake')) return 'audio';
  return 'audio_screening';
};

export const formatWhen = (value: string | null) =>
  value && dayjs(value).isValid() ? dayjs(value).format('MMM D, YYYY, h:mm A') : null;

/** A resume stage with a score reads as Completed — the AI scored it, so
 * that step of the resume+Intake-Call pair is done. The backend still leaves
 * its raw status at `to_be_scheduled`/`pending` until an explicit Advance,
 * which for this pair never happens on its own (see BACKEND_GAPS.md). */
export const isResumeScored = (round: CandidateInterviewRoundView, resumeScore: number | null) =>
  round.stage_type === 'resume' && resumeScore !== null;

/** Recordings/transcripts only exist once at least one attempt at this
 * round has actually happened — but `round.status` reflects only the LATEST
 * attempt, not the round's full history. Excluding only 'pending' (truly
 * never booked/started) is the correct signal: a 'current' round may have
 * prior recordings from before its latest reschedule, a 'failed' one
 * (no-show/cancelled) may still have one from an earlier attempt, and
 * RoundArtifactsPanel already shows "No recordings yet" gracefully when
 * there truly are none. Never for the synthetic resume stage.
 *
 * Also offered as soon as the round has a booking: a booked call (e.g. the
 * Intake Call) can run while the round row's own status still reads
 * `to_be_scheduled` — status alone used to hide the button exactly when a
 * recording was most likely to exist. */
export const hasRoundRecordings = (round: CandidateInterviewRoundView) =>
  round.stage_type === 'interview' &&
  (Boolean(round.interview_booking_id) || bucketForStatus(round.status) !== 'pending');

/** Same guards `set_panel_interviewers.py` enforces server-side (resume
 * stage / already-finished / already-booked all 409), and only for PANEL —
 * AI Video, Audio Screening and the Intake Call are AI-conducted, with no
 * human interviewer to set. */
export const canManageRoundInterviewers = (round: CandidateInterviewRoundView) =>
  round.stage_type === 'interview' &&
  round.round_type === 'PANEL' &&
  !round.interview_booking_id &&
  !isRoundConcluded(round);

// The score row for one round. Normally linked by `candidate_interview_round_id`,
// but candidate-service leaves that null on rows it couldn't resolve to a round
// (scores recorded before its 2026-09-11 backfill, or a booking it never
// planned) — those still carry the round's booking id, so fall back to that.
// Only UNLINKED rows are eligible for the fallback, so a score already linked
// to a different round can never be claimed by this one.
// A round can hold several scores (one per attempt, after a reschedule) and
// candidate-service returns them in no guaranteed order, so the LATEST
// attempt (newest `created_at`) wins, never just the first match.
const latestScore = (
  matches: CandidateInterviewScoreView[]
): CandidateInterviewScoreView | undefined =>
  matches.reduce<CandidateInterviewScoreView | undefined>((latest, s) => {
    if (!latest) return s;
    const t = s.created_at ? Date.parse(s.created_at) : NaN;
    const latestT = latest.created_at ? Date.parse(latest.created_at) : NaN;
    if (Number.isNaN(t)) return latest;
    return Number.isNaN(latestT) || t > latestT ? s : latest;
  }, undefined);

export const findRoundScore = (
  scores: CandidateInterviewScoreView[],
  round: CandidateInterviewRoundView
): CandidateInterviewScoreView | undefined =>
  latestScore(scores.filter((s) => s.candidate_interview_round_id === round.id)) ??
  (round.interview_booking_id
    ? latestScore(
        scores.filter(
          (s) =>
            s.candidate_interview_round_id == null &&
            s.interview_booking_id === round.interview_booking_id
        )
      )
    : undefined);

export const summarisePipeline = (
  rounds: CandidateInterviewRoundView[],
  scores: CandidateInterviewScoreView[],
  resumeScore: number | null
) => {
  const displayBuckets: RoundBucket[] = rounds.map((r) =>
    isResumeScored(r, resumeScore) ? 'done' : bucketForStatus(r.status)
  );
  // Client-side inference only — see `isOverdue`'s own docstring. A round
  // stuck here reads as "needs attention" the same as a real failure, even
  // though the backend itself has never reported one.
  const overdueFlags = rounds.map((r) => isOverdue(r));
  const hasFailure = displayBuckets.includes('failed') || overdueFlags.some(Boolean);

  // The round ADVANCE would actually complete next — NOT just "the first
  // round whose status reads pending": an instant-call candidate with no
  // resume yet has an inert resume stage (`due_at === null`) that action
  // can't touch. See `roundProgress.ts`'s own docstring.
  const currentRound = resolveCurrentRound(rounds);
  let activeIndex = currentRound ? rounds.findIndex((r) => r.id === currentRound.id) : -1;
  // A scored resume stage shows as Completed, so the real "current" work is
  // the next outstanding round after it (the Intake Call, in the pair).
  if (activeIndex !== -1 && isResumeScored(rounds[activeIndex], resumeScore)) {
    activeIndex = rounds.findIndex((_round, i) => i > activeIndex && displayBuckets[i] !== 'done');
  }
  const nextRound = activeIndex !== -1 ? rounds[activeIndex] : null;
  const nextWhen = nextRound
    ? (formatWhen(nextRound.scheduled_at) ?? formatWhen(nextRound.due_at))
    : null;

  // resumeScore, the AI `score` and recruiter_score are all 0-5, so they
  // average as-is.
  const scoreValues = [
    resumeScore,
    ...scores.map((s) => (s.recruiter_score != null ? s.recruiter_score : s.score)),
  ].filter((v): v is number => v !== null && v !== undefined);
  const avgScore =
    scoreValues.length > 0
      ? (scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length).toFixed(1)
      : null;

  const completedCount = displayBuckets.filter((b) => b === 'done').length;

  return {
    displayBuckets,
    overdueFlags,
    hasFailure,
    activeIndex,
    nextRound,
    nextWhen,
    avgScore,
    completedCount,
  };
};
