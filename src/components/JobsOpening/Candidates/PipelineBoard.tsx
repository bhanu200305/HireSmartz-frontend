import dayjs from 'dayjs';
import { Badge, type BadgeStatus } from '../../shared';
import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';
import type { CandidateInterviewScoreView } from '../../../api/candidate-service/Candidates/scoring';

// Renders `CandidateDetails`' Pipeline tab as a horizontal, Gantt-style step
// board (one column per round, done/current/upcoming styling) instead of the
// previous flat list of rows — same data, same two queries this replaces
// (`useListCandidateInterviewRoundsQuery` / `useListCandidateInterviewScoresQuery`
// in CandidateDetails.tsx), nothing new fetched and no new mutations. Every
// figure below (avg score, rounds completed, standing) is derived client-side
// from those two arrays; no backend field carries them today.

type RoundBucket = 'done' | 'current' | 'pending' | 'failed';

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

const bucketForStatus = (status: string): RoundBucket => {
  const key = status
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
  return ROUND_STATUS_BUCKET[key] ?? 'pending';
};

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

const roundLabel = (round: CandidateInterviewRoundView) =>
  round.stage_type === 'resume' ? 'Resume Screening' : round.round_name || 'Round';

const statusLabel = (status: string) =>
  status
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';

type PipelineBoardProps = {
  rounds: CandidateInterviewRoundView[];
  scores: CandidateInterviewScoreView[];
  resumeScore: number | null;
};

const PipelineBoard = ({ rounds, scores, resumeScore }: PipelineBoardProps) => {
  if (rounds.length === 0) {
    return <p className="text-sm text-gray-500">No round plan yet.</p>;
  }

  const buckets = rounds.map((r) => bucketForStatus(r.status));
  const currentIndex = buckets.findIndex((b) => b === 'current');
  const firstPendingIndex = buckets.findIndex((b) => b === 'pending');
  const hasFailure = buckets.includes('failed');
  const allDone = buckets.every((b) => b === 'done');

  const activeIndex = currentIndex !== -1 ? currentIndex : firstPendingIndex;
  const nextRound = activeIndex !== -1 ? rounds[activeIndex] : null;
  const nextWhen = nextRound
    ? (formatWhen(nextRound.scheduled_at) ?? formatWhen(nextRound.due_at))
    : null;
  const nextIsResumeAwaitingAdvance =
    nextRound?.stage_type === 'resume' &&
    buckets[activeIndex] === 'pending' &&
    resumeScore !== null;

  const scoreValues = [resumeScore, ...scores.map((s) => s.recruiter_score ?? s.ai_score)].filter(
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
          return (
            <div
              key={round.id ?? `resume-${index}`}
              className={`w-56 shrink-0 rounded-xl border border-neutral-200 border-t-4 bg-white shadow-xs ${meta.border} ${
                isActive ? 'ring-2 ring-warning/40' : ''
              }`}
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
                  {isResumeAwaitingAdvance ? 'Score ready' : statusLabel(round.status)}
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

      <div className="flex flex-wrap gap-8 border-t border-neutral-100 pt-4 text-sm">
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
    </div>
  );
};

export default PipelineBoard;
