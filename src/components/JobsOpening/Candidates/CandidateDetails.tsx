import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Rate, Select, Tabs, Tooltip } from 'antd';
import type { RootState } from '../../../redux/provider/store';
import dayjs from 'dayjs';
import {
  LuMail,
  LuPencil,
  LuSquarePen,
  LuThumbsDown,
  LuThumbsUp,
  LuPhone,
  LuMic,
  LuVideo,
  LuUsers,
  LuFileText,
} from 'react-icons/lu';
import { IoChatbubbleEllipses } from 'react-icons/io5';
import { CommonCard, Button, Badge, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import { NotesPillTrigger } from '../Notes/NotesPillTrigger';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { useGetJobQuestionsQuery } from '../../../api/job-service/JobOpening/jobQuestions';
import { asJobId } from '../../../api/job-service/jobId';
import {
  useGetCandidateQuery,
  type CandidateView,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import {
  useListCandidateInterviewRoundsQuery,
  useListEligibleInterviewersQuery,
  useSetPanelInterviewersMutation,
  type InterviewerView,
  type CandidateInterviewRoundView,
} from '../../../api/candidate-service/Candidates/interviewRounds';
import {
  useListCandidateInterviewScoresQuery,
  useDeleteResumeReviewMutation,
  useLazyGetCandidateResumeDownloadQuery,
  useRequestResumeUploadMutation,
} from '../../../api/candidate-service/Candidates/scoring';
import { useListRecruiterNotesQuery } from '../../../api/candidate-service/Candidates/notes';
import {
  useCreateBookingMutation,
  useGetBookingQuery,
  useGetBookingHistoryQuery,
  useRequestCallRescheduleMutation,
  useLazyGetCalendarConnectUrlQuery,
  useGetCalendarGrantStatusQuery,
  useGetArtifactsQuery,
  useGetInterviewersCalendarStatusQuery,
  useUploadOfflineRecordingMutation,
  useGetAudioScreeningQuestionsQuery,
  CONCLUDED_BOOKING_STATUSES,
} from '../../../api/interview-service/client';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';
import ChangeCandidateStatusModal, {
  type ChangeCandidateStatusMode,
} from './Modal/ChangeCandidateStatusModal';
import BulkEmailCandidatesModal from './Modal/BulkEmailCandidatesModal';
import BulkSendSmsModal from './Modal/BulkSendSmsModal';
import EditCandidateModal from './Modal/EditCandidateModal';
import CandidateRecruiterNotesPanel from './Notes/CandidateRecruiterNotesPanel';
import ResumeReviewModal from './Modal/ResumeReviewModal';
import RecruiterRoundScoreModal from './Modal/RecruiterRoundScoreModal';
import ResumeViewerModal from './Modal/ResumeViewerModal';
import PipelineBoard from './PipelineBoard';
import { roundLabel, formatRoundStatus, formatCallIntent } from './roundDisplay';
import {
  resolveCurrentRound,
  isRoundConcluded,
  isAiVideoRound,
  isAudioScreeningRound,
  isIntakeCallRound,
  isResumeStageRound,
  isStaleResumeRound,
  orderRoundsForFlow,
} from './roundProgress';

// Rewritten against the real candidate-service contract — replaces the
// previous ~2050-line version, which was built entirely around a legacy
// round-type-specific model (per-round AI/VIDEO/IN_PERSON evaluation
// dashboards, a fixed Overall/Resume/AI-Audio/Video/In-person scoring
// grid, multi-job "assigned jobs" switching, SSE candidate streaming,
// manual interview-invite scheduling) that has no equivalent on
// candidate-service's real, deliberately much simpler model — see
// PROJECT_UNDERSTANDING.md §4. Kept the same header-card + tab-strip visual
// shell this app already uses elsewhere (`CommonCard`, pill status badge,
// circular icon-button header actions), but the tab taxonomy itself follows
// the wireframe's Pipeline / Assessment / Resume / Interview Summary / SMS
// Communication split — that maps directly onto the 5 separate calls
// FRONTEND_INTEGRATION_DETAILS.md §4.4 actually documents, unlike the old
// 4-tab layout which assumed data this API doesn't have.
//
// Deliberately dropped, no real-backend equivalent (flagged, not faked):
// - Multi-job "assigned jobs" switcher — a candidate has exactly one
//   `job_opening_id`, immutable in practice; no assign-to-another-job
//   endpoint exists.
// - Previous/next-candidate navigation — `CandidateView` carries no
//   adjacent-candidate ids; would need deriving from the list screen's own
//   result order, not available here in isolation.
// - SMS Communication as a conversation thread — candidate-service can only
//   SEND email/SMS (`messaging.ts`), there is no "list prior messages"
//   endpoint on the real contract. Rendered as a compose-and-send panel
//   instead of fabricated history.
// - Round-type-specific rich evaluation panels (AI transcript, avatar/voice
//   call detail) — that's interview-service's data, not yet surfaced
//   through candidate-service.

type TabKey = 'assessment' | 'resume' | 'summary' | 'sms';

const candidateHeaderIconCircle =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--primary)] transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40';

