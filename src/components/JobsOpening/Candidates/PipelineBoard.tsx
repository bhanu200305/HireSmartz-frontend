import { useState } from 'react';
import dayjs from 'dayjs';
import { Badge, type BadgeStatus } from '../../shared';
import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';
import type { CandidateInterviewScoreView } from '../../../api/candidate-service/Candidates/scoring';
import {
  CONCLUDED_BOOKING_STATUSES,
  useGetBookingQuery,
  useGetInterviewerCalendarStatusQuery,
} from '../../../api/interview-service/client';
import {
  bucketForStatus,
  isAiVideoRound,
  isAudioScreeningRound,
  isIntakeCallRound,
  isInterviewerNoShowRound,
  isOverdue,
  isRoundConcluded,
  normaliseRoundStatus,
  resolveCurrentRound,
  type RoundBucket,
} from './roundProgress';
import RoundArtifactsModal from './Modal/RoundArtifactsModal';
import PanelInterviewersModal from './Modal/PanelInterviewersModal';
import { roundLabel, formatRoundStatus } from './roundDisplay';

// Renders `CandidateDetails`' Pipeline tab as a horizontal, Gantt-style step
// board (one column per round, done/current/upcoming styling) instead of the
// previous flat list of rows — same data, same two queries this replaces
// (`useListCandidateInterviewRoundsQuery` / `useListCandidateInterviewScoresQuery`
// in CandidateDetails.tsx), nothing new fetched and no new mutations. Every
// figure below (avg score, rounds completed, standing) is derived client-side
// from those two arrays; no backend field carries them today.

const BUCKET_META: Record<
  RoundBucket,
  { badgeStatus: BadgeStatus; border: string; stepBg: string; stepText: string }
> = {
  done: {
    badgeStatus: 'success',
    border: 'border-t-success',
    stepBg: 'bg-success',
    stepText: 'text-white',
  },
  current: {
    badgeStatus: 'warning',
    border: 'border-t-warning',
    stepBg: 'bg-warning',
    stepText: 'text-white',
  },
  pending: {
    badgeStatus: 'neutral',
    border: 'border-t-neutral-300',
    stepBg: 'bg-neutral-200',
    stepText: 'text-neutral-600',
  },
  failed: {
    badgeStatus: 'danger',
    border: 'border-t-danger',
    stepBg: 'bg-danger',
    stepText: 'text-white',
  },
};

const formatWhen = (value: string | null) =>
  value && dayjs(value).isValid() ? dayjs(value).format('MMM D, h:mm A') : null;

type RoundCardProps = {
  round: CandidateInterviewRoundView;
  index: number;
  bucket: RoundBucket;
  overdue: boolean;
  isActive: boolean;
  isResumeScored: boolean;
  isInterviewRound: boolean;
  hasRecordings: boolean;
  canManageInterviewers: boolean;
  roundScore: CandidateInterviewScoreView | undefined;
  roundScoreValue: number | undefined;
  resumeScore: number | null;
  consistencyScore: number | null;
  when: string | null;
  clickable: boolean;
  onActivate: () => void;
  onOpenArtifacts: () => void;
  onOpenInterviewers: () => void;
  onRequestReschedule?: () => void;
};

