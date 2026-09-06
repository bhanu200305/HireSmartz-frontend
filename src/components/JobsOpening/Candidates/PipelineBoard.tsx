import { useState } from 'react';
import dayjs from 'dayjs';
import { Badge, Button, showToast, type BadgeStatus } from '../../shared';
import {
  useSendRoundInviteMutation,
  type CandidateInterviewRoundView,
} from '../../../api/candidate-service/Candidates/interviewRounds';
import type { CandidateInterviewScoreView } from '../../../api/candidate-service/Candidates/scoring';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';
import { bucketForStatus, resolveCurrentRound, type RoundBucket } from './roundProgress';
import SkipRoundModal from './Modal/SkipRoundModal';
import RoundArtifactsModal from './Modal/RoundArtifactsModal';
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
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [artifactsModalFor, setArtifactsModalFor] = useState<{
    roundId: string;
    roundName: string;
  } | null>(null);
  const [sendRoundInvite, { isLoading: isSendingInvite }] = useSendRoundInviteMutation();
  if (rounds.length === 0) {
    return <p className="text-sm text-gray-500">No round plan yet.</p>;
  }

  const buckets = rounds.map((r) => bucketForStatus(r.status));
  const hasFailure = buckets.includes('failed');
  const allDone = buckets.every((b) => b === 'done');

  // The round ADVANCE would actually complete next / SEND INVITE would
  // actually announce — NOT just "the first card whose status reads
  // pending": an instant-call candidate with no resume yet has a resume
  // card sitting there with status `to_be_scheduled` same as a real
  // pending round, but it's inert (`due_at === null`) and neither action
  // can touch it. See `roundProgress.ts`'s own docstring.
  const nextRound = resolveCurrentRound(rounds);
  const activeIndex = nextRound ? rounds.findIndex((r) => r.id === nextRound.id) : -1;
  const nextWhen = nextRound
    ? (formatWhen(nextRound.scheduled_at) ?? formatWhen(nextRound.due_at))
    : null;
  const nextIsResumeAwaitingAdvance =
    nextRound?.stage_type === 'resume' &&
    buckets[activeIndex] === 'pending' &&
    resumeScore !== null;
  // Send Invite / Skip Round only ever apply to a real interview round —
  // send_round_invite.py/skip_interview_round.py both explicitly refuse the
  // resume stage (ResumeStageHasNoInviteError / the same guard on skip), so
  // the resume stage only ever gets the Advance hint above, never these.
  const nextIsInterviewRound = nextRound?.stage_type === 'interview';
  const nextRoundAlreadyBooked = !!nextRound?.interview_booking_id;

  const handleSendInvite = async () => {
    try {
      const result = await sendRoundInvite(candidateId).unwrap();
      showToast({
        message: result.invite_sent
          ? `Invite sent for ${result.round.round_name}.`
          : 'Invite already sent moments ago — not sent again.',
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

  const completedCount = buckets.filter((b) => b === 'done').length;

  const standing: { status: BadgeStatus; label: string } = hasFailure
    ? { status: 'danger', label: 'Needs attention' }
    : allDone
      ? { status: 'success', label: 'Complete' }
      : { status: 'info', label: 'On track' };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {rounds.map((round, index) => {
          const bucket = buckets[index];
          const meta = BUCKET_META[bucket];
          const when = formatWhen(round.scheduled_at) ?? formatWhen(round.due_at);
          const isActive = index === activeIndex;
          // The resume stage's own status never flips off "to_be_scheduled" /
          // "pending" on its own — record_resume_score.py only ever writes
          // the candidate's resume_score/skills/location, never this round's
          // status; only an explicit Advance (advance_candidate.py) marks it
          // complete. So a score already sitting here means "reviewed and
          // ready to move on," not "waiting on a booking" — the generic
          // status label reads as the latter, so it's swapped out below.
          const isResumeAwaitingAdvance =
            round.stage_type === 'resume' && bucket === 'pending' && resumeScore !== null;
          // Recordings/transcripts only ever exist for a real interview
          // round (there's nothing for the synthetic resume stage to
          // record) — the artifacts endpoint keys off this round row's own
          // `id`, which is only ever null-shaped conceptually for the
          // resume stage, so gate the click on stage_type rather than id.
          const isInterviewRound = round.stage_type === 'interview';
          return (
            <div
              key={round.id ?? `resume-${index}`}
              role={onRoundClick || isInterviewRound ? 'button' : undefined}
              tabIndex={onRoundClick || isInterviewRound ? 0 : undefined}
              onClick={() => {
                if (onRoundClick) {
                  onRoundClick(round);
                } else if (isInterviewRound) {
                  setArtifactsModalFor({ roundId: round.id, roundName: roundLabel(round) });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  if (onRoundClick) {
                    event.preventDefault();
                    onRoundClick(round);
                  } else if (isInterviewRound) {
                    event.preventDefault();
                    setArtifactsModalFor({ roundId: round.id, roundName: roundLabel(round) });
                  }
                }
              }}
              className={`w-56 shrink-0 rounded-xl border border-neutral-200 border-t-4 bg-white shadow-xs ${meta.border} ${
                isActive ? 'ring-2 ring-warning/40' : ''
              } ${onRoundClick || isInterviewRound ? 'cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30' : ''}`}
            >
              <div className="flex items-center gap-2 px-3.5 pt-3">
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${meta.stepBg} ${meta.stepText}`}
                >
                  {bucket === 'done' ? '✓' : index + 1}
                </span>
                <span
                  className="truncate text-sm font-semibold text-neutral-900"
                  title={roundLabel(round)}
                >
                  {roundLabel(round)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 px-3.5 pb-3.5 pt-2.5">
                <Badge
                  status={isResumeAwaitingAdvance ? 'info' : meta.badgeStatus}
                  className="w-fit"
                >
                  {isResumeAwaitingAdvance ? 'Score ready' : formatRoundStatus(round.status)}
                </Badge>
                {when && <span className="text-xs text-neutral-500">{when}</span>}
                {round.duration_minutes != null && (
                  <span className="text-xs text-neutral-400">{round.duration_minutes} min</span>
                )}
                {round.stage_type === 'resume' && resumeScore !== null && (
                  <span className="text-xs font-semibold text-primary-600">
                    Score: {resumeScore}
                  </span>
                )}
                {isResumeAwaitingAdvance && (
                  <span className="text-xs text-neutral-500">Awaiting Advance to move on</span>
                )}
                {isInterviewRound && (
                  <button
                    type="button"
                    className="w-fit text-xs font-medium text-primary-600 hover:underline"
                    onClick={(event) => {
                      // Independent of the card's own click (which now opens
                      // the round-detail drill-down) — stop it from also
                      // firing onRoundClick.
                      event.stopPropagation();
                      setArtifactsModalFor({ roundId: round.id, roundName: roundLabel(round) });
                    }}
                  >
                    View recordings ›
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
            {nextRound ? roundLabel(nextRound) : 'None — pipeline complete'}
            {nextIsResumeAwaitingAdvance ? (
              <span className="ml-1 font-normal text-neutral-500">· click Advance</span>
            ) : (
              nextWhen && <span className="ml-1 font-normal text-neutral-500">· {nextWhen}</span>
            )}
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
              <Button
                type="button"
                onClick={() => setIsSkipModalOpen(true)}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                SKIP ROUND
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
          <div className="font-semibold text-neutral-900">{avgScore ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-400">Overall standing</div>
          <Badge status={standing.status}>{standing.label}</Badge>
        </div>
      </div>

      {nextRound && nextIsInterviewRound && (
        <SkipRoundModal
          open={isSkipModalOpen}
          onClose={() => setIsSkipModalOpen(false)}
          candidateId={candidateId}
          roundName={roundLabel(nextRound)}
          onSuccess={() => setIsSkipModalOpen(false)}
        />
      )}

      {artifactsModalFor && (
        <RoundArtifactsModal
          open={!!artifactsModalFor}
          onClose={() => setArtifactsModalFor(null)}
          candidateId={candidateId}
          roundId={artifactsModalFor.roundId}
          roundName={artifactsModalFor.roundName}
        />
      )}
    </div>
  );
};

export default PipelineBoard;