const candidateDisplayName = (c?: CandidateView) =>
  `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'N/A';

const formatDateTime = (value: string | null | undefined) =>
  value && dayjs(value).isValid() ? dayjs(value).format('MMM DD, YYYY · h:mm A') : null;

const formatStatus = (status: string) =>
  status.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

/** The interviewer-picker `Select` — colored dropdown dots and selected-chip
 * backgrounds by calendar-connected status, identical UI/behavior whether
 * it's rostering a PANEL round for the first time (Create Booking) or
 * picking a new roster for an already-booked one (Request reschedule's
 * "choose different interviewers" step). Extracted so both call sites share
 * one implementation instead of the color-coding logic drifting between two
 * copies. */
const PanelInterviewerPicker = ({
  id,
  value,
  onChange,
  options,
  loading,
  calendarConnectedById,
  helperText,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: InterviewerView[];
  loading: boolean;
  calendarConnectedById: Map<string, boolean>;
  helperText?: string;
}) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-sm text-gray-800">
      Interviewer(s) <span className="required-asterisk">*</span>
    </label>
    <Select
      id={id}
      mode="multiple"
      className="w-full"
      placeholder="Choose who sits on this round's panel"
      loading={loading}
      value={value}
      onChange={onChange}
      showSearch
      optionFilterProp="label"
      notFoundContent={loading ? 'Loading…' : 'No eligible interviewers found'}
      options={options.map((interviewer) => ({
        label: `${interviewer.display_name} (${interviewer.email})`,
        value: interviewer.id,
      }))}
      // `label` itself stays plain text (kept searchable via
      // optionFilterProp) and only the rendering is colored, so filtering
      // behavior is unaffected.
      optionRender={(option) => {
        const connected = calendarConnectedById.get(String(option.value));
        return (
          <span className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                connected === false
                  ? 'bg-red-500'
                  : connected === true
                    ? 'bg-green-500'
                    : 'bg-gray-300'
              }`}
              aria-hidden
            />
            {option.label}
          </span>
        );
      }}
      tagRender={({ label, value: tagValue, closable, onClose }) => {
        const connected = calendarConnectedById.get(String(tagValue));
        return (
          <span
            className={`mb-0.5 mr-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
              connected === false
                ? 'border-red-200 bg-red-50 text-red-700'
                : connected === true
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}
          >
            {label}
            {closable && (
              <span
                onClick={onClose}
                className="cursor-pointer text-current opacity-60 hover:opacity-100"
                aria-hidden
              >
                ×
              </span>
            )}
          </span>
        );
      }}
    />
    {helperText && <p className="mt-1 text-xs text-gray-400">{helperText}</p>}
  </div>
);

const CandidateDetails = () => {
  const { candidateId, id: jobIdFromParams } = useParams<{
    candidateId: string;
    id: string;
  }>();
  const parsedJobId = asJobId(jobIdFromParams);
  const [searchParams] = useSearchParams();
  const userId = useSelector((state: RootState) => state.LoginSlice.userId);

  // Deep link from the post-interview "Complete Full Feedback" flow
  // (InterviewLiveKit.tsx's handleFeedbackFullSelect, ?tab=summary) — lands
  // the interviewer straight on Interview Summary instead of always
  // defaulting to Assessment. Read once via useState's lazy initializer so
  // the page never flashes the wrong tab before switching. `'3'` covers a
  // legacy numeric value that predates this page's tab strip being rewritten
  // to string keys (kept in case anything already-sent still links with it).
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tabParam = searchParams.get('tab');
    const validTabs: TabKey[] = ['assessment', 'resume', 'summary', 'sms'];
    if (tabParam && validTabs.includes(tabParam as TabKey)) return tabParam as TabKey;
    if (tabParam === '3') return 'summary';
    return 'assessment';
  });
  const [statusModal, setStatusModal] = useState<ChangeCandidateStatusMode | null>(null);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isResumeReviewOpen, setIsResumeReviewOpen] = useState(false);
  const [isResumeViewerOpen, setIsResumeViewerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<CandidateInterviewRoundView | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  // PANEL round interviewer picker, inline above Create Booking — seeded
  // from whatever's already saved on the round (e.g. set earlier from
  // PipelineBoard's own Panel Interviewers picker) whenever the selected
  // round changes, below.
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
  // Confirmation gate before requesting a reschedule — the candidate's
  // resume-consistency score is recalculated from whatever call actually
  // ends up happening, so a recruiter needs to know the current score (if
  // any) is about to be replaced before they commit to a new call.
  const [isRescheduleConfirmOpen, setIsRescheduleConfirmOpen] = useState(false);
  // Which round the confirm modal/mutation actually act on — deliberately
  // separate from `selectedRound`. The Call Outcome card's own button sets
  // this to `selectedRound` (same round already open), but PipelineBoard's
  // per-card "Request reschedule" button needs to trigger the exact same
  // flow WITHOUT first navigating into that round's drill-down view.
  const [rescheduleRound, setRescheduleRound] = useState<CandidateInterviewRoundView | null>(null);
  // PANEL reschedules get an extra "keep the same roster, or pick a new
  // one?" step the generic ConfirmationModal below doesn't ask — backend
  // carries the original roster forward automatically on an empty body, so
  // this is purely a UI decision point, not something the API requires an
  // answer to. `rescheduleRound.round_type`, not `isPanelRound` — this can
  // open straight from a PipelineBoard card for a round that isn't the
  // currently drilled-into `selectedRound` at all.
  const isRescheduleRoundPanel = rescheduleRound?.round_type === 'PANEL';
  const [rescheduleStep, setRescheduleStep] = useState<'choice' | 'picker'>('choice');
  const [rescheduleInterviewerIds, setRescheduleInterviewerIds] = useState<string[]>([]);
  // Reset to the first step every time a fresh reschedule flow opens, so a
  // previous round's "choose different interviewers" progress can't leak
  // into the next one.
  useEffect(() => {
    if (isRescheduleConfirmOpen) setRescheduleStep('choice');
  }, [isRescheduleConfirmOpen, rescheduleRound?.id]);
  const [scoreModalFor, setScoreModalFor] = useState<{
    scoreId: string;
    roundName: string;
    currentScore: number | null;
    currentReason: string | null;
  } | null>(null);

  const {
    data: candidate,
    isLoading: isCandidateLoading,
    error: candidateError,
    refetch: refetchCandidate,
  } = useGetCandidateQuery(candidateId ?? '', {
    skip: !candidateId,
    // A self-service withdrawal (or any other status change) arrives via
    // an async event chain, not this page's own action — same reasoning
    // the round-score/artifact queries below already poll on.
    pollingInterval: 20_000,
    skipPollingIfUnfocused: true,
  });

  const { data: jobOpeningData } = useGetJobOpeningByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !parsedJobId }
  );

  const { data: rawRounds = [] } = useListCandidateInterviewRoundsQuery(candidateId ?? '', {
    skip: !candidateId,
    // A round's own status (e.g. PANEL flipping to "Scheduled" once the
    // candidate actually books a time after every interviewer connects
    // their calendar) changes from a backend event chain, not from
    // anything clicked on this screen — poll so the Pipeline board catches
    // up without a manual refresh, same reasoning as useGetCandidateQuery.
    pollingInterval: 20_000,
    skipPollingIfUnfocused: true,
  });
  // The instant-call flow (Intake Call first, resume within 24h) and the
  // resume-first flow get the SAME plan-level round order from the backend —
  // it places the resume stage at the job plan's single Resume Round
  // position, which can't differ per candidate. Reorder client-side, driven
  // by the resume stage's own `follows_intake_call` flag (candidate-service
  // migration 0023 — the per-candidate fact for this), so an instant-call
  // candidate's pipeline reads Intake Call → Resume Review.
  const rounds = orderRoundsForFlow(rawRounds).filter((r) => !isStaleResumeRound(r));
  const { data: scores = [] } = useListCandidateInterviewScoresQuery(candidateId ?? '', {
    skip: !candidateId,
  });
  const { data: notesData } = useListRecruiterNotesQuery(
    { candidateId: candidateId ?? '', limit: 1 },
    { skip: !candidateId }
  );
  const [deleteResumeReview] = useDeleteResumeReviewMutation();
  const [getResumeDownload, { isLoading: isResumeUrlLoading }] =
    useLazyGetCandidateResumeDownloadQuery();
  const [requestResumeUpload, { isLoading: isRequestingResumeUpload }] =
    useRequestResumeUploadMutation();
  const [createBooking] = useCreateBookingMutation();
  const isPanelRound = Boolean(selectedRound?.round_name?.toLowerCase().includes('panel'));
  // Job Service's question bank, grouped by round — matched back to the
  // SELECTED round by `sequence`, not `round_id`: a round TYPE (e.g.
  // "Hiring Panel") can repeat more than once in one job's plan and every
  // repeat shares the same `round_id`, so sequence is the one key that
  // actually disambiguates which repeat this is (see BookingDetailDrawer's
  // own version of this same match for the full reasoning).
  const { data: jobQuestions } = useGetJobQuestionsQuery(parsedJobId, {
    skip: !isPanelRound || !parsedJobId,
  });
  const roundQuestions = jobQuestions?.rounds.find((r) => r.sequence === selectedRound?.sequence);
  const [setPanelInterviewers, { isLoading: isSavingInterviewers }] =
    useSetPanelInterviewersMutation();
  // Needed both for the Create Booking picker (pre-booking, driven off
  // `selectedRound`) and the "choose different interviewers" reschedule
  // step (post-booking, can be driven off a DIFFERENT round entirely —
  // `rescheduleRound` — opened straight from a PipelineBoard card without
  // ever drilling into that round). Eligibility itself is candidate-scoped,
  // not round-scoped, so one query correctly serves both.
  const showsReschedulePicker =
    isRescheduleConfirmOpen && isRescheduleRoundPanel && rescheduleStep === 'picker';
  const { data: eligibleInterviewers, isLoading: isLoadingInterviewers } =
    useListEligibleInterviewersQuery(candidateId ?? '', {
      skip:
        !candidateId ||
        !((isPanelRound && !selectedRound?.interview_booking_id) || showsReschedulePicker),
    });
  // Colors the picker's chips (dropdown options AND already-picked tags)
  // green/red by whether each interviewer has connected their calendar —
  // nothing pushes an update when someone connects elsewhere, so this polls
  // while the picker is open instead of requiring a manual page refresh to
  // see a chip flip from red to green. Omitting `interviewerIds` asks for
  // the WHOLE eligible pool's status (not just the currently-selected
  // roster) so the dropdown itself is color-coded before anything is picked,
  // not only the chips already chosen.
  const { data: interviewersCalendarStatus } = useGetInterviewersCalendarStatusQuery(
    { jobId: parsedJobId ?? '' },
    {
      skip:
        !parsedJobId ||
        !((isPanelRound && !selectedRound?.interview_booking_id) || showsReschedulePicker),
      pollingInterval: 15_000,
      skipPollingIfUnfocused: true,
      refetchOnFocus: true,
    }
  );
  const interviewerCalendarConnectedById = new Map(
    (interviewersCalendarStatus ?? []).map((s) => [s.interviewer_id, s.calendar_connected])
  );
  // Re-seeded whenever the SELECTED ROUND changes (by id, not by reference —
  // `setSelectedRound` below replaces the object on every booking-created/
  // interviewers-saved success, and re-seeding on every such change would
  // stomp whatever the recruiter is mid-picking) so switching rounds shows
  // that round's own saved selection instead of leftover state from
  // whichever round was open before.
  useEffect(() => {
    setSelectedInterviewerIds(selectedRound?.interviewer_ids ?? []);
  }, [selectedRound?.id]);
  const { data: selectedBooking } = useGetBookingQuery(selectedRound?.interview_booking_id ?? '', {
    skip: !selectedRound?.interview_booking_id,
    // The candidate's scheduling email (and, for PANEL, the round flipping
    // to "Scheduled") both happen server-side once the last interviewer
    // connects their calendar — no action on this screen triggers either,
    // so this has to catch up on its own instead of waiting for a manual
    // refresh. Same reasoning as useGetCandidateQuery's own polling above.
    pollingInterval: 20_000,
    skipPollingIfUnfocused: true,
  });
  // The real questions Vapi asked on this AUDIO_SCREENING call — distinct
  // from job-service's static per-round question bank (`roundQuestions`
  // below), which is a fixed plan, not what actually got asked. Only
  // meaningful for AUDIO_SCREENING; a 404 means the call hasn't concluded
  // (or Vapi's reply hasn't been processed) yet, not a real error — handled
  // where this is rendered, not here.
  const {
    data: audioScreeningQuestions,
    error: audioScreeningQuestionsError,
    isLoading: isLoadingAudioScreeningQuestions,
  } = useGetAudioScreeningQuestionsQuery(selectedRound?.interview_booking_id ?? '', {
    skip:
      !selectedRound ||
      !isAudioScreeningRound(selectedRound) ||
      !selectedRound.interview_booking_id,
  });
  // Every past attempt for this round, not just the current one — see
  // getBookingHistory's own docstring for why interview-service, not
  // candidate-service, is the only place this survives a reschedule.
  const { data: bookingHistory } = useGetBookingHistoryQuery(
    selectedRound?.interview_booking_id ?? '',
    { skip: !selectedRound?.interview_booking_id }
  );
  const [requestCallReschedule, { isLoading: isRequestingReschedule }] =
    useRequestCallRescheduleMutation();
  const [getCalendarConnectUrl] = useLazyGetCalendarConnectUrlQuery();
  // "CONNECT CALENDAR" below is self-service — it always connects the
  // CURRENT logged-in user's own calendar (getCalendarGrantStatus/
  // getCalendarConnectUrl are both identity-scoped, no target-user param).
  // That's only meaningful when this viewer is BOTH this job's hiring
  // manager AND one of this round's assigned interviewers — otherwise
  // "connect calendar" here wouldn't even be connecting the calendar that
  // this round's scheduling actually depends on.
  const isHiringManagerForJob = Boolean(
    userId && jobOpeningData?.data?.hiringManagers?.some((id) => String(id) === String(userId))
  );
  const isInterviewerForJob = Boolean(
    userId && selectedRound?.interviewer_ids?.some((id) => String(id) === String(userId))
  );
  const showsOwnConnectCalendarAction =
    isPanelRound &&
    !selectedRound?.interview_booking_id &&
    isHiringManagerForJob &&
    isInterviewerForJob;
  const { data: calendarGrantStatus, refetch: refetchCalendarGrantStatus } =
    useGetCalendarGrantStatusQuery(undefined, {
      skip: !showsOwnConnectCalendarAction,
    });

  /**
   * interview-service's OAuth callback always redirects the browser back to
   * one fixed, globally-configured URL (`nylas_success_redirect_url` —
   * settings.py) — it has no way to know this button was clicked from a
   * specific candidate's page, so a normal full-page redirect stranded the
   * recruiter on that generic screen with no way back to where they started.
   *
   * Runs the OAuth flow in a popup instead: this page never navigates away,
   * so there's nowhere to "not return" from. Polls for the popup closing
   * (Nylas's own page has no way to postMessage us — cross-origin) and
   * refetches this user's grant status in place once it does. Falls back to
   * the old full-page redirect only if the popup itself is blocked.
   */
  const handleConnectCalendar = () => {
    void getCalendarConnectUrl().then(({ data }) => {
      if (!data?.connect_url) return;
      const popup = window.open(data.connect_url, 'nylas-connect-calendar', 'width=520,height=680');
      if (!popup) {
        // Popup blocked — fall back to the previous behavior rather than
        // leaving the click with no effect at all.
        window.location.assign(data.connect_url);
        return;
      }
      const pollForClose = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollForClose);
          void refetchCalendarGrantStatus();
        }
      }, 1000);
    });
  };
  // Offline hiring-panel recording: `POST /bookings/{id}/recording/upload`
  // — the candidate visited in person, so there's no LiveKit session to
  // detect a recording automatically; a recruiter attaches the audio file
  // by hand instead. Needs a real booking to attach to, so this only shows
  // once one exists. `getArtifacts` (not a booking field) is the only way
  // to know a recording is already on file — checked so a second upload
  // attempt is disabled rather than silently accepted and ignored (the
  // backend's own idempotent-retry just hands back the FIRST upload for a
  // booking that already has one, never replaces it).
  const { data: bookingArtifacts } = useGetArtifactsQuery(
    selectedRound?.interview_booking_id ?? '',
    { skip: !isPanelRound || !selectedRound?.interview_booking_id }
  );
  const hasRecording = Boolean(
    bookingArtifacts?.artifacts.some((artifact) => artifact.kind === 'recording')
  );
  const [uploadOfflineRecording, { isLoading: isUploadingAudio }] =
    useUploadOfflineRecordingMutation();
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const handleAudioFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cleared unconditionally so picking the SAME filename again after a
    // failed upload still fires a change event.
    e.target.value = '';
    if (!file || !selectedRound?.interview_booking_id) return;
    if (!file.type.startsWith('audio/')) {
      showToast({ message: 'Please choose an audio file.', type: 'error' });
      return;
    }
    try {
      await uploadOfflineRecording({
        bookingId: selectedRound.interview_booking_id,
        file,
      }).unwrap();
      showToast({ message: 'Recording uploaded.', type: 'success' });
    } catch (error) {
      showToast({
        message: getCandidateErrorMessage(error, 'Could not upload the recording.'),
        type: 'error',
      });
    }
  };

  const handleDownloadResume = async () => {
    if (!candidateId) return;
    try {
      const { download_url } = await getResumeDownload(candidateId).unwrap();
      // The presigned URL is stored with an `attachment` disposition, so a
      // plain anchor click saves the file (VIEW RESUME opens the in-app
      // viewer instead — see ResumeViewerModal).
      const anchor = document.createElement('a');
      anchor.href = download_url;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.click();
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Resume not available'), type: 'error' });
    }
  };

  const handleRequestResumeUpload = async () => {
    if (!candidateId) return;
    try {
      await requestResumeUpload(candidateId).unwrap();
      showToast({
        message: 'Resume requested — the candidate has been emailed an upload link.',
        type: 'success',
      });
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not request a resume'),
        type: 'error',
      });
    }
  };

  // `interviewerIds` is PANEL's "choose different interviewers" path only —
  // omitted (undefined), the backend carries the original roster forward
  // automatically. Same degradation as creating a booking the first time,
  // so the toast branches the same way `handleCreateBooking` below does.
  const handleRequestCallReschedule = async (interviewerIds?: string[]) => {
    if (!rescheduleRound?.interview_booking_id) return;
    try {
      const booking = await requestCallReschedule({
        bookingId: rescheduleRound.interview_booking_id,
        interviewerIds,
      }).unwrap();
      const pendingNames = booking.pending_calendar_connect_interviewer_names;
      if (pendingNames && pendingNames.length > 0) {
        showToast({
          message:
            booking.envelope_message ||
            `Reschedule requested — waiting on ${pendingNames.join(', ')} to connect their calendar before the candidate is scheduled.`,
          type: 'success',
        });
      } else {
        showToast({
          message:
            'Reschedule requested — the candidate has been emailed a new link, valid for 24 hours.',
          type: 'success',
        });
      }
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not request a reschedule'),
        type: 'error',
      });
    } finally {
      setIsRescheduleConfirmOpen(false);
      setRescheduleRound(null);
      setRescheduleStep('choice');
      setRescheduleInterviewerIds([]);
    }
  };

  const handleDeleteResumeReview = async () => {
    if (!candidateId) return;
    try {
      await deleteResumeReview(candidateId).unwrap();
      showToast({ message: 'Review removed.', type: 'success' });
      // Explicit on top of `deleteResumeReview`'s own tag invalidation —
      // same belt-and-suspenders reasoning as `refetchCandidate` after
      // saving a review below.
      refetchCandidate();
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not remove review'), type: 'error' });
    }
  };

  const handleCreateBooking = async () => {
    if (!candidateId || !parsedJobId || !selectedRound?.round_id) return;
    // Belt-and-suspenders alongside the button's own `disabled` — a PANEL
    // booking with no roster falls back to interview-service auto-composing
    // it from whichever calendar-connected interviewers are in the pool,
    // which is exactly the untested, no-real-caller path this picker exists
    // to avoid (see CreateBookingRequest.interviewer_ids's own comment).
    if (isPanelRound && selectedInterviewerIds.length === 0) return;

    setIsCreatingBooking(true);
    const name = selectedRound.round_name?.toLowerCase() ?? '';
    const interviewType = name.includes('panel')
      ? 'panel'
      : name.includes('video')
        ? 'ai_video'
        : 'audio_screening';
    try {
      // Saved to the round FIRST — same data `PipelineBoard`'s own Panel
      // Interviewers picker writes — so the selection is a real, visible
      // fact about this round (wherever `interviewer_ids` is already shown)
      // rather than something only this one booking call ever learns about.
      if (isPanelRound) {
        await setPanelInterviewers({
          candidateId,
          roundId: selectedRound.id,
          interviewerIds: selectedInterviewerIds,
        }).unwrap();
      }
      const booking = await createBooking({
        body: {
          candidate_id: candidateId,
          job_id: parsedJobId,
          round_id: selectedRound.round_id,
          sequence_no: selectedRound.sequence ?? 1,
          interview_type: interviewType,
          interviewer_id: null,
          interviewer_ids: isPanelRound ? selectedInterviewerIds : null,
          immediate: false,
          // Without this, interview-service has no way to report this
          // booking's status/score back to the right round — it silently
          // never updates, even once the call completes.
          candidate_interview_round_id: selectedRound.id,
        },
      }).unwrap();
      setSelectedRound({
        ...selectedRound,
        interview_booking_id: booking.id,
        interviewer_ids: isPanelRound ? selectedInterviewerIds : selectedRound.interviewer_ids,
      });
      // PANEL only — interview-service still creates the booking even when
      // part of the roster hasn't connected their calendar yet, but the
      // candidate's scheduling email doesn't go out until everyone has.
      // Surface that instead of the generic success toast so it's not
      // mistaken for "fully scheduled". Prefer the backend's own
      // `envelope_message` (already phrased for display) over building one
      // from the names ourselves.
      const pendingNames = booking.pending_calendar_connect_interviewer_names;
      if (pendingNames && pendingNames.length > 0) {
        showToast({
          message:
            booking.envelope_message ||
            `Booking created — waiting on ${pendingNames.join(', ')} to connect their calendar before the candidate is scheduled.`,
          type: 'success',
        });
      } else {
        showToast({ message: 'Booking created successfully.', type: 'success' });
      }
    } catch (error) {
      showToast({
        message: getCandidateErrorMessage(error, 'Could not create booking.'),
        type: 'error',
      });
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const statusUpper = (candidate?.status_code ?? '').toLowerCase();
  // Matches master.ts's own documented funnel comment — every code marked
  // "(terminal)" there. `withdrawn` was missing here (added 2026-09-14): a
  // candidate who withdrew via their own email link (interview-service's
  // `POST /withdraw/{token}` -> candidate-service's real status
  // transition, already fully wired) still saw ADVANCE/REJECT on their own
  // profile, since nothing here recognized that status as terminal.
  const isTerminal = [
    'selected',
    'rejected',
    'resume_rejected',
    'interview_rejected',
    'withdrawn',
  ].includes(statusUpper);

  const isResumeStage = selectedRound?.stage_type === 'resume';
  // `roundProgress.ts`'s shared `isIntakeCallRound` — this used to
  // duplicate that check inline via a `round_name` string match instead of
  // reusing it, which was also the older, fragile version of the check
  // (see that helper's own doc comment for why `round_type` replaced it).
  // Reusing the one shared definition means this file's drill-down and
  // `planHasIntakeCall`/`currentRoundInIntakePair` below can never disagree
  // about which round is the Intake Call.
  const selectedRoundIsIntakeCall = Boolean(selectedRound && isIntakeCallRound(selectedRound));
  // Call-intent card (added 2026-09-13, extended to AI Video 2026-09-14)
  // applies to all three voice/video rounds interview-service derives an
  // intent for — computed inline rather than adding three near-duplicate
  // constants.
  const selectedRoundIsVoiceCall = Boolean(
    selectedRound &&
    (isIntakeCallRound(selectedRound) ||
      isAudioScreeningRound(selectedRound) ||
      isAiVideoRound(selectedRound))
  );
  // Same "score already sitting here means reviewed and ready to move on"
  // read as PipelineBoard.tsx's own version of this check — the resume
  // stage's status never flips off "to_be_scheduled"/"pending" on its own,
  // only an explicit Advance does, so a score present is what actually
  // means "ready", not the raw status text.
  const isResumeAwaitingAdvance =
    isResumeStage &&
    candidate?.resume_score != null &&
    ['to_be_scheduled', 'pending'].includes(
      (selectedRound?.status ?? '')
        .trim()
        .toLowerCase()
        .replace(/[-\s]+/g, '_')
    );

  // ADVANCE completes whichever round `resolveCurrentRound` says the
  // candidate is on right now and marks the next one due — it does not
  // check whether the CURRENT one actually happened first. Left
  // unguarded, a recruiter can click it the instant a round becomes due
  // and mark an interview "completed" that was never conducted. Disabled
  // until that round's real-world outcome is known (`isRoundConcluded`);
  // re-enables once interview-service reports it done, no-show,
  // cancelled or aborted. The resume stage has no such external signal —
  // only Advance itself ever concludes it — so it's exempt from this gate.
  const currentRound = resolveCurrentRound(rounds);
  const advanceDisabled =
    currentRound !== null &&
    currentRound.stage_type === 'interview' &&
    !isRoundConcluded(currentRound);

  // Resume Review and the Intake Call are one unit at the head of any pipeline
  // that has an Intake Call round: the AI scores the resume, then the call's
  // transcript is checked against that resume for consistency. Neither round
  // advances on its own — ADVANCE / REJECT / MARK SELECTED stay hidden until
  // the consistency score lands (candidate-service stamps
  // `resume_consistency_review` at the same time). Once it's in, the normal
  // actions come back. Jobs with no Intake Call round are unaffected.
  const planHasIntakeCall = rounds.some(isIntakeCallRound);
  const consistencyScorePending =
    candidate?.consistency_score === null || candidate?.consistency_score === undefined;
  const currentRoundInIntakePair =
    currentRound !== null && (isResumeStageRound(currentRound) || isIntakeCallRound(currentRound));
  const actionsLockedForIntakePair =
    planHasIntakeCall && currentRoundInIntakePair && consistencyScorePending;

  // Interview Summary tab helper. The resume stage and the Intake Call round
  // never produce a `CandidateInterviewScore` — their real outputs are the AI
  // resume score and the Intake Call consistency score, both on the candidate
  // record. Fold them in here so the summary shows those numbers and reads
  // "Completed" for a scored resume, instead of the raw "To Be Scheduled" /
  // "Pending" status the round row still carries.
  const summariseRound = (round: CandidateInterviewRoundView) => {
    const roundScore = scores.find((s) => s.candidate_interview_round_id === round.id);
    const recruiterOrAiScore = roundScore?.recruiter_score ?? roundScore?.score ?? null;

    if (isResumeStageRound(round)) {
      const scored = candidate?.resume_score != null;
      return {
        roundScore,
        chartValue: candidate?.resume_score ?? null,
        // Resume score is 0-10 (ai-service's score_resume.py), not 0-100 —
        // scale up for the bar height.
        pct:
          candidate?.resume_score == null
            ? 0
            : Math.max(0, Math.min(100, candidate.resume_score * 10)),
        scoreText: scored ? `${candidate?.resume_score} / 10 · AI resume score` : null,
        statusText: scored ? 'Completed' : formatStatus(round.status),
        outcomeLabel: scored ? 'Scored' : null,
      };
    }
    if (isIntakeCallRound(round)) {
      const checked = candidate?.consistency_score != null;
      return {
        roundScore,
        chartValue: candidate?.consistency_score ?? null,
        // Consistency score is 0-10 (ai-service's
        // check_intake_call_consistency.py), not 0-100 — scale up for the
        // bar height.
        pct:
          candidate?.consistency_score == null
            ? 0
            : Math.max(0, Math.min(100, candidate.consistency_score * 10)),
        scoreText: checked ? `${candidate?.consistency_score} / 10 · resume consistency` : null,
        statusText: formatRoundStatus(round.status),
        outcomeLabel: checked ? 'Checked' : null,
      };
    }
    // Scores are on two different scales depending on who produced them —
    // a recruiter's manual review is 0-5, the AI round score is 0-10 as of
    // 2026-09-14 (score_interview_round.py's scale unification — matches
    // resume/consistency scoring above, was 0-100 before) — so the bar
    // height must scale by whichever is actually present, not a fixed /5,
    // or every AI-scored round renders maxed out regardless of its real
    // value.
    const pct =
      roundScore?.recruiter_score != null
        ? Math.max(0, Math.min(100, (roundScore.recruiter_score / 5) * 100))
        : roundScore?.score != null
          ? Math.max(0, Math.min(100, roundScore.score * 10))
          : 0;
    return {
      roundScore,
      chartValue: recruiterOrAiScore,
      pct,
      scoreText:
        roundScore?.recruiter_score != null
          ? `${roundScore.recruiter_score} / 5`
          : roundScore?.score != null
            ? `${roundScore.score} / 10 · AI score`
            : null,
      statusText: formatRoundStatus(round.status),
      outcomeLabel: roundScore
        ? roundScore.recruiter_score != null
          ? 'Reviewed'
          : 'Scored'
        : null,
    };
  };

  if (candidateError) {
    return (
      <p className="p-4 text-sm text-red-500">
        {getCandidateErrorMessage(candidateError, 'Failed to load candidate.')}
      </p>
    );
  }

  return (
    <>
      {isCandidateLoading && <Loader />}
      <div className="flex flex-col mb-6 gap-2">
        <div className="flex-1 bg-white px-6 py-4 shadow-sm rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold">{candidateDisplayName(candidate)}</h2>

            <div className="flex items-center gap-3 flex-wrap">
              <Tooltip title="Edit candidate details">
                <span className="inline-flex">
                  <button
                    type="button"
                    className={candidateHeaderIconCircle}
                    disabled={!candidate}
                    aria-label="Edit candidate"
                    onClick={() => setIsEditOpen(true)}
                  >
                    <LuPencil size={18} strokeWidth={2} aria-hidden />
                  </button>
                </span>
              </Tooltip>
              <Tooltip
                title={candidate?.email_id ? `Email ${candidate.email_id}` : 'No email on file'}
              >
                <span className="inline-flex">
                  <button
                    type="button"
                    className={candidateHeaderIconCircle}
                    disabled={!candidate?.email_id}
                    aria-label="Email candidate"
                    onClick={() => setIsEmailOpen(true)}
                  >
                    <LuMail size={18} strokeWidth={2} aria-hidden />
                  </button>
                </span>
              </Tooltip>
              <Tooltip title={candidate?.contact_no ? 'Send SMS' : 'No phone number on file'}>
                <span className="inline-flex">
                  <button
                    type="button"
                    className={candidateHeaderIconCircle}
                    disabled={!candidate?.contact_no}
                    aria-label="Send SMS"
                    onClick={() => setIsSmsOpen(true)}
                  >
                    <IoChatbubbleEllipses size={18} aria-hidden />
                  </button>
                </span>
              </Tooltip>
              <NotesPillTrigger
                count={notesData?.items.length ?? 0}
                onClick={() => setIsNotesOpen(true)}
                tooltip="Candidate notes"
              />
              <span
                className={`text-sm font-medium px-4 py-1.5 rounded-full flex items-center gap-2 ${
                  statusUpper === 'selected'
                    ? 'text-green-700'
                    : statusUpper.includes('reject')
                      ? 'text-red-700'
                      : statusUpper === 'withdrawn'
                        ? 'text-orange-700'
                        : 'text-brand-700'
                }`}
              >
                {statusUpper === 'selected' ? (
                  <LuThumbsUp size={16} />
                ) : statusUpper.includes('reject') ? (
                  <LuThumbsDown size={16} />
                ) : statusUpper === 'withdrawn' ? (
                  <span className="w-2 h-2 rounded-full bg-orange-500 shadow-lg shadow-orange-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-brand-500 shadow-lg shadow-brand-400" />
                )}
                {candidate?.status_label || 'Applied'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px] space-y-1">
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Job ID:</p>
                <span className="text-gray-500">
                  {jobOpeningData?.data?.jobProfileCode ?? 'N/A'}
                </span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Applied:</p>
                <span className="text-gray-500">
                  {formatDateTime(candidate?.applied_date) ?? 'N/A'}
                </span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Source:</p>
                <span className="text-gray-500">{candidate?.source ?? 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Resume Score:</p>
                <span className="text-gray-500">
                  {candidate?.resume_score === null || candidate?.resume_score === undefined
                    ? '-'
                    : candidate.resume_score}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-[220px] space-y-1">
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Email:</p>
                <span className="text-gray-500">{candidate?.email_id ?? 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Phone:</p>
                <span className="text-gray-500">{candidate?.contact_no ?? 'N/A'}</span>
              </div>
            </div>

            {!isTerminal && actionsLockedForIntakePair && (
              <div className="flex max-w-[18rem] items-center">
                <p className="text-xs text-gray-500">
                  ADVANCE and REJECT unlock once the Intake Call consistency check completes
                  (comparing the call transcript against the resume).
                </p>
              </div>
            )}

            {!isTerminal && !actionsLockedForIntakePair && (
              <div className="flex items-center gap-3">
                <Button
                  className="flex items-center justify-center text-sm px-6 h-[34px] gap-2 rounded-full bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setStatusModal('advance')}
                  disabled={advanceDisabled}
                  title={
                    advanceDisabled
                      ? `Waiting for ${currentRound?.round_name ?? 'this round'} to conclude`
                      : undefined
                  }
                >
                  <span className="text-white">ADVANCE</span>
                </Button>
                <Button
                  className="flex items-center justify-center text-sm px-6 h-[34px] gap-2 rounded-full border-2 border-red-600 bg-red-50 text-red-600 font-semibold hover:bg-red-100"
                  onClick={() => setStatusModal('reject')}
                >
                  <span>REJECT</span>
                </Button>
                <Button
                  className="flex items-center justify-center text-sm px-6 h-[34px] gap-2 rounded-full border-2 border-green-500 bg-green-50"
                  onClick={() => setStatusModal('select')}
                >
                  <span className="text-green-700 font-semibold">MARK SELECTED</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline stays visible above the tab strip regardless of which tab
          is selected — previously it was itself just another tab, so
          switching to Resume/Assessment/etc. hid it entirely. Still hidden
          during the round drill-down below (selectedRound), same as the
          tab strip, since that view is reached BY clicking a card here and
          showing the whole board again above it would be redundant. */}
      {!selectedRound && candidateId && (
        <div className="mb-6 bg-white px-6 py-4 shadow-sm rounded-xl">
          <PipelineBoard
            rounds={rounds}
            scores={scores}
            resumeScore={candidate?.resume_score ?? null}
            consistencyScore={candidate?.consistency_score ?? null}
            candidateId={candidateId}
            onRoundClick={(round) => {
              setSelectedRound(round);
            }}
            onRequestReschedule={(round) => {
              setRescheduleRound(round);
              setIsRescheduleConfirmOpen(true);
            }}
          />
        </div>
      )}

      <div className="flex flex-col bg-[#FAFAFA] rounded-2xl overflow-hidden">
        <div className="px-6">
          {!selectedRound && (
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as TabKey)}
              className="view-candidate-tabs"
              items={[
                { key: 'assessment', label: 'Assessment' },
                { key: 'resume', label: 'Resume' },
                { key: 'summary', label: 'Interview Summary' },
                { key: 'sms', label: 'SMS Communication' },
              ]}
            />
          )}
        </div>

        <div className="p-6">
          {selectedRound ? (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                className="self-start text-sm text-primary hover:underline cursor-pointer"
                onClick={() => setSelectedRound(null)}
              >
                ← Back to {candidateDisplayName(candidate)} Pipeline
              </button>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
                    {isResumeStage ? (
                      <LuFileText size={18} />
                    ) : isPanelRound ? (
                      <LuUsers size={18} />
                    ) : isAiVideoRound(selectedRound) ? (
                      <LuVideo size={18} />
                    ) : (
                      <LuMic size={18} />
                    )}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{roundLabel(selectedRound)}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                      <span>{candidateDisplayName(candidate)}</span>
                      <span className="flex items-center gap-1">
                        <LuMail size={13} className="text-gray-400" />
                        {candidate?.email_id || 'No email on file'}
                      </span>
                      {candidate?.contact_no && (
                        <span className="flex items-center gap-1">
                          <LuPhone size={13} className="text-gray-400" />
                          {candidate.contact_no}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">
                  {isResumeAwaitingAdvance
                    ? 'Score ready'
                    : formatRoundStatus(selectedBooking?.status ?? selectedRound.status)}
                </span>
              </div>

              {isResumeStage ? (
                // The resume stage is "upload a resume, get it scored" —
                // there is no separate interview to schedule or book for
                // it (send_round_invite.py/skip_interview_round.py both
                // refuse this stage on the backend for the same reason).
                // What actually belongs here is the resume's own AI score
                // plus the recruiter's own review of it — previously only
                // reachable from the Assessment tab, so adding one here
                // never showed up on the "Resume Screening" pipeline card
                // a recruiter actually clicks into.
                <CommonCard>
                  <div className="p-5 grid gap-6 sm:grid-cols-3">
                    <div>
                      <div className="text-xs font-semibold uppercase text-gray-400">AI Score</div>
                      <div className="mt-2 text-2xl font-bold text-primary">
                        {candidate?.resume_score ?? '-'}
                      </div>
                      {candidate?.scoring_reason && (
                        <p className="mt-1 text-sm text-gray-600">{candidate.scoring_reason}</p>
                      )}
                    </div>
                    <div>
                      {/* Intake Call consistency — transcript-vs-resume authenticity
                          check, distinct from the AI Score beside it (that's the resume
                          judged against the job; this is whether the call sounds like
                          the same person). candidate-service started projecting both
                          fields onto CandidateView 2026-09-08 (see CandidateLifecycle.ts's
                          own note) — null here now genuinely means "not scored yet"
                          (ai-service hasn't reported one, or one of the two artifacts
                          — resume/call transcript — isn't in yet), not "field doesn't
                          exist." Doesn't have a "recruiter review" of its own the way
                          resume score does — it's a fraud signal to weigh, not something
                          a recruiter re-scores. */}
                      <div className="text-xs font-semibold uppercase text-gray-400">
                        Intake Call Consistency
                      </div>
                      <div className="mt-2 text-2xl font-bold text-primary">
                        {candidate?.consistency_score ?? '-'}
                      </div>
                      {candidate?.consistency_score_reason && (
                        <p className="mt-1 text-sm text-gray-600">
                          {candidate.consistency_score_reason}
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase text-gray-400">
                          Recruiter Review
                        </div>
                        <Button
                          className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700"
                          onClick={() => setIsResumeReviewOpen(true)}
                        >
                          {candidate?.resume_rating ? 'EDIT REVIEW' : 'ADD REVIEW'}
                        </Button>
                      </div>
                      {candidate?.resume_rating ? (
                        <>
                          <Rate disabled value={candidate.resume_rating} className="mt-2" />
                          {candidate.resume_review_comment && (
                            <p className="mt-1 text-sm text-gray-600">
                              {candidate.resume_review_comment}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDeleteResumeReview()}
                            className="mt-2 block text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                          >
                            Remove review
                          </button>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-gray-400">No review yet.</p>
                      )}
                    </div>
                  </div>
                </CommonCard>
              ) : (
                <>
                  {selectedRoundIsVoiceCall && (
                    // What actually happened on the call — completed,
                    // asked to reschedule, said not interested, never
                    // picked up, or cut off with no clear reason. Backed by
                    // interview-service's own `GET /bookings/{id}`
                    // (`selectedBooking`, already fetched above), not
                    // candidate-service — this field doesn't exist there.
                    <CommonCard>
                      <div className="p-5">
                        <div className="text-xs font-semibold uppercase text-gray-400">
                          Call Outcome
                        </div>
                        <div className="mt-2 text-lg font-bold text-primary">
                          {formatCallIntent(selectedBooking?.call_intent ?? null)}
                        </div>
                        {selectedBooking?.call_intent_reason ? (
                          <p className="mt-1 text-sm text-gray-600">
                            {selectedBooking.call_intent_reason}
                          </p>
                        ) : selectedBooking?.call_intent == null ? (
                          <p className="mt-1 text-sm text-gray-400">
                            Not available yet — updates once this call has ended.
                          </p>
                        ) : null}
                        {selectedBooking?.call_intent != null && (
                          // Only offered once the call has actually
                          // concluded (a `call_intent` exists) — matches
                          // interview-service's own eligibility check on
                          // POST /bookings/{id}/request-reschedule, so this
                          // is never offered somewhere the backend would
                          // just reject it.
                          <Button
                            className="mt-3 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                            disabled={isRequestingReschedule}
                            onClick={() => {
                              setRescheduleRound(selectedRound);
                              setIsRescheduleConfirmOpen(true);
                            }}
                          >
                            {isRequestingReschedule
                              ? 'Sending…'
                              : 'Create Booking (Reschedule Call)'}
                          </Button>
                        )}
                      </div>
                    </CommonCard>
                  )}

                  {selectedRoundIsVoiceCall && (bookingHistory?.length ?? 0) > 1 && (
                    // Only shown once there's actually more than one
                    // attempt — a single-entry "history" would just repeat
                    // the Call Outcome card above. `bookingHistory` is
                    // oldest-first; render it newest-first so the most
                    // recent (and most relevant) attempt reads first.
                    <CommonCard>
                      <div className="p-5">
                        <div className="text-xs font-semibold uppercase text-gray-400">
                          Reschedule History
                        </div>
                        <div className="mt-3 flex flex-col gap-3">
                          {[...(bookingHistory ?? [])].reverse().map((attempt, index) => {
                            // Positional, not a real field — `BookingView`
                            // doesn't expose `attempt_of`. `bookingHistory`
                            // is oldest-first before this reverse(), so the
                            // LAST entry after reversing is always the
                            // original (never itself a reschedule).
                            const isOriginal = index === (bookingHistory?.length ?? 1) - 1;
                            const actionTime = formatDateTime(attempt.created_at);
                            return (
                              <div
                                key={attempt.id}
                                className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                              >
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {index === 0
                                      ? 'Current attempt'
                                      : `Attempt ${bookingHistory!.length - index}`}
                                  </div>
                                  {actionTime && (
                                    <div className="text-xs text-gray-500">
                                      {isOriginal ? 'Created' : 'Rescheduled'} {actionTime}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400">
                                    {formatDateTime(attempt.start_time)
                                      ? `Scheduled for ${formatDateTime(attempt.start_time)}`
                                      : 'Not yet scheduled'}
                                  </div>
                                </div>
                                <span className="shrink-0 text-xs font-semibold text-primary-600">
                                  {formatCallIntent(attempt.call_intent)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CommonCard>
                  )}

                  {selectedRoundIsIntakeCall && (
                    // Same transcript-vs-resume authenticity signal shown on
                    // the Resume stage card (see that card's own comment) —
                    // surfaced here too since it's specifically about THIS
                    // round's call, not just the resume. Recruiters who land
                    // on the Intake Call round directly (its Pipeline card,
                    // not the Resume one) should see it without a detour.
                    <CommonCard>
                      <div className="p-5">
                        <div className="text-xs font-semibold uppercase text-gray-400">
                          Resume Consistency
                        </div>
                        <div className="mt-2 text-2xl font-bold text-primary">
                          {candidate?.consistency_score ?? '-'}
                        </div>
                        {candidate?.consistency_score_reason ? (
                          <p className="mt-1 text-sm text-gray-600">
                            {candidate.consistency_score_reason}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-gray-400">
                            Not available yet; reported by ai-service once it has both the resume
                            and this call&apos;s transcript.
                          </p>
                        )}
                      </div>
                    </CommonCard>
                  )}

                  {isPanelRound && (
                    <CommonCard>
                      <div className="p-5 flex flex-col gap-3">
                        <h4 className="font-semibold text-gray-900">Interview questions</h4>
                        <p className="text-sm text-gray-600">
                          Visible to whoever is preparing for or sitting on this panel.
                        </p>
                        {roundQuestions && roundQuestions.questions.length > 0 ? (
                          <ol className="list-decimal space-y-3 pl-5 text-sm">
                            {roundQuestions.questions.map((q) => (
                              <li key={q.id} className="text-gray-800">
                                {q.question_text}
                                {q.answer_text && (
                                  <p className="mt-0.5 text-xs text-gray-400">{q.answer_text}</p>
                                )}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-sm text-gray-400">
                            No questions have been added for this round yet.
                          </p>
                        )}
                      </div>
                    </CommonCard>
                  )}

                  {isAudioScreeningRound(selectedRound) && (
                    <CommonCard>
                      <div className="p-5 flex flex-col gap-3">
                        <h4 className="font-semibold text-gray-900">Questions asked</h4>
                        <p className="text-sm text-gray-600">
                          The real questions Vapi asked on this call, not the job&apos;s question
                          plan.
                        </p>
                        {isLoadingAudioScreeningQuestions ? (
                          <Loader />
                        ) : audioScreeningQuestionsError ? (
                          <p className="text-sm text-gray-400">
                            {'status' in audioScreeningQuestionsError &&
                            audioScreeningQuestionsError.status === 404
                              ? 'Questions will appear once the call completes.'
                              : 'Could not load the questions for this call right now.'}
                          </p>
                        ) : audioScreeningQuestions && audioScreeningQuestions.length > 0 ? (
                          <ol className="list-decimal space-y-3 pl-5 text-sm">
                            {audioScreeningQuestions.map((q) => (
                              <li key={q.id} className="text-gray-800">
                                {q.question_text}
                                {q.answer_text && (
                                  <p className="mt-0.5 text-xs text-gray-400">{q.answer_text}</p>
                                )}
                                {q.scoring_sections.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {q.scoring_sections.map((section) => (
                                      <Badge key={section} status="neutral" dot={false}>
                                        {section}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-sm text-gray-400">
                            No questions were recorded for this call.
                          </p>
                        )}
                      </div>
                    </CommonCard>
                  )}

                  <CommonCard>
                    <div className="p-5 flex flex-col gap-3">
                      <h4 className="font-semibold text-gray-900">Interview scheduling</h4>
                      {selectedRound.interview_booking_id ? (
                        <p className="text-sm text-gray-600">
                          This round has a booking. The candidate uses the booking link to choose a
                          time; audio and AI Video use available AI slots, while Panel uses the
                          connected calendar.
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">
                          Create a booking to start scheduling this round.
                        </p>
                      )}
                      {isPanelRound && !selectedRound.interview_booking_id && (
                        <PanelInterviewerPicker
                          id="panel-interviewer-select"
                          value={selectedInterviewerIds}
                          onChange={setSelectedInterviewerIds}
                          options={eligibleInterviewers ?? []}
                          loading={isLoadingInterviewers}
                          calendarConnectedById={interviewerCalendarConnectedById}
                          helperText="Pick at least one panel interviewer to enable Create Booking."
                        />
                      )}
                      <div className="flex flex-wrap gap-3">
                        <Button
                          className={`rounded-full px-5 py-2 text-sm font-semibold ${
                            selectedRound.interview_booking_id
                              ? 'border border-green-200 bg-green-50 text-green-700'
                              : 'bg-primary text-white'
                          }`}
                          disabled={
                            Boolean(selectedRound.interview_booking_id) ||
                            isCreatingBooking ||
                            isSavingInterviewers ||
                            (isPanelRound && selectedInterviewerIds.length === 0)
                          }
                          onClick={() => void handleCreateBooking()}
                        >
                          {isCreatingBooking || isSavingInterviewers
                            ? 'CREATING…'
                            : selectedRound.interview_booking_id
                              ? 'INVITATION CREATED'
                              : 'CREATE BOOKING'}
                        </Button>
                        {isPanelRound &&
                          (showsOwnConnectCalendarAction && calendarGrantStatus?.connected ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                              Calendar Connected
                              {calendarGrantStatus.email ? `: ${calendarGrantStatus.email}` : ''}
                            </span>
                          ) : (
                            <Button
                              className="rounded-full border border-primary-300 bg-white px-5 py-2 text-sm font-semibold text-primary-700"
                              onClick={handleConnectCalendar}
                            >
                              CONNECT CALENDAR
                            </Button>
                          ))}
                        {isPanelRound &&
                          selectedBooking != null &&
                          CONCLUDED_BOOKING_STATUSES.includes(selectedBooking.status) && (
                            // Same eligibility interview-service's own
                            // request-reschedule endpoint enforces for a
                            // PANEL booking (already concluded) — mirrors
                            // the Call Outcome card's button below, just
                            // gated on booking status instead of
                            // call_intent (PANEL has no call_intent).
                            <Button
                              className="rounded-full border border-primary-200 bg-primary-50 px-5 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50"
                              disabled={isRequestingReschedule}
                              onClick={() => {
                                setRescheduleRound(selectedRound);
                                setIsRescheduleConfirmOpen(true);
                              }}
                            >
                              {isRequestingReschedule ? 'Sending…' : 'Request reschedule'}
                            </Button>
                          )}
                        {/* Offline-PANEL only — an online PANEL round already
                            gets its recording automatically via LiveKit
                            egress, so manually attaching one there would just
                            create a second, conflicting artifact. Mirrors
                            BookingDetailDrawer.tsx's own `isOfflinePanel`. */}
                        {selectedRound.round_type === 'PANEL' &&
                          selectedRound.interview_booking_id &&
                          selectedBooking?.round_snapshot?.delivery_mode === 'offline' && (
                            <>
                              <input
                                ref={audioFileInputRef}
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => void handleAudioFileSelected(e)}
                              />
                              <Button
                                className={`rounded-full px-5 py-2 text-sm font-semibold ${
                                  hasRecording
                                    ? 'border border-green-200 bg-green-50 text-green-700'
                                    : 'border border-primary-300 bg-white text-primary-700'
                                }`}
                                disabled={isUploadingAudio || hasRecording}
                                onClick={() => audioFileInputRef.current?.click()}
                              >
                                {isUploadingAudio
                                  ? 'UPLOADING…'
                                  : hasRecording
                                    ? 'RECORDING UPLOADED'
                                    : 'UPLOAD AUDIO'}
                              </Button>
                            </>
                          )}
                      </div>
                    </div>
                  </CommonCard>
                </>
              )}
            </div>
          ) : null}

          {!selectedRound && activeTab === 'assessment' && (
            <CommonCard>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold">Resume Assessment</h3>
                  <Button
                    className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700"
                    onClick={() => setIsResumeReviewOpen(true)}
                  >
                    {candidate?.resume_rating ? 'EDIT REVIEW' : 'ADD REVIEW'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      AI Score
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {candidate?.resume_score ?? '-'}
                    </div>
                    {candidate?.scoring_reason && (
                      <p className="text-sm text-gray-600 mt-1">{candidate.scoring_reason}</p>
                    )}
                  </div>
                  <div>
                    {/* Same Intake Call consistency signal as the Pipeline tab's
                        resume-stage card — see that card's own comment. Kept in
                        sync deliberately; this tab and that one show the same
                        underlying resume data from two different entry points
                        (comment above `isResumeStage` explains why both exist). */}
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Intake Call Consistency
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {candidate?.consistency_score ?? '-'}
                    </div>
                    {candidate?.consistency_score_reason && (
                      <p className="text-sm text-gray-600 mt-1">
                        {candidate.consistency_score_reason}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Recruiter Review
                    </div>
                    {candidate?.resume_rating ? (
                      <>
                        <Rate disabled value={candidate.resume_rating} />
                        {candidate.resume_review_comment && (
                          <p className="text-sm text-gray-600 mt-1">
                            {candidate.resume_review_comment}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteResumeReview()}
                          className="mt-2 text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                        >
                          Remove review
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No review yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </CommonCard>
          )}

          {!selectedRound && activeTab === 'resume' && (
            <CommonCard>
              <div className="p-5 flex flex-col items-center gap-4 text-center">
                {candidate?.resume_s3_key ? (
                  <>
                    <p className="text-sm text-gray-600">A resume is on file for this candidate.</p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white"
                        onClick={() => setIsResumeViewerOpen(true)}
                      >
                        VIEW RESUME
                      </Button>
                      <Button
                        className="rounded-full border border-primary-200 bg-primary-50 px-6 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50"
                        onClick={() => void handleDownloadResume()}
                        disabled={isResumeUrlLoading}
                      >
                        {isResumeUrlLoading ? 'PREPARING…' : 'DOWNLOAD'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">No resume on file yet.</p>
                    <Button
                      className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      onClick={() => void handleRequestResumeUpload()}
                      disabled={isRequestingResumeUpload}
                    >
                      {isRequestingResumeUpload ? 'REQUESTING…' : 'REQUEST RESUME'}
                    </Button>
                  </>
                )}
              </div>
            </CommonCard>
          )}

          {!selectedRound && activeTab === 'summary' && (
            <div className="flex flex-col gap-4">
              {rounds.length === 0 ? (
                <p className="text-sm text-gray-500">No interview rounds recorded yet.</p>
              ) : (
                <>
                  <CommonCard>
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-gray-900">Scores across rounds</h3>
                      <div className="mt-4 h-28 rounded-lg bg-gradient-to-b from-primary-50 to-white px-2 pt-2">
                        <div className="flex h-full items-end gap-2 border-b border-gray-100">
                          {rounds.map((round, index) => {
                            // The resume stage / Intake Call rows have no
                            // `CandidateInterviewScore`; `summariseRound`
                            // substitutes the AI resume score and the
                            // consistency score respectively, and resolves
                            // `pct` against whichever scale that round's
                            // score actually uses (0-5 recruiter review vs
                            // 0-100 AI score) so the bar height moves with
                            // the real value instead of every AI-scored
                            // round rendering maxed out.
                            const { chartValue, pct, scoreText } = summariseRound(round);
                            return (
                              <div
                                key={round.id ?? `score-${index}`}
                                className="relative flex h-full flex-1 flex-col items-center justify-end"
                              >
                                <span
                                  className="w-full max-w-[10px] rounded-t bg-primary/25"
                                  style={{ height: `${pct}%` }}
                                />
                                <span
                                  className="absolute h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white"
                                  style={{ bottom: `${pct}%` }}
                                  title={
                                    chartValue == null ? 'No score recorded' : (scoreText ?? '')
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2 text-[10px] text-gray-400">
                        {rounds.map((round, index) => (
                          <span
                            key={round.id ?? `label-${index}`}
                            className="min-w-0 flex-1 truncate text-center"
                          >
                            {roundLabel(round)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CommonCard>

                  <CommonCard>
                    <div className="overflow-x-auto p-4">
                      <table className="w-full min-w-[620px] text-left text-sm">
                        <thead className="border-b border-gray-200 text-[10px] font-semibold uppercase text-gray-500">
                          <tr>
                            <th className="px-2 py-3">Round</th>
                            <th className="px-2 py-3">Interviewer</th>
                            <th className="px-2 py-3">Score</th>
                            <th className="px-2 py-3">Recommendation</th>
                            <th className="px-2 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {rounds.map((round, index) => {
                            const roundName = roundLabel(round);
                            const { roundScore, scoreText, statusText, outcomeLabel } =
                              summariseRound(round);
                            return (
                              <tr
                                key={round.id ?? `summary-${index}`}
                                className="border-b border-gray-100 last:border-0"
                              >
                                <td className="px-2 py-3 font-medium text-gray-800">{roundName}</td>
                                <td className="px-2 py-3 text-gray-500">
                                  {roundScore?.recruiter_scored_by ?? 'Not assigned'}
                                </td>
                                <td className="max-w-[260px] px-2 py-3 text-gray-700">
                                  {scoreText ?? statusText}
                                  {roundScore?.section_scores &&
                                    roundScore.section_scores.length > 0 && (
                                      <div className="mt-0.5 text-[11px] text-gray-400">
                                        {roundScore.section_scores
                                          .map((s) => `${s.key}: ${s.score}/10`)
                                          .join(' · ')}
                                      </div>
                                    )}
                                  {/* The AI's own reasoning behind `score` — same
                                      field/pairing as the Resume Assessment card's
                                      `candidate.scoring_reason` under
                                      `candidate.resume_score` above, just never
                                      carried over to this per-round table despite
                                      candidate-service returning it here too
                                      (CandidateInterviewScoreView.scoring_reason). */}
                                  {roundScore?.scoring_reason && (
                                    <div className="mt-0.5 text-[11px] text-gray-400">
                                      {roundScore.scoring_reason}
                                    </div>
                                  )}
                                </td>
                                <td className="px-2 py-3">
                                  {outcomeLabel ? (
                                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                      {outcomeLabel}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-2 py-3">
                                  {roundScore && (
                                    <Button
                                      className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700"
                                      onClick={() =>
                                        setScoreModalFor({
                                          scoreId: roundScore.id,
                                          roundName,
                                          currentScore: roundScore.recruiter_score,
                                          currentReason: roundScore.recruiter_score_reason,
                                        })
                                      }
                                    >
                                      {roundScore.recruiter_score ? 'EDIT' : 'SCORE'}
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CommonCard>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <CommonCard>
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">Interviewer Notes</h3>
                          <Button
                            className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-semibold text-primary-700"
                            onClick={() => setIsNotesOpen(true)}
                          >
                            + Add Note
                          </Button>
                        </div>
                        {notesData?.items[0] ? (
                          <p className="mt-4 border-l-2 border-primary px-3 text-sm text-gray-600">
                            {notesData.items[0].note}
                          </p>
                        ) : (
                          <p className="mt-4 text-sm text-gray-500">No notes yet at this step.</p>
                        )}
                      </div>
                    </CommonCard>
                    <CommonCard>
                      <div className="p-5">
                        <h3 className="text-sm font-semibold text-gray-900">AI Summary</h3>
                        <ul className="mt-4 space-y-1.5 text-sm leading-6 text-gray-600">
                          <li>
                            AI resume score:{' '}
                            <span className="font-semibold text-gray-800">
                              {candidate?.resume_score ?? 'pending'}
                            </span>
                          </li>
                          {planHasIntakeCall && (
                            <li>
                              Intake Call consistency:{' '}
                              <span className="font-semibold text-gray-800">
                                {candidate?.consistency_score ??
                                  'pending, reported once the call transcript and resume are both in'}
                              </span>
                            </li>
                          )}
                          <li>
                            {scores.length > 0
                              ? `${scores.length} interview score${scores.length === 1 ? '' : 's'} recorded across ${rounds.length} round${rounds.length === 1 ? '' : 's'}.`
                              : 'No interview-round scores yet; they appear here once a round produces a score or transcript.'}
                          </li>
                        </ul>
                      </div>
                    </CommonCard>
                  </div>
                </>
              )}
            </div>
          )}

          {!selectedRound && activeTab === 'sms' && (
            <CommonCard>
              <div className="p-5 flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-gray-500 max-w-md">
                  Message history isn&apos;t available yet; this sends a new SMS, it doesn&apos;t
                  show a conversation thread.
                </p>
                <Button
                  className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={() => setIsSmsOpen(true)}
                  disabled={!candidate?.contact_no}
                >
                  <LuSquarePen size={14} className="inline mr-2" />
                  SEND SMS
                </Button>
              </div>
            </CommonCard>
          )}
        </div>
      </div>

      {statusModal && candidate && (
        <ChangeCandidateStatusModal
          open={!!statusModal}
          onClose={() => setStatusModal(null)}
          mode={statusModal}
          candidates={[candidate]}
          onSuccess={() => setStatusModal(null)}
        />
      )}
      {candidate && (
        <>
          <BulkEmailCandidatesModal
            open={isEmailOpen}
            onClose={() => setIsEmailOpen(false)}
            candidates={[candidate]}
          />
          <BulkSendSmsModal
            open={isSmsOpen}
            onClose={() => setIsSmsOpen(false)}
            candidates={[candidate]}
          />
          <EditCandidateModal
            open={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            candidate={candidate}
          />
        </>
      )}
      <CandidateRecruiterNotesPanel
        open={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        title={`Candidate Notes - ${candidateDisplayName(candidate)}`}
        candidateId={candidateId}
      />
      {candidateId && (
        <ResumeReviewModal
          open={isResumeReviewOpen}
          onClose={() => setIsResumeReviewOpen(false)}
          onSaved={refetchCandidate}
          candidateId={candidateId}
          currentRating={candidate?.resume_rating ?? null}
          currentComment={candidate?.resume_review_comment ?? null}
        />
      )}
      {candidateId && (
        <ResumeViewerModal
          open={isResumeViewerOpen}
          onClose={() => setIsResumeViewerOpen(false)}
          candidateId={candidateId}
          candidateName={candidateDisplayName(candidate)}
        />
      )}
      {isRescheduleConfirmOpen && isRescheduleRoundPanel && rescheduleStep === 'choice' && (
        // PANEL's own first step — carrying the roster forward is a plain
        // POST with no body (backend does it automatically), so "keep the
        // same interviewers" fires the reschedule immediately instead of
        // asking for a second confirmation on top of this one.
        <AntdCommonModal
          title="Request reschedule"
          subtitle="Keep this round's current panel, or pick different interviewers for the new attempt?"
          open
          onClose={() => {
            setIsRescheduleConfirmOpen(false);
            setRescheduleRound(null);
          }}
          modalProps={{ width: 480 }}
        >
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              onClick={() => void handleRequestCallReschedule()}
              disabled={isRequestingReschedule}
              className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
            >
              {isRequestingReschedule ? 'Sending…' : 'Keep the same interviewers'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setRescheduleInterviewerIds(rescheduleRound?.interviewer_ids ?? []);
                setRescheduleStep('picker');
              }}
              disabled={isRequestingReschedule}
              className="w-full rounded-full border border-primary-200 bg-primary-50 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-primary-700 disabled:opacity-50"
            >
              Choose different interviewers
            </Button>
          </div>
        </AntdCommonModal>
      )}
      {isRescheduleConfirmOpen && isRescheduleRoundPanel && rescheduleStep === 'picker' && (
        // Same picker UI as the initial Create Booking flow (colored by
        // calendar-connect status) — just feeding `request-reschedule`'s
        // `interviewer_ids` instead of `createBooking`'s.
        <AntdCommonModal
          title="Choose different interviewers"
          subtitle="This new attempt will be scheduled with the roster picked below."
          open
          onClose={() => {
            setIsRescheduleConfirmOpen(false);
            setRescheduleRound(null);
          }}
          modalProps={{ width: 560 }}
        >
          <div className="flex flex-col gap-4">
            <PanelInterviewerPicker
              id="reschedule-interviewer-select"
              value={rescheduleInterviewerIds}
              onChange={setRescheduleInterviewerIds}
              options={eligibleInterviewers ?? []}
              loading={isLoadingInterviewers}
              calendarConnectedById={interviewerCalendarConnectedById}
              helperText="Pick at least one panel interviewer to request the reschedule."
            />
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setRescheduleStep('choice')}
                disabled={isRequestingReschedule}
                className="flex-1 rounded-full border border-gray-200 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-gray-600 disabled:opacity-50"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => void handleRequestCallReschedule(rescheduleInterviewerIds)}
                disabled={isRequestingReschedule || rescheduleInterviewerIds.length === 0}
                className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
              >
                {isRequestingReschedule ? 'Sending…' : 'Request reschedule'}
              </Button>
            </div>
          </div>
        </AntdCommonModal>
      )}
      {isRescheduleConfirmOpen && !isRescheduleRoundPanel && (
        <ConfirmationModal
          onClose={() => {
            setIsRescheduleConfirmOpen(false);
            setRescheduleRound(null);
          }}
          onConfirm={() => void handleRequestCallReschedule()}
          title={
            // Resume-consistency scoring is Intake Call (AUDIO) specific —
            // Audio Screening/AI Video rounds don't have one, so this
            // clause would be misleading there. Driven by `rescheduleRound`,
            // not `selectedRound` — this modal can open straight from a
            // PipelineBoard card, before any round is "selected".
            rescheduleRound &&
            isIntakeCallRound(rescheduleRound) &&
            candidate?.consistency_score != null
              ? `Requesting a reschedule will email the candidate a new link, valid for 24 hours. Once they complete the new call, the resume-consistency score will be recalculated from it and will overwrite the current score (${candidate.consistency_score} / 10).`
              : rescheduleRound && isIntakeCallRound(rescheduleRound)
                ? 'Requesting a reschedule will email the candidate a new link, valid for 24 hours. Once they complete the new call, a resume-consistency score will be calculated from it.'
                : 'Requesting a reschedule will email the candidate a new link, valid for 24 hours.'
          }
          confirmText="REQUEST RESCHEDULE"
          cancelText="CANCEL"
          isLoading={isRequestingReschedule}
        />
      )}
      {scoreModalFor && candidateId && (
        <RecruiterRoundScoreModal
          open={!!scoreModalFor}
          onClose={() => setScoreModalFor(null)}
          candidateId={candidateId}
          scoreId={scoreModalFor.scoreId}
          roundName={scoreModalFor.roundName}
          currentScore={scoreModalFor.currentScore}
          currentReason={scoreModalFor.currentReason}
        />
      )}
    </>
  );
};

export default CandidateDetails;
