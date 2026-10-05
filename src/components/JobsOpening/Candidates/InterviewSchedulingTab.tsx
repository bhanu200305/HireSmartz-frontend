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
  CONCLUDED_BOOKING_STATUSES,
  MAX_REINVITES,
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
import { findRoundScore } from './roundPipeline';

// "Interview Scheduling" tab: one card per interview round (the resume stage
// has no interview to schedule), laid out like the old app's Round Overview.
// Everything about getting a round scheduled lives here: the first Invite,
// Re-invite (with the attempts still left), Reschedule and Skip. The actions
// themselves run in CandidateDetails (they share its modals); this file only
// decides what each card shows and which buttons are live.

type CardStatus =
  | 'NOT SCHEDULED'
  | 'INVITATION SENT'
  | 'SCHEDULED'
  | 'IN PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'NO SHOW';

const HEADER_STYLE: Record<CardStatus, { bg: string; text: string }> = {
  'NOT SCHEDULED': { bg: 'bg-red-100', text: 'text-red-700' },
  'INVITATION SENT': { bg: 'bg-gray-100', text: 'text-gray-700' },
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  'IN PROGRESS': { bg: 'bg-blue-100', text: 'text-blue-700' },
  COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  SKIPPED: { bg: 'bg-red-100', text: 'text-red-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
  'NO SHOW': { bg: 'bg-red-100', text: 'text-red-700' },
};

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
      return 'IN PROGRESS';
    case 'scheduled':
    case 'rescheduled':
      return round.scheduled_at ? 'SCHEDULED' : 'INVITATION SENT';
    case 'booking_created':
      return 'INVITATION SENT';
    case 'cancelled':
    case 'aborted':
      return 'CANCELLED';
    case 'no_show':
    case 'interviewer_no_show':
      return 'NO SHOW';
    default:
      // to_be_scheduled / pending: invited (automatically with Advance, or
      // by hand) or not at all.
      return round.invite_sent_at || round.interview_booking_id
        ? 'INVITATION SENT'
        : 'NOT SCHEDULED';
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
  /** A booking / reinvite / reschedule request is in flight. */
  isBusy: boolean;
  onInvite: (round: CandidateInterviewRoundView) => void;
  onReinvite: (round: CandidateInterviewRoundView) => void;
  onReschedule: (round: CandidateInterviewRoundView) => void;
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
  interviewerNames: string[];
};

const RoundCard = ({
  round,
  interviewerNames,
  scores,
  currentRoundId,
  isTerminal,
  bookingsClosed,
  isBusy,
  onInvite,
  onReinvite,
  onReschedule,
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

  const status = cardStatusFor(round);
  const header = HEADER_STYLE[status];
  const isCurrent = currentRoundId === round.id && !isTerminal;
  const isPanel = round.round_type === 'PANEL';
  const isVoiceCall =
    isIntakeCallRound(round) || isAudioScreeningRound(round) || isAiVideoRound(round);
  const score = findRoundScore(scores, round);

  const invitedAt = round.invite_sent_at ?? booking?.created_at ?? null;
  const reinviteState = roundReinviteState(round, booking);
  const linkExpired = Boolean(bookingId) && reinviteState.linkExpired;
  const reinvitesUsed = reinviteState.reinvitesUsed;
  const reinvitesLeft = Math.max(0, MAX_REINVITES - reinvitesUsed);
  const reinvitesExhausted = reinvitesLeft === 0;

  // First invite: only for the round that is due, with nothing sent yet (an
  // automatic invite sent along with Advance leaves `invite_sent_at` set).
  const canInvite =
    isCurrent && status === 'NOT SCHEDULED' && !bookingId && !isIdentityVerificationRound(round);
  // Invitation sent but not booked = its link is still unused, which is all
  // POST /bookings/{id}/reinvite needs now (no longer gated on expiry).
  const showReinvite = status === 'INVITATION SENT' && !isTerminal;
  // A concluded attempt can be re-attempted through the reschedule flow.
  const canReschedule =
    !isTerminal &&
    Boolean(bookingId) &&
    status !== 'COMPLETED' &&
    status !== 'SKIPPED' &&
    ((isVoiceCall && booking?.call_intent != null) ||
      (isPanel && booking != null && CONCLUDED_BOOKING_STATUSES.includes(booking.status)));
  // The backend only skips the candidate's current round.
  const canSkip = isCurrent && status !== 'COMPLETED' && status !== 'SKIPPED';
  const canGiveFeedback = status === 'COMPLETED' && !isTerminal && Boolean(score);

  const reinviteTooltip = bookingsClosed
    ? 'This candidate has already been selected.'
    : !bookingId
      ? 'The invitation is being set up. Re-invite is available once it is created.'
      : reinvitesExhausted
        ? `All ${MAX_REINVITES} reinvites have been used.`
        : `Send a new invitation link (${reinvitesLeft} of ${MAX_REINVITES} left)`;

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
                {reinvitesUsed > 0 && ` · Reinvited ${reinvitesUsed}/${MAX_REINVITES}`}
              </span>
              {bookingId && (
                <Tooltip
                  title={
                    linkExpired ? 'Invitation link expired' : 'Invitation link is active and valid'
                  }
                >
                  <span
                    className={`ml-2 inline-block h-2.5 w-2.5 cursor-help rounded-full ${
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

        {interviewerNames.length > 0 && status !== 'SKIPPED' && (
          <div className="text-sm text-black">
            <span className="font-bold">Interviewer(s):</span> {interviewerNames.join(' | ')}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          {canInvite && (
            <Tooltip
              title={bookingsClosed ? 'This candidate has already been selected.' : undefined}
            >
              <span className="flex">
                <Button
                  type="button"
                  className={`${actionButton} bg-primary text-white`}
                  disabled={isBusy || bookingsClosed}
                  onClick={() => onInvite(round)}
                >
                  Invite
                </Button>
              </span>
            </Tooltip>
          )}

          {showReinvite && (
            <Tooltip title={reinviteTooltip}>
              <span className="flex">
                <Button
                  type="button"
                  className={`${actionButton} bg-primary text-white`}
                  disabled={isBusy || bookingsClosed || !bookingId || reinvitesExhausted}
                  onClick={() => onReinvite(round)}
                >
                  Re-invite
                </Button>
              </span>
            </Tooltip>
          )}

          {canReschedule && (
            <Tooltip title="Request a new attempt for this concluded interview">
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
          )}

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
            <Button
              type="button"
              className={`${actionButton} border border-gray-300 text-black`}
              onClick={onSkip}
            >
              Skip Round
            </Button>
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
  const namesFor = (round: CandidateInterviewRoundView) =>
    (round.interviewer_ids ?? []).map(
      (id) => eligibleInterviewers.find((i) => i.id === id)?.display_name ?? 'Interviewer'
    );

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
              interviewerNames={namesFor(round)}
              {...cardProps}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewSchedulingTab;
