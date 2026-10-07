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
  isRoundSkipped,
  normaliseRoundStatus,
  type RoundBucket,
} from './roundProgress';
import { AI_SCORE_MAX, BUCKET_META, HUMAN_SCORE_MAX } from './roundPipeline';
import {
  roundLabel,
  formatRoundStatus,
  formatCallIntent,
  formatRoundVariant,
  roundReinviteState,
  roundStatusLabel,
} from './roundDisplay';

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
  bucket,
  overdue,
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
    {
      skip: !round.interview_booking_id || !isPanelRound,
      // A calendar connecting / disconnecting shows within about 15 seconds,
      // the same cadence as the scheduling card and the picker.
      pollingInterval: 15_000,
      skipPollingIfUnfocused: true,
      refetchOnFocus: true,
    }
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
  // The candidate asked for a new time on a phone / video round: its coarse
  // status still reads Completed, so the booking's call outcome is what says so.
  // No-show from the booking too (the round's own status can lag it, and the
  // AI Video `ai_no_show` has no round-status label of its own).
  const isNoShow =
    booking?.status === 'no_show' ||
    booking?.status === 'ai_no_show' ||
    booking?.status === 'interviewer_no_show' ||
    ['no_show', 'ai_no_show', 'interviewer_no_show'].includes(normaliseRoundStatus(round.status));
  const rescheduleRequested =
    isVoiceCallRound && booking?.call_intent === 'reschedule_requested' && !isRoundSkipped(round);
  const { reinvitesUsed, maxReinvites, linkExpired } = roundReinviteState(round, booking);
  // Hiring Panel only: Online / In-person, from the job's round plan, else
  // the booking's own snapshot. AI Video's variant (soundwave/avatar) means
  // something else entirely, so it doesn't get this tag.
  const deliveryModeTag = isPanelRound
    ? formatRoundVariant(variant ?? booking?.round_snapshot?.delivery_mode)
    : null;

  // Side-bar colour = the round's state: green done, amber current stage,
  // grey upcoming, red needs attention (overdue / technical failure).
  const effectiveBucket = isResumeScored ? 'done' : bucket;
  const meta =
    (overdue || technicalFailure) && !isRoundSkipped(round)
      ? BUCKET_META.failed
      : rescheduleRequested
        ? BUCKET_META.current
        : BUCKET_META[effectiveBucket];
  const isInterviewRound = round.stage_type === 'interview';
  const roundScoreValue = roundScore?.recruiter_score ?? roundScore?.score;
  const scoreLine =
    round.stage_type === 'resume' && resumeScore !== null
      ? `Score: ${resumeScore}/${AI_SCORE_MAX}`
      : isIntakeCallRound(round) && consistencyScore !== null
        ? roundScore?.recruiter_score != null
          ? `Consistency: ${consistencyScore}/${AI_SCORE_MAX} · Recruiter: ${roundScore.recruiter_score}/${HUMAN_SCORE_MAX}`
          : `Consistency: ${consistencyScore}/${AI_SCORE_MAX}`
        : isInterviewRound && !isIntakeCallRound(round) && roundScoreValue != null
          ? roundScore?.score != null && roundScore?.recruiter_score != null
            ? `AI: ${roundScore.score}/${AI_SCORE_MAX} · Recruiter: ${roundScore.recruiter_score}/${HUMAN_SCORE_MAX}`
            : roundScore?.recruiter_score != null
              ? `Recruiter: ${roundScore.recruiter_score}/${HUMAN_SCORE_MAX}`
              : `Score: ${roundScore?.score}/${AI_SCORE_MAX} · AI score`
          : null;

  const statusText = isRoundSkipped(round)
    ? 'Skipped'
    : rescheduleRequested
      ? formatCallIntent('reschedule_requested')
      : isNoShow
        ? 'No-show'
        : overdue
          ? 'Overdue'
          : technicalFailure
            ? 'Technical Failure'
            : linkExpired && !isResumeScored
              ? 'Scheduling link expired'
              : isResumeScored
                ? 'Completed'
                : normaliseRoundStatus(round.status) === 'awaiting_resume_upload'
                  ? 'Awaiting resume upload'
                  : (roundStatusLabel(round.status) ?? formatRoundStatus(round.status));

  // Old app's round tab: centred text stack — bold name, "Status: …",
  // then score / when lines — with roomy padding and no card chrome.
  return (
    <li className="relative min-w-[210px] border-r border-gray-100 last:border-r-0 lg:min-w-0 lg:border-r-0">
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={`flex w-full flex-col items-center gap-1 px-4 py-5 text-center cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? 'bg-gray-50' : ''}`}
      >
        <span className="flex max-w-full items-center justify-center gap-1.5">
          <h3
            className={`min-w-0 truncate text-sm font-bold ${isSelected ? 'text-primary' : 'text-gray-900'}`}
            title={roundLabel(round)}
          >
            {roundLabel(round)}
          </h3>
          {deliveryModeTag && (
            <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
              {deliveryModeTag}
            </span>
          )}
        </span>
        <span className="text-xs font-medium text-gray-900">Status: {statusText}</span>
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
        {linkExpired && !isResumeScored && (
          <span className="text-xs text-gray-500">
            {reinvitesUsed} of {maxReinvites} reinvites used
          </span>
        )}
        {!overdue && technicalFailure && (
          <span className="text-xs text-danger">The call ended due to a technical issue.</span>
        )}
        {scoreLine && <span className="text-xs font-medium text-gray-900">{scoreLine}</span>}
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
        {round.duration_minutes != null && (
          <span className="text-[11px] text-gray-500">{`${round.duration_minutes} min`}</span>
        )}
      </button>
      <span className={`absolute left-0 top-0 h-full w-1 ${meta.stepBg}`} aria-hidden />
    </li>
  );
};

export default RoundSidebarItem;
