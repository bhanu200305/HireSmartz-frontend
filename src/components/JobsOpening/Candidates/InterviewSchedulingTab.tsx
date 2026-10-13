import dayjs from 'dayjs';
import { Tooltip } from 'antd';
import { LuCalendarDays, LuClock } from 'react-icons/lu';
import { Button } from '../../shared';
import {
  useListEligibleInterviewersQuery,
  type CandidateInterviewRoundView,
} from '../../../api/candidate-service/Candidates/interviewRounds';
import type { CandidateInterviewScoreView } from '../../../api/candidate-service/Candidates/scoring';
import {
  useGetBookingQuery,
  useGetInterviewerCalendarStatusQuery,
  useGetInterviewersCalendarStatusQuery,
  CONCLUDED_BOOKING_STATUSES,
} from '../../../api/interview-service/client';
import { roundLabel, roundReinviteState } from './roundDisplay';
import {
  isAiVideoRound,
  isAudioScreeningRound,
  isIdentityVerificationRound,
  isIntakeCallRound,
  isResumeStageRound,
  isRoundSkipped,
  normaliseRoundStatus,
} from './roundProgress';
import { canManageRoundInterviewers, findRoundScore } from './roundPipeline';
import { phoneIssueBlocksRoundInvite, PHONE_BLOCKED_INVITE_MESSAGE } from './phoneNumberIssue';
import type { PhoneNumberIssue } from '../../../api/candidate-service/Candidates/CandidateLifecycle';

// "Interview Scheduling" tab: one card per interview round (the resume stage
// has no interview to schedule), laid out like the old app's Round Overview.
// Everything about getting a round scheduled lives here: the first Invite,
// Re-invite (with the attempts still left), Reschedule and Skip. The actions
// themselves run in CandidateDetails (they share its modals); this file only
// decides what each card shows and which buttons are live.

type CardStatus =
  | 'NOT INVITED'
  | 'INVITATION SENT'
  | 'SCHEDULED'
  | 'ONGOING'
  | 'RESCHEDULED'
  | 'RESCHEDULE REQUESTED'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'NO-SHOW';