// Split out from PipelineBoard's own render loop so it can call a hook of
// its own (`useGetBookingQuery`, below) — one query per card, each keyed on
// that round's own booking id, instead of a variable number of hook calls
// inside a single `.map()` (a Rules-of-Hooks violation the old inline
// version never had to worry about, since it never needed per-round data
// this component's own props didn't already carry).
const RoundCard = ({
  round,
  index,
  bucket,
  overdue,
  isActive,
  isResumeScored,
  isInterviewRound,
  hasRecordings,
  canManageInterviewers,
  roundScore,
  roundScoreValue,
  resumeScore,
  consistencyScore,
  when,
  clickable,
  onActivate,
  onOpenArtifacts,
  onOpenInterviewers,
  onRequestReschedule,
}: RoundCardProps) => {
  // A voice-call round's real outcome (`call_intent`) lives on its booking
  // (interview-service), not this round's own coarse `status`
  // (candidate-service) — fetched here so a technical failure can be
  // surfaced on the card itself, not only inside the Call Outcome
  // drill-down. Skipped for PANEL/resume rounds (no call_intent concept
  // there) and any round with no booking yet.
  const isVoiceCallRound =
    isIntakeCallRound(round) || isAudioScreeningRound(round) || isAiVideoRound(round);
  const isPanelRound = round.round_type === 'PANEL';
  const { data: booking } = useGetBookingQuery(round.interview_booking_id ?? '', {
    skip: !round.interview_booking_id || !(isVoiceCallRound || isPanelRound),
  });
  // A PANEL booking stays `draft` — no Nylas scheduling link, no candidate
  // notification — until every explicitly-assigned interviewer has a
  // connected calendar (`try_create_panel_scheduling_link`, interview-service).
  // Same query BookingDetailDrawer.tsx already uses for its own "Panel
  // interviewers" list, here to surface the same reason on the card itself.
  const { data: calendarStatus } = useGetInterviewerCalendarStatusQuery(
    round.interview_booking_id ?? '',
    { skip: !round.interview_booking_id || !isPanelRound }
  );
  const missingCalendarCount =
    calendarStatus?.interviewers.filter((i) => !i.calendar_connected).length ?? 0;
  const isBlockedOnCalendar =
    isPanelRound && booking?.status === 'draft' && missingCalendarCount > 0;
  const technicalFailure = booking?.call_intent === 'technical_failure';
  // Borrows the 'failed' bucket's danger styling, same as `overdue` already
  // did — a technical failure is exactly as actionable as a real failure,
  // it's just sourced from the booking's call_intent rather than this
  // round's own status.
  const visuallyFailed = overdue || technicalFailure;
  const meta = visuallyFailed ? BUCKET_META.failed : BUCKET_META[bucket];
  // Bucket-wise this is still 'failed' (the round concluded, just not
  // successfully) — border/step styling stays as-is. Only the badge pill
  // itself gets a distinct color, so it never reads as the same status as
  // a candidate no-show at a glance.
  const interviewerNoShow = isInterviewerNoShowRound(round);
  const badgeStatus = interviewerNoShow ? 'info' : meta.badgeStatus;
  // Same eligibility interview-service's own request-reschedule endpoint
  // enforces — AUDIO/AUDIO_SCREENING/AI_VIDEO gate on the booking's
  // call_intent (call already concluded one way or another), while PANEL
  // has no call_intent concept and gates on the booking's own status
  // instead (also already concluded). Never offered somewhere the backend
  // would just reject it.
  const canRequestReschedule = isPanelRound
    ? booking != null &&
      CONCLUDED_BOOKING_STATUSES.includes(booking.status) &&
      Boolean(onRequestReschedule)
    : isVoiceCallRound && booking?.call_intent != null && Boolean(onRequestReschedule);

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onActivate : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
      className={`w-56 shrink-0 rounded-xl border border-neutral-200 border-t-4 bg-white shadow-xs ${meta.border} ${
        isActive ? 'ring-2 ring-warning/40' : ''
      } ${clickable ? 'cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30' : ''}`}
    >
      <div className="flex items-center gap-2 px-3.5 pt-3">
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${meta.stepBg} ${meta.stepText}`}
        >
          {visuallyFailed ? '!' : bucket === 'done' ? '✓' : index + 1}
        </span>
        <span className="truncate text-sm font-semibold text-neutral-900" title={roundLabel(round)}>
          {roundLabel(round)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-3.5 pb-3.5 pt-2.5">
        <Badge status={badgeStatus} className="w-fit">
          {overdue
            ? 'Overdue'
            : technicalFailure
              ? 'Technical Failure'
              : isResumeScored
                ? 'Completed'
                : normaliseRoundStatus(round.status) === 'booking_created'
                  ? 'Booking created — waiting to be scheduled'
                  : normaliseRoundStatus(round.status) === 'awaiting_resume_upload'
                    ? 'Awaiting resume upload'
                    : formatRoundStatus(round.status)}
        </Badge>
        {isBlockedOnCalendar && (
          <Badge status="warning" dot={false} className="w-fit">
            {`Calendar pending (${missingCalendarCount})`}
          </Badge>
        )}
        {overdue && (
          <span className="text-xs text-danger">
            No update since the scheduled time; may not have gone through.
          </span>
        )}
        {!overdue && technicalFailure && (
          <span className="text-xs text-danger">The call ended due to a technical issue.</span>
        )}
        {when && <span className="text-xs text-neutral-500">{when}</span>}
        {round.duration_minutes != null && (
          <span className="text-xs text-neutral-400">{round.duration_minutes} min</span>
        )}
        {round.stage_type === 'resume' && resumeScore !== null && (
          <span className="text-xs font-semibold text-primary-600">Score: {resumeScore}</span>
        )}
        {isIntakeCallRound(round) && consistencyScore !== null && (
          <span className="text-xs font-semibold text-primary-600">
            Consistency: {consistencyScore} / 10
          </span>
        )}
        {isInterviewRound && !isIntakeCallRound(round) && roundScoreValue != null && (
          <span className="text-xs font-semibold text-primary-600">
            {roundScore?.score != null && roundScore?.recruiter_score != null
              ? `AI: ${roundScore.score} / 10 · Recruiter: ${roundScore.recruiter_score} / 10`
              : roundScore?.recruiter_score != null
                ? `Score: ${roundScore.recruiter_score} / 10`
                : `Score: ${roundScore?.score} / 10 · AI score`}
          </span>
        )}
        {hasRecordings && (
          <button
            type="button"
            className="w-fit text-xs font-medium text-primary-600 hover:underline cursor-pointer"
            onClick={(event) => {
              // Independent of the card's own click (which now opens the
              // round-detail drill-down) — stop it from also firing
              // onActivate.
              event.stopPropagation();
              onOpenArtifacts();
            }}
          >
            View recording &amp; transcript ›
          </button>
        )}
        {canManageInterviewers && (
          <button
            type="button"
            className="w-fit text-xs font-medium text-primary-600 hover:underline cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              onOpenInterviewers();
            }}
          >
            {(round.interviewer_ids ?? []).length > 0
              ? `Interviewers (${(round.interviewer_ids ?? []).length}) ›`
              : 'Set interviewers ›'}
          </button>
        )}
        {canRequestReschedule && (
          <button
            type="button"
            className="w-fit text-xs font-medium text-danger hover:underline cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              onRequestReschedule?.();
            }}
          >
            Request reschedule ›
          </button>
        )}
      </div>
    </div>
  );
};

type PipelineBoardProps = {
  rounds: CandidateInterviewRoundView[];
  scores: CandidateInterviewScoreView[];
  resumeScore: number | null;
  // The Intake Call round never produces a `CandidateInterviewScore` — its
  // real output is this resume-consistency check on the candidate record
  // (see `isIntakeCallRound`'s own docstring). Passed separately, same
  // convention as `resumeScore`, so this card can show the right number
  // instead of falling through to whatever (if anything) `scores` has for
  // that round's id.
  consistencyScore: number | null;
  candidateId: string;
  onRoundClick?: (round: CandidateInterviewRoundView) => void;
  // Wired to the same `RequestCallRescheduleUseCase` flow the Call Outcome
  // drill-down already offers — this just gives it a second entry point
  // directly on the card, so a failed/concluded round doesn't require
  // clicking in first. Omitted entirely (not just gated on eligibility)
  // when the caller doesn't support it.
  onRequestReschedule?: (round: CandidateInterviewRoundView) => void;
};

const PipelineBoard = ({
  rounds,
  scores,
  resumeScore,
  consistencyScore,
  candidateId,
  onRoundClick,
  onRequestReschedule,
}: PipelineBoardProps) => {
  const [artifactsModalFor, setArtifactsModalFor] = useState<{
    roundId: string;
    roundName: string;
    // Which inline player to show the recording with — 'PANEL'/'AI_VIDEO'
    // get a video player, everything else (AUDIO/AUDIO_SCREENING, or an
    // unclassifiable round) gets an audio player. See
    // `CandidateInterviewRoundView.round_type`'s own doc comment.
    roundType: string | null;
    feedback: Pick<
      CandidateInterviewRoundView,
      'candidate_feedback_rating' | 'candidate_feedback_text' | 'candidate_feedback_submitted_at'
    >;
  } | null>(null);
  const [interviewersModalFor, setInterviewersModalFor] = useState<{
    roundId: string;
    roundName: string;
    currentInterviewerIds: string[];
  } | null>(null);
  if (rounds.length === 0) {
    return <p className="text-sm text-gray-500">No round plan yet.</p>;
  }

  const buckets = rounds.map((r) => bucketForStatus(r.status));
  // A resume stage with a score is shown as Completed — the AI scored it, so
  // that step of the resume+Intake-Call pair is done (see the card below and
  // BACKEND_GAPS.md: the backend still leaves its raw status at
  // `to_be_scheduled`/`pending` until an explicit Advance, which for this
  // pair never happens on its own).
  const resumeScored = (r: CandidateInterviewRoundView) =>
    r.stage_type === 'resume' && resumeScore !== null;
  const displayBuckets: RoundBucket[] = rounds.map((r, i) =>
    resumeScored(r) ? 'done' : buckets[i]
  );
  // Client-side inference only — see `isOverdue`'s own docstring. A round
  // stuck here reads as "needs attention" the same as a real failure,
  // even though the backend itself has never reported one.
  const overdueFlags = rounds.map((r) => isOverdue(r));
  const hasFailure = displayBuckets.includes('failed') || overdueFlags.some(Boolean);
  const allDone = displayBuckets.every((b) => b === 'done');

  // The round ADVANCE would actually complete next — NOT just "the first
  // card whose status reads pending": an instant-call candidate with no
  // resume yet has a resume card sitting there with status
  // `to_be_scheduled` same as a real pending round, but it's inert
  // (`due_at === null`) and that action can't touch it. See
  // `roundProgress.ts`'s own docstring.
  const currentRound = resolveCurrentRound(rounds);
  let activeIndex = currentRound ? rounds.findIndex((r) => r.id === currentRound.id) : -1;
  // A scored resume stage shows as Completed, so the real "current" work is
  // the next outstanding round after it (the Intake Call, in the pair).
  if (activeIndex !== -1 && resumeScored(rounds[activeIndex])) {
    activeIndex = rounds.findIndex((_round, i) => i > activeIndex && displayBuckets[i] !== 'done');
  }
  const nextRound = activeIndex !== -1 ? rounds[activeIndex] : null;
  const nextWhen = nextRound
    ? (formatWhen(nextRound.scheduled_at) ?? formatWhen(nextRound.due_at))
    : null;

  // resumeScore, recruiter_score and score are all 0-10 (the recruiter
  // <Rate> widget used to cap at 5 stars, silently mixing a capped value in
  // here — fixed to count={10} in RecruiterRoundScoreModal/ResumeReviewModal
  // so this average is now like-for-like across every source).
  const scoreValues = [resumeScore, ...scores.map((s) => s.recruiter_score ?? s.score)].filter(
    (v): v is number => v !== null && v !== undefined
  );
  const avgScore =
    scoreValues.length > 0
      ? (scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length).toFixed(1)
      : null;

  const completedCount = displayBuckets.filter((b) => b === 'done').length;

  const standing: { status: BadgeStatus; label: string } = hasFailure
    ? { status: 'danger', label: 'Needs attention' }
    : allDone
      ? { status: 'success', label: 'Complete' }
      : { status: 'info', label: 'On track' };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {rounds.map((round, index) => {
          const bucket = displayBuckets[index];
          const overdue = overdueFlags[index];
          const when = formatWhen(round.scheduled_at) ?? formatWhen(round.due_at);
          const isActive = index === activeIndex;
          // The resume stage's raw status never flips off
          // "to_be_scheduled"/"pending" on its own (record_resume_score.py
          // writes only the score, never this round's status — see
          // BACKEND_GAPS.md). A score sitting here means the AI has assessed
          // it: that half of the resume+Intake-Call pair is done, so the card
          // reads Completed rather than pending.
          const isResumeScored = resumeScored(round);
          // Recordings/transcripts only ever exist for a real interview
          // round (there's nothing for the synthetic resume stage to
          // record) — the artifacts endpoint keys off this round row's own
          // `id`, which is only ever null-shaped conceptually for the
          // resume stage, so gate the click on stage_type rather than id.
          const isInterviewRound = round.stage_type === 'interview';
          // Recordings/transcripts only exist once at least one attempt at
          // this round has actually happened — but `round.status` reflects
          // only the LATEST attempt, not the round's full history. Gating on
          // `=== 'done'` used to hide this entry point the moment a
          // completed round was rescheduled (status flips back to
          // 'scheduled'/'current'), even though the earlier, concluded
          // attempt's recording still exists and is still fetchable (the
          // modal already groups artifacts into "Attempt 1"/"Attempt 2"
          // tabs by booking — see RoundArtifactsModal.tsx). Excluding only
          // 'pending' (truly never booked/started) is the correct signal: a
          // 'current' round may have prior recordings from before its
          // latest reschedule, a 'failed' one (no-show/cancelled) may still
          // have a recording from an earlier attempt, and the modal itself
          // already shows "No recordings yet" gracefully when there truly
          // are none.
          const hasRecordings = isInterviewRound && bucketForStatus(round.status) !== 'pending';
          // Same guards `set_panel_interviewers.py` enforces server-side
          // (resume stage / already-finished / already-booked all 409) —
          // this just keeps the trigger from inviting a click that can only
          // ever fail. Also gated on `round_type === 'PANEL'` — AI Video and
          // Audio Screening (and the Intake Call) are AI-conducted, with no
          // human interviewer for a recruiter to set, so this control has
          // nothing to do there. `round_type` is null-safe against an
          // unclassifiable round (treated as "not a Panel round" — see
          // `CandidateInterviewRoundView.round_type`'s own doc comment).
          const canManageInterviewers =
            isInterviewRound &&
            round.round_type === 'PANEL' &&
            !round.interview_booking_id &&
            !isRoundConcluded(round);
          // Same round-id match the Summary tab's "Scores across rounds"
          // chart and table use (`CandidateInterviewScoreView` carries no
          // round name/id of its own — resolve it via
          // `candidate_interview_round_id` against this LOCAL round row's
          // `id`, not `.round_id` — see interviewRounds.ts's note on that
          // mix-up). The resume stage card already showed its score below;
          // interview rounds never did, even though `scores` was already
          // passed into this component.
          const roundScore = isInterviewRound
            ? scores.find((s) => s.candidate_interview_round_id === round.id)
            : undefined;
          const roundScoreValue = roundScore?.recruiter_score ?? roundScore?.score;
          const clickable = Boolean(onRoundClick || hasRecordings);
          const openArtifacts = () =>
            setArtifactsModalFor({
              roundId: round.id,
              roundName: roundLabel(round),
              roundType: round.round_type,
              feedback: {
                candidate_feedback_rating: round.candidate_feedback_rating,
                candidate_feedback_text: round.candidate_feedback_text,
                candidate_feedback_submitted_at: round.candidate_feedback_submitted_at,
              },
            });
          return (
            <RoundCard
              key={round.id ?? `resume-${index}`}
              round={round}
              index={index}
              bucket={bucket}
              overdue={overdue}
              isActive={isActive}
              isResumeScored={isResumeScored}
              isInterviewRound={isInterviewRound}
              hasRecordings={hasRecordings}
              canManageInterviewers={canManageInterviewers}
              roundScore={roundScore}
              roundScoreValue={roundScoreValue}
              resumeScore={resumeScore}
              consistencyScore={consistencyScore}
              when={when}
              clickable={clickable}
              onActivate={() => {
                if (onRoundClick) {
                  onRoundClick(round);
                } else if (hasRecordings) {
                  openArtifacts();
                }
              }}
              onOpenArtifacts={openArtifacts}
              onOpenInterviewers={() =>
                setInterviewersModalFor({
                  roundId: round.id,
                  roundName: roundLabel(round),
                  currentInterviewerIds: round.interviewer_ids ?? [],
                })
              }
              onRequestReschedule={
                onRequestReschedule ? () => onRequestReschedule(round) : undefined
              }
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" /> Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" /> Current stage
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-neutral-300" /> Upcoming
        </span>
        {hasFailure && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" /> Needs attention
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-8 border-t border-neutral-100 pt-4 text-sm">
        <div>
          <div className="text-xs text-neutral-400">Next step</div>
          <div className="font-semibold text-neutral-900">
            {nextRound ? roundLabel(nextRound) : 'None, pipeline complete'}
            {nextWhen && <span className="ml-1 font-normal text-neutral-500">· {nextWhen}</span>}
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-400">Rounds completed</div>
          <div className="font-semibold text-neutral-900">
            {completedCount} / {rounds.length}
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-400">Avg. score so far</div>
          <div className="font-semibold text-neutral-900">{avgScore ?? '-'}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-400">Overall standing</div>
          <Badge status={standing.status}>{standing.label}</Badge>
        </div>
      </div>

      {artifactsModalFor && (
        <RoundArtifactsModal
          open={!!artifactsModalFor}
          onClose={() => setArtifactsModalFor(null)}
          candidateId={candidateId}
          roundId={artifactsModalFor.roundId}
          roundName={artifactsModalFor.roundName}
          roundType={artifactsModalFor.roundType}
          feedback={artifactsModalFor.feedback}
        />
      )}

      {interviewersModalFor && (
        <PanelInterviewersModal
          open={!!interviewersModalFor}
          onClose={() => setInterviewersModalFor(null)}
          candidateId={candidateId}
          roundId={interviewersModalFor.roundId}
          roundName={interviewersModalFor.roundName}
          currentInterviewerIds={interviewersModalFor.currentInterviewerIds}
        />
      )}
    </div>
  );
};

export default PipelineBoard;
