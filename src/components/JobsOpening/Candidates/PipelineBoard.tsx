import { useState } from 'react';
import dayjs from 'dayjs';
import { Badge, Button, showToast, type BadgeStatus } from '../../shared';
import {
  useSendRoundInviteMutation,
  type CandidateInterviewRoundView,
} from '../../../api/candidate-service/Candidates/interviewRounds';
import type { CandidateInterviewScoreView } from '../../../api/candidate-service/Candidates/scoring';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';
import {
  bucketForStatus,
  isOverdue,
  isRoundConcluded,
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

type PipelineBoardProps = {
  rounds: CandidateInterviewRoundView[];
  scores: CandidateInterviewScoreView[];
  resumeScore: number | null;
  candidateId: string;
  onRoundClick?: (round: CandidateInterviewRoundView) => void;
};

const PipelineBoard = ({
  rounds,
  scores,
  resumeScore,
  candidateId,
  onRoundClick,
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
  const [sendRoundInvite, { isLoading: isSendingInvite }] = useSendRoundInviteMutation();
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

  // The round ADVANCE would actually complete next / SEND INVITE would
  // actually announce — NOT just "the first card whose status reads
  // pending": an instant-call candidate with no resume yet has a resume
  // card sitting there with status `to_be_scheduled` same as a real
  // pending round, but it's inert (`due_at === null`) and neither action
  // can touch it. See `roundProgress.ts`'s own docstring.
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
  // Send Invite only ever applies to a real interview round —
  // send_round_invite.py refuses the resume stage (ResumeStageHasNoInviteError).
  const nextIsInterviewRound = nextRound?.stage_type === 'interview';
  const nextRoundAlreadyBooked = !!nextRound?.interview_booking_id;

  const handleSendInvite = async () => {
    try {
      const result = await sendRoundInvite(candidateId).unwrap();
      showToast({
        message: result.invite_sent
          ? `Invite sent for ${result.round.round_name}.`
          : 'Invite already sent moments ago; not sent again.',
        type: result.invite_sent ? 'success' : 'info',
      });
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not send invite'), type: 'error' });
    }
  };

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
          // Borrows the 'failed' bucket's danger styling — an overdue round
          // is exactly as actionable as a real failure, it's just inferred
          // from timing rather than reported by the backend (see
          // `isOverdue`'s docstring).
          const meta = overdue ? BUCKET_META.failed : BUCKET_META[bucket];
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
          // Recordings and the transcript only exist once the call has
          // actually happened — hide the "View recordings" entry point until
          // the round is completed, so it isn't offered for a round that's
          // still to_be_scheduled / scheduled / in progress.
          const hasRecordings = isInterviewRound && bucketForStatus(round.status) === 'done';
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
          return (
            <div
              key={round.id ?? `resume-${index}`}
              role={onRoundClick || hasRecordings ? 'button' : undefined}
              tabIndex={onRoundClick || hasRecordings ? 0 : undefined}
              onClick={() => {
                if (onRoundClick) {
                  onRoundClick(round);
                } else if (hasRecordings) {
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
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  if (onRoundClick) {
                    event.preventDefault();
                    onRoundClick(round);
                  } else if (hasRecordings) {
                    event.preventDefault();
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
                  }
                }
              }}
              className={`w-56 shrink-0 rounded-xl border border-neutral-200 border-t-4 bg-white shadow-xs ${meta.border} ${
                isActive ? 'ring-2 ring-warning/40' : ''
              } ${onRoundClick || hasRecordings ? 'cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30' : ''}`}
            >
              <div className="flex items-center gap-2 px-3.5 pt-3">
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${meta.stepBg} ${meta.stepText}`}
                >
                  {overdue ? '!' : bucket === 'done' ? '✓' : index + 1}
                </span>
                <span
                  className="truncate text-sm font-semibold text-neutral-900"
                  title={roundLabel(round)}
                >
                  {roundLabel(round)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 px-3.5 pb-3.5 pt-2.5">
                <Badge status={meta.badgeStatus} className="w-fit">
                  {overdue
                    ? 'Overdue'
                    : isResumeScored
                      ? 'Completed'
                      : formatRoundStatus(round.status)}
                </Badge>
                {overdue && (
                  <span className="text-xs text-danger">
                    No update since the scheduled time; may not have gone through.
                  </span>
                )}
                {when && <span className="text-xs text-neutral-500">{when}</span>}
                {round.duration_minutes != null && (
                  <span className="text-xs text-neutral-400">{round.duration_minutes} min</span>
                )}
                {round.stage_type === 'resume' && resumeScore !== null && (
                  <span className="text-xs font-semibold text-primary-600">
                    Score: {resumeScore}
                  </span>
                )}
                {isInterviewRound && roundScoreValue != null && (
                  <span className="text-xs font-semibold text-primary-600">
                    {roundScore?.recruiter_score != null
                      ? `Score: ${roundScoreValue} / 5`
                      : `Score: ${roundScoreValue} / 100 · AI score`}
                  </span>
                )}
                {hasRecordings && (
                  <button
                    type="button"
                    className="w-fit text-xs font-medium text-primary-600 hover:underline"
                    onClick={(event) => {
                      // Independent of the card's own click (which now opens
                      // the round-detail drill-down) — stop it from also
                      // firing onRoundClick.
                      event.stopPropagation();
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
                    }}
                  >
                    View recording &amp; transcript ›
                  </button>
                )}
                {canManageInterviewers && (
                  <button
                    type="button"
                    className="w-fit text-xs font-medium text-primary-600 hover:underline"
                    onClick={(event) => {
                      event.stopPropagation();
                      setInterviewersModalFor({
                        roundId: round.id,
                        roundName: roundLabel(round),
                        currentInterviewerIds: round.interviewer_ids,
                      });
                    }}
                  >
                    {round.interviewer_ids.length > 0
                      ? `Interviewers (${round.interviewer_ids.length}) ›`
                      : 'Set interviewers ›'}
                  </button>
                )}
              </div>
            </div>
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
          {nextIsInterviewRound && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleSendInvite()}
                disabled={isSendingInvite || nextRoundAlreadyBooked}
                title={nextRoundAlreadyBooked ? 'This round already has a booking' : undefined}
                className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSendingInvite ? 'Sending…' : 'SEND INVITE'}
              </Button>
            </div>
          )}
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