const HEADER_STYLE: Record<CardStatus, { bg: string; text: string }> = {
  'NOT INVITED': { bg: 'bg-red-100', text: 'text-red-700' },
  'INVITATION SENT': { bg: 'bg-gray-100', text: 'text-gray-700' },
  SCHEDULED: { bg: 'bg-primary-100', text: 'text-primary-700' },
  ONGOING: { bg: 'bg-primary-100', text: 'text-primary-700' },
  RESCHEDULED: { bg: 'bg-gray-100', text: 'text-gray-700' },
  // The candidate asked for a new time (nothing has been rebooked yet): needs
  // attention without being alarm-red like NO-SHOW / CANCELLED.
  'RESCHEDULE REQUESTED': { bg: 'bg-amber-100', text: 'text-amber-700' },
  COMPLETED: { bg: 'bg-primary-100', text: 'text-primary-700' },
  SKIPPED: { bg: 'bg-red-100', text: 'text-red-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
  'NO-SHOW': { bg: 'bg-red-100', text: 'text-red-700' },
};

/** `InterviewBooking.cancellation_reason` interview-service sets when a
 * scheduling link expires unused (`LINK_EXPIRED_REASON`). */
const LINK_EXPIRED_REASON = 'scheduling link expired unused';

const formatDate = (iso: string) => dayjs(iso).format('MMM DD, YYYY');
const formatTime = (iso: string) => dayjs(iso).format('hh:mm A');

const cardStatusFor = (round: CandidateInterviewRoundView): CardStatus => {
  if (isRoundSkipped(round)) return 'SKIPPED';
  switch (normaliseRoundStatus(round.status)) {
    case 'completed':
      return 'COMPLETED';
    case 'skipped':
      return 'SKIPPED';
    case 'in_progress':
      return 'ONGOING';
    case 'rescheduled':
      return 'RESCHEDULED';
    case 'scheduled':
      return round.scheduled_at ? 'SCHEDULED' : 'INVITATION SENT';
    case 'booking_created':
      return 'INVITATION SENT';
    case 'cancelled':
    case 'aborted':
      return 'CANCELLED';
    case 'no_show':
    case 'ai_no_show':
    case 'interviewer_no_show':
      return 'NO-SHOW';
    default:
      // to_be_scheduled / pending: invited (automatically with Advance, or
      // by hand) or not at all.
      return round.invite_sent_at || round.interview_booking_id ? 'INVITATION SENT' : 'NOT INVITED';
  }
};

export type InterviewSchedulingTabProps = {
  candidateId: string;
  rounds: CandidateInterviewRoundView[];
  roundsLoaded: boolean;
  scores: CandidateInterviewScoreView[];
  /** The round Advance would complete next (`resolveCurrentRound`). */
  currentRoundId: string | null;
  /** Candidate already selected / rejected / withdrawn: nothing to schedule. */
  isTerminal: boolean;
  /** The candidate was already selected elsewhere (bookings refused). */
  bookingsClosed: boolean;
  /** The candidate's phone can't be dialed: Intake Call / Audio Screening
   * invites are refused by candidate-service. */
  phoneNumberIssue?: PhoneNumberIssue | null;
  /** A booking / reinvite / reschedule request is in flight. */
  isBusy: boolean;
  onInvite: (round: CandidateInterviewRoundView) => void;
  onReinvite: (round: CandidateInterviewRoundView) => void;
  /** Opens the panel picker (Hiring Panel rounds, before any booking). */
  onSelectInterviewers: (round: CandidateInterviewRoundView) => void;
  /** The job, for the pre-booking calendar status of a selected panel. */
  jobId?: string;
  onReschedule: (round: CandidateInterviewRoundView) => void;
  /** Only the job's hiring managers and recruiters may skip a round. */
  canSkip: boolean;
  onSkip: () => void;
  onReject: () => void;
  onSubmitFeedback: (
    round: CandidateInterviewRoundView,
    score: CandidateInterviewScoreView
  ) => void;
};

const actionButton =
  'w-full rounded-full px-4 py-2.5 text-center text-sm font-semibold uppercase disabled:cursor-not-allowed disabled:opacity-50';

type RoundCardProps = Omit<
  InterviewSchedulingTabProps,
  'rounds' | 'roundsLoaded' | 'candidateId'
> & {
  round: CandidateInterviewRoundView;
  interviewers: { id: string; name: string }[];
};

const RoundCard = ({
  round,
  interviewers,
  jobId,
  onSelectInterviewers,
  scores,
  currentRoundId,
  isTerminal,
  bookingsClosed,
  phoneNumberIssue,
  isBusy,
  onInvite,
  onReinvite,
  onReschedule,
  canSkip: mayManage,
  onSkip,
  onReject,
  onSubmitFeedback,
}: RoundCardProps) => {
  const bookingId = round.interview_booking_id;
  const { data: booking } = useGetBookingQuery(bookingId ?? '', {
    skip: !bookingId,
    pollingInterval: 20_000,
    skipPollingIfUnfocused: true,
  });

  const isPanel = round.round_type === 'PANEL';
  // Green / red dot per panel interviewer: the booking's own calendar status
  // once one exists, otherwise the job-level status the picker colours by.
  // Polled and refetched on focus like the picker, so a calendar connecting
  // or disconnecting shows up here within about 15 seconds.
  const rosterIds = interviewers.map((i) => i.id);
  const { data: bookingCalendar } = useGetInterviewerCalendarStatusQuery(bookingId ?? '', {
    skip: !isPanel || !bookingId,
    pollingInterval: 15_000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
  });
  const { data: jobCalendar } = useGetInterviewersCalendarStatusQuery(
    { jobId: jobId ?? '', interviewerIds: rosterIds },
    {
      skip: !isPanel || Boolean(bookingId) || !jobId || rosterIds.length === 0,
      pollingInterval: 15_000,
      skipPollingIfUnfocused: true,
      refetchOnFocus: true,
    }
  );
  const calendarConnectedById = new Map<string, boolean>(
    bookingId
      ? (bookingCalendar?.interviewers ?? []).map((i) => [i.interviewer_id, i.calendar_connected])
      : (jobCalendar ?? []).map((i) => [i.interviewer_id, i.calendar_connected])
  );
  const calendarsPending = interviewers.filter(
    (i) => calendarConnectedById.get(i.id) === false
  ).length;
  const isVoiceCall =
    isIntakeCallRound(round) || isAudioScreeningRound(round) || isAiVideoRound(round);
  // Phone / video rounds only (a panel round has no call outcome): a candidate
  // who asked to reschedule gets its own badge instead of a plain Completed.
  // A no-show is read from the booking too: the round's own status can lag it
  // (a skipped round stays Skipped either way, via `cardStatusFor`).
  const bookingNoShow =
    booking?.status === 'no_show' ||
    booking?.status === 'ai_no_show' ||
    booking?.status === 'interviewer_no_show';
  const status: CardStatus = isRoundSkipped(round)
    ? cardStatusFor(round)
    : isVoiceCall && booking?.call_intent === 'reschedule_requested'
      ? 'RESCHEDULE REQUESTED'
      : bookingNoShow
        ? 'NO-SHOW'
        : cardStatusFor(round);
  const header = HEADER_STYLE[status];
  const isCurrent = currentRoundId === round.id && !isTerminal;
  const score = findRoundScore(scores, round);

  const invitedAt = round.invite_sent_at ?? booking?.created_at ?? null;
  const reinviteState = roundReinviteState(round, booking);
  const linkExpired = Boolean(bookingId) && reinviteState.linkExpired;
  const reinvitesUsed = reinviteState.reinvitesUsed;
  const maxReinvites = reinviteState.maxReinvites;
  const reinvitesLeft = Math.max(0, maxReinvites - reinvitesUsed);
  const reinvitesExhausted = reinvitesLeft === 0;

  // First invite: only for a round that has BECOME DUE (`to_be_scheduled`:
  // the candidate was advanced to it, or it is the first round) and has no
  // invite yet. A round not reached yet (`pending`) never gets an Invite
  // button. If Advance's "send invite" box was ticked the invite already
  // went out (`invite_sent_at` set), so this only appears when it was left
  // unticked.
  const canInvite =
    isCurrent &&
    normaliseRoundStatus(round.status) === 'to_be_scheduled' &&
    status === 'NOT INVITED' &&
    !bookingId &&
    !isIdentityVerificationRound(round);
  // Intake Call / Audio Screening phone the candidate; a flagged number makes
  // candidate-service refuse the invite, so it's disabled up front.
  const isPhoneBlocked = phoneIssueBlocksRoundInvite(phoneNumberIssue, round);
  // Invitation sent but not booked = its link is still unused, which is all
  // POST /bookings/{id}/reinvite needs now (no longer gated on expiry).
  // interview-service's reinvite rule (`reinvite_expired_booking.py`): only a
  // booking whose link is still UNUSED can be reinvited: still `draft`, or
  // `cancelled` because the link expired. A booking the candidate has booked
  // (`scheduled`) or any other state is refused (REINVITE_NOT_ELIGIBLE), so
  // the button is hidden for those rather than offered and rejected.
  // interview-service accepts a reschedule once a call has an outcome recorded
  // (`call_intent`, set for every concluded result: completed, no-show,
  // asked to reschedule...), or for a panel booking that has concluded or is
  // still scheduled for a future time. A Completed card is therefore not
  // excluded.
  const canReschedule =
    !isTerminal &&
    Boolean(bookingId) &&
    status !== 'SKIPPED' &&
    // `call_intent` is set for every concluded call outcome. 'completed'
    // means the call went fine, so there is nothing to offer a new time for.
    ((isVoiceCall && booking?.call_intent != null && booking.call_intent !== 'completed') ||
      (isPanel &&
        booking != null &&
        (booking.status === 'scheduled' || CONCLUDED_BOOKING_STATUSES.includes(booking.status))));
  const bookingLoading = Boolean(bookingId) && !booking;
  const reinviteEligible =
    booking != null &&
    (booking.status === 'draft' ||
      (booking.status === 'cancelled' && booking.cancellation_reason === LINK_EXPIRED_REASON));
  // A booking cancelled only because its link expired unused is still a
  // Re-invite case (never Reschedule), whatever status the round itself reads.
  const linkExpiredCancelled =
    booking?.status === 'cancelled' && booking.cancellation_reason === LINK_EXPIRED_REASON;
  const showReinvite =
    !isTerminal &&
    status !== 'SKIPPED' &&
    ((status === 'INVITATION SENT' && (!bookingId || bookingLoading || reinviteEligible)) ||
      linkExpiredCancelled);
  // The backend only skips the candidate's current round.
  const canSkip = isCurrent && status !== 'COMPLETED' && status !== 'SKIPPED';
  const skipBlockedMessage =
    'Only the hiring manager or a recruiter on this job, or a company admin, can advance or skip a candidate.';
  const canGiveFeedback = status === 'COMPLETED' && !isTerminal && Boolean(score);

  const reinviteTooltip = bookingsClosed
    ? 'This candidate has already been selected.'
    : !bookingId
      ? 'The invitation is being set up. Re-invite is available once it is created.'
      : bookingLoading
        ? 'Checking the invitation…'
        : reinvitesExhausted
          ? `Reinvite limit reached (${maxReinvites} of ${maxReinvites}).`
          : `Send a new invitation link (${reinvitesLeft} of ${maxReinvites} left)`;

  const statusLabel = <span className={`text-xs font-semibold ${header.text}`}>{status}</span>;

  return (
    <div className="flex h-full min-h-[300px] min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className={`flex items-center justify-between gap-2 px-5 py-3 ${header.bg}`}>
        <h4 className="min-w-0 flex-1 truncate text-base font-semibold text-black">
          {roundLabel(round)}
        </h4>
        <div className="flex shrink-0 items-center gap-2">
          {status === 'SKIPPED' && round.skip_reason ? (
            <Tooltip title={round.skip_reason}>{statusLabel}</Tooltip>
          ) : (
            statusLabel
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {round.scheduled_at && status !== 'SKIPPED' ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center text-sm text-gray-600">
              <LuCalendarDays size={16} className="mr-2" aria-hidden />
              <span>Scheduled on {formatDate(round.scheduled_at)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <LuClock size={16} className="mr-2" aria-hidden />
              <span>At {formatTime(round.scheduled_at)}</span>
            </div>
          </div>
        ) : status === 'INVITATION SENT' && invitedAt ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center text-sm text-gray-600">
              <LuCalendarDays size={16} className="mr-2" aria-hidden />
              <span>Invitation sent on {formatDate(invitedAt)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <LuClock size={16} className="mr-2" aria-hidden />
              <span>
                At {formatTime(invitedAt)}
                {reinvitesUsed > 0 && ` · Reinvited ${reinvitesUsed}/${maxReinvites}`}
              </span>
              {bookingId && (
                <Tooltip
                  title={
                    linkExpired ? 'Invitation link expired' : 'Invitation link is active and valid'
                  }
                >
                  <span
                    className={`ml-2 inline-block h-2.5 w-2.5 rounded-full ${
                      linkExpired ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                </Tooltip>
              )}
            </div>
          </div>
        ) : status === 'SKIPPED' ? (
          <p className="text-sm text-gray-500">This interview stage has been skipped.</p>
        ) : null}

        {interviewers.length > 0 && status !== 'SKIPPED' && (
          <div className="text-sm text-black">
            <span className="font-bold">Interviewer(s):</span>{' '}
            {interviewers.map((interviewer, index) => {
              const connected = calendarConnectedById.get(interviewer.id);
              return (
                <span key={interviewer.id}>
                  {index > 0 && ' | '}
                  {isPanel && (
                    <Tooltip
                      title={
                        connected === undefined
                          ? 'Calendar status not loaded yet'
                          : connected
                            ? 'Calendar connected'
                            : 'Calendar not connected'
                      }
                    >
                      <span
                        className={`mr-1 inline-block h-2 w-2 rounded-full align-middle ${
                          connected === undefined
                            ? 'bg-gray-300'
                            : connected
                              ? 'bg-green-500'
                              : 'bg-red-500'
                        }`}
                      />
                    </Tooltip>
                  )}
                  {interviewer.name}
                </span>
              );
            })}
          </div>
        )}
        {isPanel && Boolean(bookingId) && booking?.status === 'draft' && calendarsPending > 0 && (
          <p className="text-xs font-semibold text-amber-700">
            Calendar pending ({calendarsPending}): the candidate is emailed once every interviewer
            has connected.
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2">
          {/* Only until a panel is picked: changing an existing panel happens
              in the Re-invite / Reschedule popup ("Choose Different
              Interviewers"), not from a standalone button. */}
          {isPanel &&
            canManageRoundInterviewers(round) &&
            mayManage &&
            interviewers.length === 0 && (
              <Button
                type="button"
                className={`${actionButton} border border-primary text-primary`}
                disabled={isBusy || bookingsClosed}
                onClick={() => onSelectInterviewers(round)}
              >
                Select Interviewers
              </Button>
            )}

          {canInvite && (
            <Tooltip
              title={
                bookingsClosed
                  ? 'This candidate has already been selected.'
                  : isPhoneBlocked
                    ? PHONE_BLOCKED_INVITE_MESSAGE
                    : isPanel && interviewers.length === 0
                      ? 'Select the panel first.'
                      : undefined
              }
            >
              <span className="flex">
                <Button
                  type="button"
                  className={`${actionButton} bg-primary text-white`}
                  disabled={
                    isBusy ||
                    bookingsClosed ||
                    isPhoneBlocked ||
                    (isPanel && interviewers.length === 0)
                  }
                  onClick={() => onInvite(round)}
                >
                  Invite
                </Button>
              </span>
            </Tooltip>
          )}

          {/* One action for an invited or booked round, chosen by its state:
              Re-invite while the link is unused, otherwise Reschedule. It never
              falls through to Reschedule just because the 3 reinvites are
              used up (Reschedule has no cap, but it is a different action). */}
          {showReinvite ? (
            <Tooltip title={reinviteTooltip}>
              <span className="flex">
                <Button
                  type="button"
                  className={`${actionButton} bg-primary text-white`}
                  disabled={
                    isBusy ||
                    bookingsClosed ||
                    !bookingId ||
                    !reinviteEligible ||
                    reinvitesExhausted
                  }
                  onClick={() => onReinvite(round)}
                >
                  Re-invite
                </Button>
              </span>
            </Tooltip>
          ) : canReschedule ? (
            <Tooltip
              title={
                bookingsClosed
                  ? 'This candidate has already been selected.'
                  : 'Offer the candidate a new time for this interview'
              }
            >
              <span className="flex">
                <Button
                  type="button"
                  className={`${actionButton} bg-primary text-white`}
                  disabled={isBusy || bookingsClosed}
                  onClick={() => onReschedule(round)}
                >
                  Reschedule
                </Button>
              </span>
            </Tooltip>
          ) : null}

          {canGiveFeedback && score && (
            <Button
              type="button"
              className={`${actionButton} bg-primary text-white`}
              onClick={() => onSubmitFeedback(round, score)}
            >
              {score.recruiter_score != null ? 'Edit Feedback' : 'Submit Feedback'}
            </Button>
          )}

          {canSkip && (
            <Tooltip title={mayManage ? undefined : skipBlockedMessage}>
              <span className="flex">
                <Button
                  type="button"
                  className={`${actionButton} border border-gray-300 text-black`}
                  disabled={!mayManage}
                  onClick={onSkip}
                >
                  Skip Round
                </Button>
              </span>
            </Tooltip>
          )}

          {isCurrent && (
            <Button
              type="button"
              className="w-full rounded-full border-2 border-red-600 bg-red-50 px-4 py-2 text-center text-xs font-semibold uppercase text-red-600 hover:bg-red-100"
              onClick={onReject}
            >
              Reject
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const InterviewSchedulingTab = ({
  candidateId,
  rounds,
  roundsLoaded,
  ...cardProps
}: InterviewSchedulingTabProps) => {
  const interviewRounds = rounds.filter((r) => !isResumeStageRound(r));

  // Names for the panel rosters shown on the cards. Same candidate-scoped
  // directory the interviewer picker uses; only fetched when some round has a
  // roster saved.
  const hasRosters = interviewRounds.some((r) => (r.interviewer_ids ?? []).length > 0);
  const { data: eligibleInterviewers = [] } = useListEligibleInterviewersQuery(candidateId, {
    skip: !hasRosters,
  });
  const interviewersFor = (round: CandidateInterviewRoundView) =>
    (round.interviewer_ids ?? []).map((id) => ({
      id,
      name: eligibleInterviewers.find((i) => i.id === id)?.display_name ?? 'Interviewer',
    }));

  return (
    <div className="rounded-lg bg-white px-4 py-4 shadow-sm">
      <div className="mb-6 flex justify-center">
        <h3 className="font-bold">Round Overview</h3>
      </div>
      {!roundsLoaded ? (
        <p className="text-sm text-gray-500">Loading rounds…</p>
      ) : interviewRounds.length === 0 ? (
        <p className="text-sm text-gray-500">No interview rounds planned yet.</p>
      ) : (
        <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {interviewRounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              interviewers={interviewersFor(round)}
              {...cardProps}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewSchedulingTab;
