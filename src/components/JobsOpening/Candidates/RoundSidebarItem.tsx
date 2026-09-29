import { Badge } from '../../shared';
import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';
import type { CandidateInterviewScoreView } from '../../../api/candidate-service/Candidates/scoring';
import {
  useGetBookingQuery,
  useGetInterviewerCalendarStatusQuery,
} from '../../../api/interview-service/client';
import {
  isAiVideoRound,
  isAudioScreeningRound,
  isIntakeCallRound,
  isInterviewerNoShowRound,
  normaliseRoundStatus,
  type RoundBucket,
} from './roundProgress';
import { AI_SCORE_MAX, BUCKET_META, HUMAN_SCORE_MAX, formatWhen } from './roundPipeline';
import { roundLabel, formatRoundStatus } from './roundDisplay';

type RoundSidebarItemProps = {
  round: CandidateInterviewRoundView;
  index: number;
  bucket: RoundBucket;
  overdue: boolean;
  /** The round the candidate is on right now (was the old card's ring). */
  isCurrentStage: boolean;
  isSelected: boolean;
  isResumeScored: boolean;
  roundScore: CandidateInterviewScoreView | undefined;
  resumeScore: number | null;
  consistencyScore: number | null;
  onSelect: () => void;
};

// One vertical tab in the Assessment tab's round list. Carries everything the
// old PipelineBoard round card showed at a glance (step state, status badge
// incl. overdue / technical failure / calendar pending, when, duration,
// score); the card's action links (recording & transcript, interviewers,
// reschedule) live in the selected round's action row instead, so this stays
// a single clickable tab. Its own component (not inline in a `.map()`) so it
// can call per-round hooks.
const RoundSidebarItem = ({
  round,
  index,
  bucket,
  overdue,
  isCurrentStage,
  isSelected,
  isResumeScored,
  roundScore,
  resumeScore,
  consistencyScore,
  onSelect,
}: RoundSidebarItemProps) => {
  // A voice-call round's real outcome (`call_intent`) lives on its booking
  // (interview-service), not this round's coarse `status` — fetched so a
  // technical failure shows on the tab itself. Skipped for resume rounds and
  // any round with no booking yet. Same query (same arg) the round detail
  // panel uses, so RTK Query shares one request between them.
  const isVoiceCallRound =
    isIntakeCallRound(round) || isAudioScreeningRound(round) || isAiVideoRound(round);
  const isPanelRound = round.round_type === 'PANEL';
  const { data: booking } = useGetBookingQuery(round.interview_booking_id ?? '', {
    skip: !round.interview_booking_id || !(isVoiceCallRound || isPanelRound),
  });
  // A PANEL booking stays `draft` — no scheduling link, no candidate
  // notification — until every assigned interviewer has a connected
  // calendar (`try_create_panel_scheduling_link`, interview-service).
  const { data: calendarStatus } = useGetInterviewerCalendarStatusQuery(
    round.interview_booking_id ?? '',
    { skip: !round.interview_booking_id || !isPanelRound }
  );
  const missingCalendarCount =
    calendarStatus?.interviewers.filter((i) => !i.calendar_connected).length ?? 0;
  const isBlockedOnCalendar =
    isPanelRound && booking?.status === 'draft' && missingCalendarCount > 0;
  const technicalFailure = booking?.call_intent === 'technical_failure';
  const visuallyFailed = overdue || technicalFailure;
  const meta = visuallyFailed ? BUCKET_META.failed : BUCKET_META[bucket];
  // Still the 'failed' bucket, but an interviewer no-show is the company's
  // failure, not the candidate's — distinct badge color so it never reads
  // the same as a candidate no-show.
  const badgeStatus = isInterviewerNoShowRound(round) ? 'info' : meta.badgeStatus;

  const when = formatWhen(round.scheduled_at) ?? formatWhen(round.due_at);
  const isInterviewRound = round.stage_type === 'interview';
  const roundScoreValue = roundScore?.recruiter_score ?? roundScore?.score;
  const scoreLine =
    round.stage_type === 'resume' && resumeScore !== null
      ? `Score: ${resumeScore} / ${AI_SCORE_MAX}`
      : isIntakeCallRound(round) && consistencyScore !== null
        ? `Consistency: ${consistencyScore} / ${AI_SCORE_MAX}`
        : isInterviewRound && !isIntakeCallRound(round) && roundScoreValue != null
          ? roundScore?.score != null && roundScore?.recruiter_score != null
            ? `AI: ${roundScore.score} / ${AI_SCORE_MAX} · Recruiter: ${roundScore.recruiter_score} / ${HUMAN_SCORE_MAX}`
            : roundScore?.recruiter_score != null
              ? `Recruiter: ${roundScore.recruiter_score} / ${HUMAN_SCORE_MAX}`
              : `Score: ${roundScore?.score} / ${AI_SCORE_MAX} · AI score`
          : null;

  return (
    <li className="relative min-w-[210px] border-r border-gray-100 last:border-r-0 lg:min-w-0 lg:border-r-0 lg:border-b lg:last:border-b-0">
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={`flex w-full items-start gap-2.5 px-3 py-3 text-left cursor-pointer hover:bg-gray-50 ${
          isSelected ? 'bg-primary-50' : ''
        }`}
      >
        <span
          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${meta.stepBg} ${meta.stepText}`}
          aria-hidden
        >
          {visuallyFailed ? '!' : bucket === 'done' ? '✓' : index + 1}
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="flex w-full min-w-0 items-center gap-1.5">
            <span
              className={`truncate text-sm font-semibold ${isSelected ? 'text-primary' : 'text-gray-900'}`}
              title={roundLabel(round)}
            >
              {roundLabel(round)}
            </span>
            {isCurrentStage && (
              <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-px text-[10px] font-semibold uppercase text-warning">
                Current
              </span>
            )}
          </span>
          <Badge status={badgeStatus} className="max-w-full whitespace-normal text-left">
            {overdue
              ? 'Overdue'
              : technicalFailure
                ? 'Technical Failure'
                : isResumeScored
                  ? 'Completed'
                  : normaliseRoundStatus(round.status) === 'booking_created'
                    ? 'Booking created — waiting to be scheduled'
                    : normaliseRoundStatus(round.status) === 'resume_upload_expired'
                      ? 'Resume upload link expired'
                      : normaliseRoundStatus(round.status) === 'awaiting_resume_upload'
                        ? 'Awaiting resume upload'
                        : formatRoundStatus(round.status)}
          </Badge>
          {isBlockedOnCalendar && (
            <Badge status="warning" dot={false}>
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
          {(when || round.duration_minutes != null) && (
            <span className="text-xs text-gray-500">
              {[when, round.duration_minutes != null ? `${round.duration_minutes} min` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
          {scoreLine && <span className="text-xs font-semibold text-primary-600">{scoreLine}</span>}
        </span>
      </button>
      {isSelected && <span className="absolute left-0 top-0 h-full w-1 bg-primary" aria-hidden />}
    </li>
  );
};

export default RoundSidebarItem;
