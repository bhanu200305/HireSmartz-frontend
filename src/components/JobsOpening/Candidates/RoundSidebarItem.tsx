import type { BadgeStatus } from '../../shared';
import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';
import type { CandidateInterviewScoreView } from '../../../api/candidate-service/Candidates/scoring';
import {
  useGetBookingQuery,
  useGetInterviewerCalendarStatusQuery,
  useGetInterviewersCalendarStatusQuery,
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
import { roundLabel, formatRoundStatus, formatRoundVariant } from './roundDisplay';

const STATUS_TEXT_COLOR: Partial<Record<BadgeStatus, string>> = {
  success: 'text-success',
  warning: 'text-warning',
  neutral: 'text-neutral-500',
  danger: 'text-danger',
  info: 'text-info',
};

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
  /** The job round's configured variant (soundwave/avatar, online/offline). */
  variant?: string | null;
  /** For a PANEL round's picked-but-not-yet-invited interviewers' calendar
   * status (job-scoped endpoint). */
  jobId?: string;
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
  variant,
  jobId,
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
  // Before an invite exists, the picked roster (`interviewer_ids`) is
  // resolved against the job-level calendar-status endpoint instead — same
  // green/red source the interviewer picker itself colors by.
  const pickedInterviewerIds = round.interviewer_ids ?? [];
  const { data: preBookingStatus } = useGetInterviewersCalendarStatusQuery(
    { jobId: jobId ?? '', interviewerIds: pickedInterviewerIds },
    {
      skip:
        !isPanelRound ||
        Boolean(round.interview_booking_id) ||
        !jobId ||
        pickedInterviewerIds.length === 0,
    }
  );
  const panelInterviewers = isPanelRound
    ? round.interview_booking_id
      ? (calendarStatus?.interviewers ?? [])
      : (preBookingStatus ?? [])
    : [];
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

  const statusText = overdue
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
              : formatRoundStatus(round.status);
  // Legend colours (Completed / Current stage / Upcoming / Needs attention)
  // carried onto the status text itself; interviewer no-show stays blue.
  const statusColor = STATUS_TEXT_COLOR[badgeStatus] ?? 'text-neutral-500';

  // Old app's round tab: centred text stack — bold name, "Status: …",
  // then score / when lines — with roomy padding and no card chrome.
  return (
    <li className="relative min-w-[210px] border-r border-gray-100 last:border-r-0 lg:min-w-0 lg:border-r-0">
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={`flex w-full flex-col items-center gap-1 px-4 py-4 text-center cursor-pointer transition-colors hover:bg-gray-50 ${
          isSelected ? 'bg-primary-50/60' : ''
        }`}
      >
        <span className="flex max-w-full items-center justify-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.stepBg} ${
              isCurrentStage ? 'ring-2 ring-warning/30 ring-offset-1' : ''
            }`}
            title={
              visuallyFailed
                ? 'Needs Attention'
                : bucket === 'done'
                  ? 'Completed'
                  : isCurrentStage
                    ? 'Current Stage'
                    : `Step ${index + 1}`
            }
            aria-hidden
          />
          <span
            className={`truncate text-sm font-semibold ${isSelected ? 'text-primary' : 'text-gray-900'}`}
            title={roundLabel(round)}
          >
            {roundLabel(round)}
          </span>
        </span>
        {formatRoundVariant(variant) && (
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
            {formatRoundVariant(variant)}
          </span>
        )}
        <span className="text-xs text-gray-800">
          Status: <span className={`font-semibold ${statusColor}`}>{statusText}</span>
        </span>
        {isBlockedOnCalendar && (
          <span className="text-xs font-semibold text-warning-text">
            {`Calendar pending (${missingCalendarCount})`}
          </span>
        )}
        {overdue && (
          <span className="text-xs text-danger">
            No update since the scheduled time; may not have gone through.
          </span>
        )}
        {!overdue && technicalFailure && (
          <span className="text-xs text-danger">The call ended due to a technical issue.</span>
        )}
        {scoreLine && <span className="text-xs text-gray-800">{scoreLine}</span>}
        {panelInterviewers.length > 0 && (
          // Picked panel interviewers, same colors as the picker's chips:
          // green = calendar connected, red = not connected.
          <span className="mt-1 flex max-w-full flex-wrap justify-center gap-1">
            {panelInterviewers.map((interviewer) => (
              <span
                key={interviewer.interviewer_id}
                title={`${interviewer.display_name || interviewer.email || 'Interviewer'} — calendar ${
                  interviewer.calendar_connected ? 'connected' : 'not connected'
                }`}
                className={`inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[11px] ${
                  interviewer.calendar_connected
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    interviewer.calendar_connected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  aria-hidden
                />
                <span className="truncate">
                  {interviewer.display_name || interviewer.email || 'Interviewer'}
                </span>
              </span>
            ))}
          </span>
        )}
        {(when || round.duration_minutes != null) && (
          <span className="text-xs text-gray-500">
            {[when, round.duration_minutes != null ? `${round.duration_minutes} min` : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </button>
      {isSelected && <span className="absolute left-0 top-0 h-full w-1 bg-primary" aria-hidden />}
    </li>
  );
};

export default RoundSidebarItem;
