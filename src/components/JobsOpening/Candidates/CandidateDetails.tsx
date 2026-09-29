import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Rate, Select, Tabs, Tooltip } from 'antd';
import type { RootState } from '../../../redux/provider/store';
import dayjs from 'dayjs';
import {
  LuMail,
  LuPencil,
  LuThumbsDown,
  LuThumbsUp,
  LuMic,
  LuVideo,
  LuUsers,
  LuFileText,
} from 'react-icons/lu';
import { IoChatbubbleEllipses } from 'react-icons/io5';
import { CommonCard, Button, Badge, InfoHint, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import CollapseToggle from '../../shared/ui/CollapseToggle';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import WidgetErrorBoundary from '../../shared/ui/WidgetErrorBoundary';
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
  useResendResumeUploadLinkMutation,
} from '../../../api/candidate-service/Candidates/scoring';
import { useListRecruiterNotesQuery } from '../../../api/candidate-service/Candidates/notes';
import { useListApplicationSourcesQuery } from '../../../api/candidate-service/Master/master';
import { candidateStatusColor } from './candidateDisplay';
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
  useGetQuestionsAskedQuery,
  CONCLUDED_BOOKING_STATUSES,
  type InterviewApiError,
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
import RoundSidebarItem from './RoundSidebarItem';
import RoundArtifactsModal from './Modal/RoundArtifactsModal';
import PanelInterviewersModal from './Modal/PanelInterviewersModal';
import {
  summarisePipeline,
  isResumeScored,
  hasRoundRecordings,
  canManageRoundInterviewers,
  HUMAN_SCORE_MAX,
  AI_SCORE_MAX,
  aiScorePercent,
  interviewTypeForRound,
} from './roundPipeline';
import ResumeInlinePreview from './ResumeInlinePreview';
import CandidateMessageHistory from './CandidateMessageHistory';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import { useSessionTenantId } from '../../../hooks/useSessionTenantId';
import {
  idsMatch,
  tenantJobTitleFormId,
  useListTenantDepartmentJobTitlesQuery,
  useListTenantJobTitleCatalogueQuery,
} from '../../../api/organization-service/Tenants/jobTitles';
import { roundLabel, formatRoundStatus, formatCallIntent } from './roundDisplay';
import {
  resolveCurrentRound,
  isRoundConcluded,
  isAiVideoRound,
  isAudioScreeningRound,
  isIntakeCallRound,
  isResumeStageRound,
  isStaleResumeRound,
  normaliseRoundStatus,
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
//
// Layout (2026-09-29) follows the old app's page shape again: a header card
// with info / "Scored" (one row per real round) / actions columns, the
// then the old four tabs — Candidate
// Details (the former Resume tab, plus read-only candidate fields and an
// inline preview), Assessment (old round sidebar + the same round detail the
// round sidebar), Interview Scheduling (the former Interview
// Summary tab) and SMS Communication.

type TabKey = 'details' | 'assessment' | 'scheduling' | 'sms';

// Sidebar entry shown when the pipeline has no resume-stage round of its own
// (e.g. rounds not loaded / plan without one), so the Resume Assessment card
// is always reachable from the Assessment tab.
const RESUME_FALLBACK_KEY = 'resume-fallback';

const candidateHeaderIconCircle =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--primary)] transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40';

const candidateDisplayName = (c?: CandidateView) =>
  `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'N/A';

const formatDateTime = (value: string | null | undefined) =>
  value && dayjs(value).isValid() ? dayjs(value).format('MMM DD, YYYY · h:mm A') : null;

const formatStatus = (status: string) =>
  status.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

/** "Scored" table cell — AI scores (resume, consistency, round) are out of
 * AI_SCORE_MAX, the recruiter's Human score out of HUMAN_SCORE_MAX (`outOf`).
 * `undefined` means the column doesn't apply to
 * that round at all (e.g. no human score exists for the Intake Call's
 * consistency check), `null` means it applies but nothing's recorded yet. */
const formatScoredCell = (value: number | null | undefined, outOf = AI_SCORE_MAX) =>
  value === undefined ? '-' : value === null ? 'N/A' : `${value}/${outOf}`;

/** One label/value line in the header card's info column. */
const HeaderInfoRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-start gap-2 text-sm">
    <p className="shrink-0 font-bold">{label}</p>
    <div className="min-w-0 break-words text-gray-500">{children}</div>
  </div>
);

/** interview-service's client throws its own `InterviewApiError` (message/
 * code as plain properties on the error itself), NOT the `{status, data}`
 * shape `getCandidateErrorMessage`/`getPlatformErrorCode` are built to read
 * off candidate-service/other platform services — those helpers always read
 * `undefined` against it and silently fall back to the generic message, no
 * matter what the backend actually said. Every catch block below a call
 * imported from `api/interview-service/client` must use this instead. */
const getInterviewErrorMessage = (error: unknown, fallback: string): string =>
  (error as InterviewApiError)?.message || fallback;

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
    <label htmlFor={id} className="mb-1 flex items-center gap-1.5 text-sm text-gray-800">
      Interviewer(s) <span className="required-asterisk">*</span>
      <InfoHint content="Dot color shows calendar status: green = calendar connected, red = calendar not connected, gray = status not loaded yet." />
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
  // the interviewer straight on the scores/feedback tab (now "Interview
  // Scheduling") instead of always defaulting to Assessment. Read once via
  // useState's lazy initializer so the page never flashes the wrong tab
  // before switching. `'3'` covers a legacy numeric value (ActivityFeed.tsx
  // still sends it); `summary`/`resume` are the pre-2026-09-29 tab keys,
  // mapped onto the tabs that now hold that content.
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tabParam = searchParams.get('tab');
    const validTabs: TabKey[] = ['details', 'assessment', 'scheduling', 'sms'];
    if (tabParam && validTabs.includes(tabParam as TabKey)) return tabParam as TabKey;
    if (tabParam === 'summary' || tabParam === '3') return 'scheduling';
    if (tabParam === 'resume') return 'details';
    return 'assessment';
  });
  const [statusModal, setStatusModal] = useState<ChangeCandidateStatusMode | null>(null);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isResumeReviewOpen, setIsResumeReviewOpen] = useState(false);
  const [isResumeViewerOpen, setIsResumeViewerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  // The round picked in the Assessment tab's sidebar. Stored as picked (and
  // updated optimistically after Create Booking), but read through
  // `selectedRound` below, which swaps in the latest polled copy of the same
  // round so the detail panel never lags the sidebar's live status.
  const [pickedRound, setSelectedRound] = useState<CandidateInterviewRoundView | null>(null);
  const [isResumeFallbackSelected, setIsResumeFallbackSelected] = useState(false);
  // Round-card actions that now live in the round detail's action row.
  const [artifactsModalFor, setArtifactsModalFor] = useState<CandidateInterviewRoundView | null>(
    null
  );
  const [interviewersModalFor, setInterviewersModalFor] =
    useState<CandidateInterviewRoundView | null>(null);
  // Hiring Panel's reference question list defaults open (it's the main
  // reason a panelist opens this card) but can be collapsed once reviewed.
  const [isPanelQuestionsOpen, setIsPanelQuestionsOpen] = useState(true);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  // PANEL round interviewer picker, inline above Create Booking — seeded
  // from whatever's already saved on the round (e.g. set earlier from
  // the action row's Set Interviewers modal) whenever the selected
  // round changes, below.
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
  // Which attempt's booking the "Questions asked" card (and its Reschedule
  // History row highlight) should read from — null means "the current
  // attempt", i.e. `selectedRound.interview_booking_id`. Set by clicking a
  // row in Reschedule History; reset below whenever the round changes so a
  // stale attempt from a previously-viewed round can't leak in.
  const [selectedAttemptBookingId, setSelectedAttemptBookingId] = useState<string | null>(null);
  // Confirmation gate before requesting a reschedule — the candidate's
  // resume-consistency score is recalculated from whatever call actually
  // ends up happening, so a recruiter needs to know the current score (if
  // any) is about to be replaced before they commit to a new call.
  const [isRescheduleConfirmOpen, setIsRescheduleConfirmOpen] = useState(false);
  // Which round the confirm modal/mutation actually act on — deliberately
  // separate from `selectedRound`. The Call Outcome card's own button sets
  // this to `selectedRound` (same round already open), but the reschedule
  // per-card "Request reschedule" button needs to trigger the exact same
  // flow is shared by every entry point.
  const [rescheduleRound, setRescheduleRound] = useState<CandidateInterviewRoundView | null>(null);
  // PANEL reschedules get an extra "keep the same roster, or pick a new
  // one?" step the generic ConfirmationModal below doesn't ask — backend
  // carries the original roster forward automatically on an empty body, so
  // this is purely a UI decision point, not something the API requires an
  // answer to. `rescheduleRound.round_type`, not `isPanelRound` — this can
  // open for a round that isn't the
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

  // `candidate.source` is the raw master-data code (e.g. "qr_self_apply");
  // shown as its label from candidate-service's own list, same lookup
  // CandidatesListing.tsx uses, falling back to the code itself.
  const { data: applicationSources = [] } = useListApplicationSourcesQuery();
  const sourceLabel = candidate?.source
    ? (applicationSources.find((s) => s.code === candidate.source)?.label ?? candidate.source)
    : null;

  const { data: jobOpeningData } = useGetJobOpeningByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !parsedJobId }
  );

  // Header's Job Title / Hiring Manager lines. job-service only stores ids
  // for both, so names are resolved the same way ViewJobDetails.tsx does:
  // tenant job-title catalogue (falling back to the department's own
  // titles) and the tenant user list behind the Hiring Manager dropdown.
  const tenantId = useSessionTenantId();
  const jobTitleId = jobOpeningData?.data?.jobTitle?.[0]?.id;
  const jobDepartmentId = jobOpeningData?.data?.department?.[0]?.id;
  const { data: jobTitleCatalogue = [] } = useListTenantJobTitleCatalogueQuery(tenantId ?? '', {
    skip: !tenantId || !jobTitleId,
  });
  const { data: departmentJobTitles = [] } = useListTenantDepartmentJobTitlesQuery(
    { tenantId: tenantId ?? '', departmentId: String(jobDepartmentId) },
    { skip: !tenantId || !jobDepartmentId || !jobTitleId }
  );
  const jobTitleName = jobTitleId
    ? jobTitleCatalogue.find((jt) => idsMatch(jt.job_title_id, jobTitleId))?.name ||
      departmentJobTitles.find(
        (jt) =>
          idsMatch(tenantJobTitleFormId(jt), jobTitleId) ||
          idsMatch(jt.org_job_title_id, jobTitleId)
      )?.name ||
      null
    : null;
  const hiringManagerIds = (jobOpeningData?.data?.hiringManagers ?? []).map(String);
  const { jobOpeningDropdown: hiringManagerOptions } = useJobOpeningDropdown(
    'HIRING_MANAGER',
    'view',
    undefined,
    hiringManagerIds.length === 0
  );
  const hiringManagerNames = hiringManagerOptions
    .filter((option) => hiringManagerIds.some((id) => idsMatch(option.id, id)))
    .map((option) => option.name);

  const { data: rawRounds = [], isSuccess: roundsLoaded } = useListCandidateInterviewRoundsQuery(
    candidateId ?? '',
    {
      skip: !candidateId,
      // A round's own status (e.g. PANEL flipping to "Scheduled" once the
      // candidate actually books a time after every interviewer connects
      // their calendar) changes from a backend event chain, not from
      // anything clicked on this screen — poll so the Pipeline board catches
      // up without a manual refresh, same reasoning as useGetCandidateQuery.
      pollingInterval: 20_000,
      skipPollingIfUnfocused: true,
    }
  );
  // The instant-call flow (Intake Call first, resume within 24h) and the
  // resume-first flow get the SAME plan-level round order from the backend —
  // it places the resume stage at the job plan's single Resume Round
  // position, which can't differ per candidate. Reorder client-side, driven
  // by the resume stage's own `follows_intake_call` flag (candidate-service
  // migration 0023 — the per-candidate fact for this), so an instant-call
  // candidate's pipeline reads Intake Call → Resume Review.
  const rounds = orderRoundsForFlow(rawRounds).filter((r) => !isStaleResumeRound(r));
  const hasResumeStageRound = rounds.some(isResumeStageRound);
  // candidate-service reports the resume stage as `resume_upload_expired`
  // once the candidate's 24h upload window closed with no resume — the one
  // case its resend-upload-link endpoint accepts (409 otherwise).
  const resumeUploadLinkExpired = rounds.some(
    (r) => isResumeStageRound(r) && normaliseRoundStatus(r.status) === 'resume_upload_expired'
  );

  // Latest polled copy of the picked round, keeping the optimistic booking /
  // interviewer fields `handleCreateBooking` set until the poll catches up.
  const liveRound = pickedRound ? rounds.find((r) => r.id === pickedRound.id) : undefined;
  const selectedRound = useMemo<CandidateInterviewRoundView | null>(() => {
    if (!pickedRound) return null;
    if (!liveRound) return pickedRound;
    return {
      ...liveRound,
      interview_booking_id: liveRound.interview_booking_id ?? pickedRound.interview_booking_id,
      interviewer_ids:
        (liveRound.interviewer_ids ?? []).length > 0
          ? liveRound.interviewer_ids
          : pickedRound.interviewer_ids,
    };
  }, [pickedRound, liveRound]);

  // Assessment tab always has something selected in its sidebar, like the
  // old app (which opened on Resume Screening): the first round, or the
  // Resume Assessment fallback entry when there's no resume-stage round.
  // Only runs while nothing is picked, so it never overrides a real choice.
  useEffect(() => {
    if (activeTab !== 'assessment' || !roundsLoaded) return;
    // The fallback entry only exists while there's no resume-stage round.
    if (isResumeFallbackSelected && hasResumeStageRound) {
      setIsResumeFallbackSelected(false);
      return;
    }
    if (selectedRound || isResumeFallbackSelected) return;
    if (!hasResumeStageRound) {
      setIsResumeFallbackSelected(true);
    } else if (rounds.length > 0) {
      setSelectedRound(rounds[0]);
    }
  }, [
    activeTab,
    roundsLoaded,
    selectedRound,
    isResumeFallbackSelected,
    hasResumeStageRound,
    rounds,
  ]);
  const { data: scores = [] } = useListCandidateInterviewScoresQuery(candidateId ?? '', {
    skip: !candidateId,
  });
  // Same args as CandidateRecruiterNotesPanel's own list query (limit 100),
  // so both share one cached request. Used for the header Notes badge count
  // (the API returns no total, so the count is the list's length — was
  // `limit: 1`, which capped the badge at 1) and the latest note shown on
  // the Interview Scheduling tab (`items[0]`).
  const { data: notesData } = useListRecruiterNotesQuery(
    { candidateId: candidateId ?? '', limit: 100 },
    { skip: !candidateId }
  );
  const [deleteResumeReview] = useDeleteResumeReviewMutation();
  const [getResumeDownload, { isLoading: isResumeUrlLoading }] =
    useLazyGetCandidateResumeDownloadQuery();
  const [resendResumeUploadLink, { isLoading: isResendingUploadLink }] =
    useResendResumeUploadLinkMutation();
  const [createBooking] = useCreateBookingMutation();
  // `round_type` first (candidate-service's real classification), round
  // name only for an unclassifiable round — same rule as
  // `interviewTypeForRound`.
  const isPanelRound = selectedRound
    ? selectedRound.round_type
      ? selectedRound.round_type === 'PANEL'
      : Boolean(selectedRound.round_name?.toLowerCase().includes('panel'))
    : false;
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
  // `rescheduleRound` — opened for a round without
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
  // Reschedule History defaults to showing the current attempt whenever a
  // different round is opened, rather than carrying over whichever past
  // attempt was selected on the last round drilled into.
  useEffect(() => {
    setSelectedAttemptBookingId(null);
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
  // The real questions Vapi asked on this call — distinct from job-service's
  // static per-round question bank (`roundQuestions` below), which is a
  // fixed plan, not what actually got asked. Only called for AUDIO/
  // AUDIO_SCREENING rounds — PANEL and AI_VIDEO reject this endpoint with a
  // 422 SESSION_NOT_AVAILABLE, so it's never worth requesting for them.
  const isVoiceScreeningRound =
    !!selectedRound && (isAudioScreeningRound(selectedRound) || isIntakeCallRound(selectedRound));
  // Whichever attempt is selected in Reschedule History, falling back to the
  // current attempt's booking — the endpoint takes any booking id, not just
  // the current one, so past attempts' questions are just as reachable.
  const questionsAskedBookingId =
    selectedAttemptBookingId ?? selectedRound?.interview_booking_id ?? '';
  const {
    data: questionsAsked,
    error: questionsAskedError,
    isLoading: isLoadingQuestionsAsked,
  } = useGetQuestionsAskedQuery(questionsAskedBookingId, {
    skip: !isVoiceScreeningRound || !questionsAskedBookingId,
  });
  // Every past attempt for this round, not just the current one — see
  // getBookingHistory's own docstring for why interview-service, not
  // candidate-service, is the only place this survives a reschedule.
  const { data: bookingHistory } = useGetBookingHistoryQuery(
    selectedRound?.interview_booking_id ?? '',
    { skip: !selectedRound?.interview_booking_id }
  );
  // Same "Current attempt" / "Attempt N" labeling as the Reschedule History
  // rows below, so the Questions Asked card can say which attempt it's
  // showing — same reversed, newest-first numbering those rows use.
  const questionsAskedAttemptLabel = useMemo(() => {
    if (!selectedAttemptBookingId) return null;
    const reversed = [...(bookingHistory ?? [])].reverse();
    const index = reversed.findIndex((attempt) => attempt.id === selectedAttemptBookingId);
    if (index <= 0) return null;
    return `Attempt ${reversed.length - index}`;
  }, [selectedAttemptBookingId, bookingHistory]);
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
        message: getInterviewErrorMessage(error, 'Could not upload the recording.'),
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

  const handleResendUploadLink = async () => {
    if (!candidateId) return;
    try {
      await resendResumeUploadLink(candidateId).unwrap();
      showToast({
        message: 'A new upload link has been emailed to the candidate, valid for 24 hours.',
        type: 'success',
      });
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not resend the upload link'),
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
        message: getInterviewErrorMessage(e, 'Could not request a reschedule'),
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
      showToast({ message: 'Scoring removed.', type: 'success' });
      // Explicit on top of `deleteResumeReview`'s own tag invalidation —
      // same belt-and-suspenders reasoning as `refetchCandidate` after
      // saving a review below.
      refetchCandidate();
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not remove scoring'),
        type: 'error',
      });
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
    const interviewType = interviewTypeForRound(selectedRound);
    try {
      // Saved to the round FIRST — same data the Set Interviewers
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
      // interview-service's own PREVIOUS_ROUND_NOT_CONCLUDED message is
      // log-style (round numbers, raw candidate/job UUIDs) — not something to
      // put in a toast, so this one case gets a hand-written message instead
      // of the backend's own wording. `error.code`/`error.message` directly
      // — this is an `InterviewApiError` (see getInterviewErrorMessage's own
      // comment), not the `{status, data}` shape `getPlatformErrorCode`
      // reads, which silently never matched here.
      const message =
        (error as InterviewApiError)?.code === 'PREVIOUS_ROUND_NOT_CONCLUDED'
          ? 'Please complete the previous round before scheduling this one.'
          : getInterviewErrorMessage(error, 'Could not create booking.');
      showToast({ message, type: 'error' });
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
  // Reusing the one shared definition means this file's round detail and
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
  // Same lookup the Scores tab's summary table uses per round (`scores.find`
  // inside `summariseRound`, below) — kept as its own value here so the
  // round detail can show this round's own AI Assessment card without
  // duplicating that table's chart/status branching, which this card
  // doesn't need.
  const selectedRoundScore = selectedRound
    ? scores.find((s) => s.candidate_interview_round_id === selectedRound.id)
    : undefined;
  // Same "score already sitting here means reviewed and ready to move on"
  // read as roundPipeline.ts's `isResumeScored` — the resume
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
  // MARK SELECTED shouldn't be clickable mid-pipeline — `resolveCurrentRound`
  // returning null means every real round has actually been marked
  // `completed` (the same "nothing left for ADVANCE to do" signal
  // `advanceDisabled` above is built on), i.e. the candidate has reached and
  // concluded the last round. `rounds.length > 0` guards a candidate whose
  // plan hasn't loaded/has no rounds yet, which would otherwise trivially
  // satisfy "nothing outstanding".
  const allRoundsCompleted = rounds.length > 0 && currentRound === null;
  // MARK AS SELECTED also appears once the candidate is ON their last round
  // (2026-09-29 product decision) — no need to ADVANCE past it first.
  // `rounds` is already in walk order (orderRoundsForFlow), so "last" is
  // the final entry.
  const isOnLastRound =
    currentRound !== null && rounds.length > 0 && currentRound.id === rounds[rounds.length - 1].id;

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
  const intakeLockReason =
    'Unlocks once the Intake Call consistency check completes (comparing the call transcript against the resume).';

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
        // Resume score is 0-AI_SCORE_MAX (ai-service's score_resume.py), not
        // 0-100 — scale up for the bar height.
        pct: candidate?.resume_score == null ? 0 : aiScorePercent(candidate.resume_score),
        scoreText: scored ? `${candidate?.resume_score} / ${AI_SCORE_MAX} · AI resume score` : null,
        statusText: scored ? 'Completed' : formatStatus(round.status),
        outcomeLabel: scored ? 'Scored' : null,
      };
    }
    if (isIntakeCallRound(round)) {
      const checked = candidate?.consistency_score != null;
      return {
        roundScore,
        chartValue: candidate?.consistency_score ?? null,
        // Consistency score is 0-AI_SCORE_MAX (ai-service's
        // check_intake_call_consistency.py), not 0-100 — scale up for the
        // bar height.
        pct: candidate?.consistency_score == null ? 0 : aiScorePercent(candidate.consistency_score),
        scoreText: checked
          ? `${candidate?.consistency_score} / ${AI_SCORE_MAX} · resume consistency`
          : null,
        statusText: formatRoundStatus(round.status),
        outcomeLabel: checked ? 'Checked' : null,
      };
    }
    // The AI score and the recruiter's 1-5 stars share the same 0-5 range,
    // so either one scales the bar directly.
    const barScore = roundScore?.recruiter_score ?? roundScore?.score ?? null;
    const pct = barScore != null ? aiScorePercent(barScore) : 0;
    // The AI score is never replaced by a recruiter score - the backend
    // deliberately keeps both (a disagreement is worth keeping, not
    // discarding) - so show both when both exist instead of picking one.
    const scoreText =
      roundScore?.score != null && roundScore?.recruiter_score != null
        ? `AI: ${roundScore.score} / ${AI_SCORE_MAX} · Recruiter: ${roundScore.recruiter_score} / ${HUMAN_SCORE_MAX}`
        : roundScore?.recruiter_score != null
          ? `Recruiter: ${roundScore.recruiter_score} / ${HUMAN_SCORE_MAX}`
          : roundScore?.score != null
            ? `AI: ${roundScore.score} / ${AI_SCORE_MAX}`
            : null;
    return {
      roundScore,
      chartValue: recruiterOrAiScore,
      pct,
      scoreText,
      statusText: formatRoundStatus(round.status),
      outcomeLabel: roundScore
        ? roundScore.recruiter_score != null
          ? 'Recruiter scored'
          : 'AI scored'
        : null,
    };
  };

  // Header card's "Scored" table — one row per real round, same per-round
  // sources `summariseRound` reads (resume stage: AI resume score + the
  // recruiter's resume review; Intake Call: the consistency check, which has
  // no human counterpart; every other round: its AI score + recruiter score).
  const scoredRows: {
    key: string;
    label: string;
    ai: number | null;
    human: number | null | undefined;
    aiHint?: string;
    /** Left out of the Overall Score average — see `overallScore` below. */
    excludeFromOverall?: boolean;
  }[] = [
    ...(roundsLoaded && !hasResumeStageRound
      ? [
          {
            key: RESUME_FALLBACK_KEY,
            label: 'Resume Screening',
            ai: candidate?.resume_score ?? null,
            human: candidate?.resume_rating ?? null,
          },
        ]
      : []),
    ...rounds.map((round) => {
      if (isResumeStageRound(round)) {
        return {
          key: round.id,
          label: roundLabel(round),
          ai: candidate?.resume_score ?? null,
          human: candidate?.resume_rating ?? null,
        };
      }
      if (isIntakeCallRound(round)) {
        return {
          key: round.id,
          label: roundLabel(round),
          ai: candidate?.consistency_score ?? null,
          human: undefined,
          aiHint: 'Resume consistency score (call transcript vs. resume)',
          excludeFromOverall: true,
        };
      }
      const roundScore = scores.find((s) => s.candidate_interview_round_id === round.id);
      return {
        key: round.id,
        label: roundLabel(round),
        ai: roundScore?.score ?? null,
        human: roundScore?.recruiter_score ?? null,
      };
    }),
  ];

  // Assessment tab's round sidebar + summary bar (was the round-card row).
  const pipeline = summarisePipeline(rounds, scores, candidate?.resume_score ?? null);

  // "Overall Score" row — per column, the average of every round that has a
  // score in that column (rounds with nothing recorded yet don't drag it
  // down). The Intake Call's consistency check is left out: it's a
  // transcript-vs-resume authenticity signal, not a performance score, and
  // the Assessment tab's "Avg. score so far" excludes it for the same reason.
  const averageOf = (values: (number | null | undefined)[]) => {
    const scored = values.filter((v): v is number => typeof v === 'number');
    return scored.length > 0
      ? Number((scored.reduce((sum, v) => sum + v, 0) / scored.length).toFixed(1))
      : null;
  };
  const overallRows = scoredRows.filter((row) => !row.excludeFromOverall);
  const overallScore = {
    ai: averageOf(overallRows.map((row) => row.ai)),
    human: averageOf(overallRows.map((row) => row.human)),
  };

  if (candidateError) {
    return (
      <p className="p-4 text-sm text-red-500">
        {getCandidateErrorMessage(candidateError, 'Failed to load candidate.')}
      </p>
    );
  }

  // The selected round's full detail (score, call outcome, reschedule
  // history, questions, booking/calendar/recording actions). Rendered in
  // the Assessment tab's right panel, for the round picked in its sidebar.
  const roundDetailBody = selectedRound ? (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
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
            <h3 className="text-lg font-bold text-gray-900">{roundLabel(selectedRound)}</h3>
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
          <div className="p-4 grid gap-4 sm:grid-cols-3">
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
                <p className="mt-1 text-sm text-gray-600">{candidate.consistency_score_reason}</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase text-gray-400">
                  Recruiter Scoring
                </div>
                <Button
                  className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700"
                  onClick={() => setIsResumeReviewOpen(true)}
                >
                  {candidate?.resume_rating ? 'EDIT SCORING' : 'ADD SCORING'}
                </Button>
              </div>
              {candidate?.resume_rating ? (
                <>
                  <Rate disabled value={candidate.resume_rating} className="mt-2" />
                  {candidate.resume_review_comment && (
                    <p className="mt-1 text-sm text-gray-600">{candidate.resume_review_comment}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDeleteResumeReview()}
                    className="mt-2 block text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                  >
                    Remove scoring
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-400">No scoring yet.</p>
              )}
            </div>
          </div>
        </CommonCard>
      ) : (
        <>
          {/* Scheduling actions sit directly under the round title — every
              button a recruiter acts on here (book, connect calendar,
              reschedule, upload audio) is reachable without scrolling past
              the scores and question lists below. */}
          <CommonCard>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-64">
                  <h4 className="font-semibold text-gray-900">Interview scheduling</h4>
                  {selectedRound.interview_booking_id ? (
                    <p className="mt-0.5 text-sm text-gray-600">
                      This round has a booking. The candidate uses the booking link to choose a time{' '}
                      {isPanelRound
                        ? 'from the panel’s connected calendar.'
                        : isAiVideoRound(selectedRound)
                          ? 'from the available AI Video slots.'
                          : isAudioScreeningRound(selectedRound) || isIntakeCallRound(selectedRound)
                            ? 'from the available AI audio slots.'
                            : 'from the available slots.'}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-gray-600">
                      Create a booking to start scheduling this round.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
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
                  {canManageRoundInterviewers(selectedRound) && (
                    // Saves the panel roster straight to the round
                    // (PanelInterviewersModal) — was the round card's
                    // "Set interviewers ›" link.
                    <Button
                      className="rounded-full border border-primary-300 bg-white px-4 py-1.5 text-sm font-semibold text-primary-700"
                      onClick={() => setInterviewersModalFor(selectedRound)}
                    >
                      {(selectedRound.interviewer_ids ?? []).length > 0
                        ? `INTERVIEWERS (${(selectedRound.interviewer_ids ?? []).length})`
                        : 'SET INTERVIEWERS'}
                    </Button>
                  )}
                  {isPanelRound &&
                    (showsOwnConnectCalendarAction && calendarGrantStatus?.connected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-700">
                        Calendar Connected
                        {calendarGrantStatus.email ? `: ${calendarGrantStatus.email}` : ''}
                      </span>
                    ) : (
                      <Button
                        className="rounded-full border border-primary-300 bg-white px-4 py-1.5 text-sm font-semibold text-primary-700"
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
                        className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700 disabled:opacity-50"
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
                          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
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
                  {selectedRoundIsVoiceCall && selectedBooking?.call_intent != null && (
                    // Only offered once the call has actually
                    // concluded (a `call_intent` exists) — matches
                    // interview-service's own eligibility check on
                    // POST /bookings/{id}/request-reschedule, so this
                    // is never offered somewhere the backend would
                    // just reject it. Lives in this top action row
                    // (not the Call Outcome card) so it needs no scrolling.
                    <Button
                      className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                      disabled={isRequestingReschedule}
                      onClick={() => {
                        setRescheduleRound(selectedRound);
                        setIsRescheduleConfirmOpen(true);
                      }}
                    >
                      {isRequestingReschedule ? 'Sending…' : 'Create Booking (Reschedule Call)'}
                    </Button>
                  )}
                  {/* Every attempt's recording + transcript and the
                      candidate's own feedback (RoundArtifactsModal) — was the
                      round card's "View recording & transcript ›" link.
                      Always shown on interview rounds so recruiters know
                      where to find it; disabled until the round has been
                      booked or attempted (nothing can be recorded before). */}
                  <Tooltip
                    title={
                      hasRoundRecordings(selectedRound)
                        ? undefined
                        : 'Available once this round has been booked'
                    }
                  >
                    <span className="inline-flex">
                      <Button
                        className="rounded-full border border-primary-300 bg-white px-4 py-1.5 text-sm font-semibold text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!hasRoundRecordings(selectedRound)}
                        onClick={() => setArtifactsModalFor(selectedRound)}
                      >
                        VIEW RECORDING &amp; TRANSCRIPT
                      </Button>
                    </span>
                  </Tooltip>
                </div>
              </div>
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
            </div>
          </CommonCard>

          {(selectedRoundScore || selectedRoundIsVoiceCall || selectedRoundIsIntakeCall) && (
            // Short summary cards side by side instead of stacked full-width.
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
              {selectedRoundScore && (
                // The round's own AI/recruiter score, including its
                // section breakdown and reasoning — previously only
                // shown squeezed into the Scores tab's summary table
                // (a cross-round comparison, not built to hold a full
                // paragraph), which blew out that table's row height.
                // Belongs here, in the round it's actually about.
                <CommonCard>
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">AI Assessment</h4>
                      <Button
                        className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700"
                        onClick={() =>
                          setScoreModalFor({
                            scoreId: selectedRoundScore.id,
                            roundName: roundLabel(selectedRound),
                            currentScore: selectedRoundScore.recruiter_score,
                            currentReason: selectedRoundScore.recruiter_score_reason,
                          })
                        }
                      >
                        {selectedRoundScore.recruiter_score != null
                          ? 'EDIT RECRUITER SCORE'
                          : 'RATE THIS ROUND'}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                      {selectedRoundScore.score == null &&
                      selectedRoundScore.recruiter_score == null ? (
                        <span className="text-2xl font-bold text-primary">-</span>
                      ) : (
                        <>
                          {selectedRoundScore.score != null && (
                            <div>
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                AI
                              </span>{' '}
                              <span className="text-2xl font-bold text-primary">
                                {selectedRoundScore.score} / {AI_SCORE_MAX}
                              </span>
                            </div>
                          )}
                          {selectedRoundScore.recruiter_score != null && (
                            <div>
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Recruiter
                              </span>{' '}
                              <span className="text-2xl font-bold text-primary">
                                {selectedRoundScore.recruiter_score} / {HUMAN_SCORE_MAX}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {selectedRoundScore.section_scores &&
                      selectedRoundScore.section_scores.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {selectedRoundScore.section_scores
                            .map((s) => `${s.key}: ${s.score}/${AI_SCORE_MAX}`)
                            .join(' · ')}
                        </div>
                      )}
                    {selectedRoundScore.scoring_reason && (
                      <p className="text-sm text-gray-600">{selectedRoundScore.scoring_reason}</p>
                    )}
                  </div>
                </CommonCard>
              )}

              {selectedRoundIsVoiceCall && (
                // What actually happened on the call — completed,
                // asked to reschedule, said not interested, never
                // picked up, or cut off with no clear reason. Backed by
                // interview-service's own `GET /bookings/{id}`
                // (`selectedBooking`, already fetched above), not
                // candidate-service — this field doesn't exist there.
                <CommonCard>
                  <div className="p-4">
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
                  <div className="p-4">
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
                        Not available yet; reported by ai-service once it has both the resume and
                        this call&apos;s transcript.
                      </p>
                    )}
                  </div>
                </CommonCard>
              )}
            </div>
          )}

          {selectedRoundIsVoiceCall && (bookingHistory?.length ?? 0) > 1 && (
            // Only shown once there's actually more than one
            // attempt — a single-entry "history" would just repeat
            // the Call Outcome card above. `bookingHistory` is
            // oldest-first; render it newest-first so the most
            // recent (and most relevant) attempt reads first.
            <CommonCard>
              <div className="p-4">
                <div className="text-xs font-semibold uppercase text-gray-400">
                  Reschedule History
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Select an attempt to view its Questions Asked below.
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {[...(bookingHistory ?? [])].reverse().map((attempt, index) => {
                    // Positional, not a real field — `BookingView`
                    // doesn't expose `attempt_of`. `bookingHistory`
                    // is oldest-first before this reverse(), so the
                    // LAST entry after reversing is always the
                    // original (never itself a reschedule).
                    const isOriginal = index === (bookingHistory?.length ?? 1) - 1;
                    const actionTime = formatDateTime(attempt.created_at);
                    // index 0 (current attempt) maps to `null`, same as
                    // `selectedAttemptBookingId`'s own "current" default.
                    const isSelected =
                      index === 0
                        ? selectedAttemptBookingId === null
                        : selectedAttemptBookingId === attempt.id;
                    return (
                      <button
                        key={attempt.id}
                        type="button"
                        onClick={() => setSelectedAttemptBookingId(index === 0 ? null : attempt.id)}
                        aria-pressed={isSelected}
                        className={`flex w-full items-start justify-between gap-3 rounded-lg border-b border-gray-100 pb-3 pt-1 text-left last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-primary-50' : ''
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {index === 0
                              ? 'Current attempt'
                              : `Attempt ${bookingHistory!.length - index}`}
                          </div>
                          {index !== 0 && actionTime && (
                            <div className="text-xs text-gray-500">
                              {isOriginal ? 'Created' : 'Rescheduled'} {actionTime}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            {formatDateTime(attempt.start_time)
                              ? `Scheduled for ${formatDateTime(attempt.start_time)}`
                              : CONCLUDED_BOOKING_STATUSES.includes(attempt.status)
                                ? 'Call placed immediately (no scheduled time)'
                                : 'Not yet scheduled'}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-primary-600">
                          {formatCallIntent(attempt.call_intent)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CommonCard>
          )}

          {isPanelRound && (
            <CommonCard>
              <div className="p-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setIsPanelQuestionsOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-left cursor-pointer"
                  aria-expanded={isPanelQuestionsOpen}
                >
                  <div>
                    <h4 className="font-semibold text-gray-900">Interview questions</h4>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Visible to whoever is preparing for or sitting on this panel.
                    </p>
                  </div>
                  <CollapseToggle open={isPanelQuestionsOpen} />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isPanelQuestionsOpen
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    {roundQuestions && roundQuestions.questions.length > 0 ? (
                      <ol className="list-decimal space-y-3 pl-5 text-sm pt-1">
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
                      <p className="text-sm text-gray-400 pt-1">
                        No questions have been added for this round yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CommonCard>
          )}

          {isVoiceScreeningRound && (
            <CommonCard>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-gray-900">Questions asked</h4>
                  {questionsAskedAttemptLabel && (
                    <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-600">
                      {questionsAskedAttemptLabel}
                    </span>
                  )}
                </div>
                {isLoadingQuestionsAsked ? (
                  <Loader />
                ) : questionsAskedError ? (
                  <p className="text-sm text-gray-400">
                    Could not load the questions for this call right now.
                  </p>
                ) : questionsAsked?.status === 'not_yet_concluded' ? (
                  <p className="text-sm text-gray-400">This round hasn&apos;t concluded yet.</p>
                ) : questionsAsked?.status === 'no_questions_asked' ? (
                  <p className="text-sm text-gray-400">
                    {questionsAsked.reason ?? 'No questions were recorded for this call.'}
                  </p>
                ) : questionsAsked && questionsAsked.questions.length > 0 ? (
                  <>
                    <ol className="list-decimal space-y-3 pl-5 text-sm">
                      {questionsAsked.questions.map((q) => (
                        <li key={q.question_id} className="text-gray-800">
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
                    {questionsAsked.limitation && (
                      <p className="text-xs text-gray-400">{questionsAsked.limitation}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No questions were recorded for this call.</p>
                )}
              </div>
            </CommonCard>
          )}
        </>
      )}
    </>
  ) : null;

  return (
    <>
      {isCandidateLoading && <Loader />}
      <div className="flex flex-col mb-4 gap-2">
        <div className="flex-1 bg-white px-6 py-4 shadow-sm rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold">{candidateDisplayName(candidate)}</h2>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!candidate}
                onClick={() => setIsEditOpen(true)}
              >
                Edit Candidate Details
              </button>
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
                size="compact"
              />
              {/* Opens the same full-size viewer as the Candidate Details
                  tab's preview — reachable from any tab. */}
              <Tooltip title={candidate?.resume_s3_key ? undefined : 'No resume on file yet'}>
                <span className="inline-flex">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!candidate?.resume_s3_key}
                    onClick={() => setIsResumeViewerOpen(true)}
                  >
                    <LuFileText size={15} className="shrink-0" aria-hidden />
                    View Resume
                  </button>
                </span>
              </Tooltip>
              <span
                className={`text-sm font-medium px-4 py-1.5 rounded-full flex items-center gap-2 ${
                  statusUpper === 'selected'
                    ? 'text-green-700'
                    : statusUpper.includes('reject')
                      ? 'text-red-700'
                      : // Every other status (including withdrawn) reads its color
                        // from the SAME map CandidatesListing.tsx's status pill
                        // uses — this used to hardcode its own orange for
                        // withdrawn, out of sync with that map's pink, so the
                        // same candidate showed two different colors depending
                        // on which screen you were looking at.
                        candidateStatusColor(candidate?.status_code).text
                }`}
              >
                {statusUpper === 'selected' ? (
                  <LuThumbsUp size={16} />
                ) : statusUpper.includes('reject') ? (
                  <LuThumbsDown size={16} />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${candidateStatusColor(candidate?.status_code).dot}`}
                  />
                )}
                {candidate?.status_label || 'Applied'}
              </span>
            </div>
          </div>

          {/* Old app's three-column header: info / Scored / actions. Stacks
              on narrow screens, dividers only appear side by side. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,0.9fr)] lg:gap-0">
            <div className="min-w-0 space-y-1.5 lg:pr-6">
              <HeaderInfoRow label="Job ID:">
                {jobOpeningData?.data?.jobProfileCode || 'N/A'}
              </HeaderInfoRow>
              <HeaderInfoRow label="Job Title:">{jobTitleName ?? 'N/A'}</HeaderInfoRow>
              <HeaderInfoRow label="Hiring Manager:">
                {hiringManagerNames.length > 0
                  ? hiringManagerNames.map((name, index) => (
                      <div key={`${name}-${index}`}>
                        {name}
                        {index < hiringManagerNames.length - 1 ? ',' : ''}
                      </div>
                    ))
                  : 'N/A'}
              </HeaderInfoRow>
              <HeaderInfoRow label="Applied:">
                {formatDateTime(candidate?.applied_date) ?? 'N/A'}
              </HeaderInfoRow>
              <HeaderInfoRow label="Source:">{sourceLabel ?? 'N/A'}</HeaderInfoRow>
              <HeaderInfoRow label="Email:">{candidate?.email_id ?? 'N/A'}</HeaderInfoRow>
              <HeaderInfoRow label="Phone:">{candidate?.contact_no ?? 'N/A'}</HeaderInfoRow>
            </div>

            <div className="min-w-0 border-t border-gray-200 pt-4 text-sm lg:border-t-0 lg:border-l lg:border-gray-300 lg:px-6 lg:pt-0">
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] border-b border-gray-300 pb-1">
                <div className="text-[16px] font-bold">Scored</div>
                <div className="text-right text-[16px] font-bold text-primary">AI</div>
                <div className="text-right text-[16px] font-bold text-green-700">Human</div>
              </div>
              {scoredRows.length === 0 ? (
                <p className="text-gray-400">No rounds yet.</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center font-semibold">
                    <div
                      className="truncate pr-2"
                      title="Average across rounds with a score (Intake Call consistency check not included)"
                    >
                      Overall Score
                    </div>
                    <div className="text-right text-primary">
                      {formatScoredCell(overallScore.ai)}
                    </div>
                    <div className="text-right text-green-700">
                      {formatScoredCell(overallScore.human, HUMAN_SCORE_MAX)}
                    </div>
                  </div>
                  {scoredRows.map((row) => (
                    <div
                      key={row.key}
                      className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center"
                    >
                      <div className="truncate pr-2" title={row.label}>
                        {row.label}
                      </div>
                      <div className="text-right text-primary" title={row.aiHint}>
                        {formatScoredCell(row.ai)}
                      </div>
                      <div className="text-right text-green-700">
                        {formatScoredCell(row.human, HUMAN_SCORE_MAX)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-3 border-t border-gray-200 pt-4 lg:border-t-0 lg:border-l lg:border-gray-300 lg:pl-6 lg:pt-0">
              {!isTerminal && (
                // Always visible while the candidate is still in the
                // pipeline. During the Intake Call consistency check they
                // stay on screen, greyed out, with the reason on hover.
                // MARK AS SELECTED appears once the candidate reaches their
                // last round (or every round is done), beside ADVANCE.
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Tooltip
                    title={
                      actionsLockedForIntakePair
                        ? intakeLockReason
                        : advanceDisabled
                          ? `Waiting for ${currentRound?.round_name ?? 'this round'} to conclude`
                          : undefined
                    }
                  >
                    <span className="flex">
                      <Button
                        className="flex w-full items-center justify-center text-sm px-4 h-[34px] gap-2 rounded-full bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setStatusModal('advance')}
                        disabled={advanceDisabled || actionsLockedForIntakePair}
                      >
                        <span className="text-white">ADVANCE</span>
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title={actionsLockedForIntakePair ? intakeLockReason : undefined}>
                    <span className="flex">
                      <Button
                        className="flex w-full items-center justify-center text-sm px-4 h-[34px] gap-2 rounded-full border-2 border-red-600 bg-red-50 text-red-600 font-semibold hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setStatusModal('reject')}
                        disabled={actionsLockedForIntakePair}
                      >
                        <span>REJECT</span>
                      </Button>
                    </span>
                  </Tooltip>
                  {(isOnLastRound || allRoundsCompleted) && (
                    <Tooltip title={actionsLockedForIntakePair ? intakeLockReason : undefined}>
                      <span className="flex sm:col-span-2">
                        <Button
                          className="flex w-full items-center justify-center text-sm px-4 h-[34px] gap-2 rounded-full border-2 border-green-500 bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => setStatusModal('select')}
                          disabled={actionsLockedForIntakePair}
                        >
                          <span className="text-green-700 font-semibold">MARK AS SELECTED</span>
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </div>
              )}
              {isTerminal && (
                <p className="text-xs text-gray-500">
                  No pipeline actions: this candidate is{' '}
                  {(candidate?.status_label || 'closed').toLowerCase()}.
                </p>
              )}
            </div>
          </div>

          {/* Only reachable via bulk resume upload — every other intake
              path (recruiter Add Candidate, both public apply flows) now
              requires email server-side. ai-service's resume parsing
              just didn't find one here. Warn rather than disable: the
              pipeline actions above don't themselves need an email to
              function (REJECT/ADVANCE are internal status moves), it's
              downstream things like scheduling emails that would
              silently go nowhere. */}
          {candidate && !candidate.email_id && (
            <div className="mt-4 flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-800">
                No email on file for this candidate — actions that email them (scheduling invites,
                notifications) won&apos;t work until one is added.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col bg-[#FAFAFA] rounded-2xl overflow-hidden">
        <div className="px-6">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            className="view-candidate-tabs"
            items={[
              { key: 'details', label: 'Candidate Details' },
              { key: 'assessment', label: 'Assessment' },
              { key: 'scheduling', label: 'Interview Scheduling' },
              { key: 'sms', label: 'SMS Communication' },
            ]}
          />
        </div>

        <div className="p-4">
          {activeTab === 'details' && (
            // Candidate fields on the left, a small resume preview on the
            // right (old app's layout). Each section carries its own actions
            // in its header row and sizes to its own content (items-start),
            // so neither is stretched into an empty box to match the other.
            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="rounded-xl border border-neutral-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-2.5">
                  <h3 className="text-sm font-semibold text-gray-900">Candidate information</h3>
                  <Button
                    className="box-border inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 bg-white px-3 text-xs font-medium leading-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setIsEditOpen(true)}
                    disabled={!candidate}
                  >
                    <LuPencil size={13} className="shrink-0" aria-hidden />
                    <span>EDIT DETAILS</span>
                  </Button>
                </div>
                {/* Read-only view of the same fields EditCandidateModal
                    edits, plus the intake facts shown in the header. */}
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-3 text-sm sm:grid-cols-2">
                  {[
                    { label: 'First name', value: candidate?.first_name },
                    { label: 'Last name', value: candidate?.last_name },
                    { label: 'Email', value: candidate?.email_id },
                    { label: 'Phone', value: candidate?.contact_no },
                    { label: 'Qualification', value: candidate?.qualification },
                    { label: 'Source', value: sourceLabel },
                    { label: 'Applied', value: formatDateTime(candidate?.applied_date) },
                    { label: 'Address', value: candidate?.address },
                  ].map((field) => (
                    <div key={field.label} className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        {field.label}
                      </dt>
                      <dd className="mt-0.5 break-words text-gray-800">{field.value || 'N/A'}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-2.5">
                  <h3 className="text-sm font-semibold text-gray-900">Resume</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {candidate?.resume_s3_key ? (
                      <>
                        <Button
                          className="box-border inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full border border-primary-200 bg-primary-50 px-3 text-xs font-semibold leading-none text-primary-700 cursor-pointer"
                          onClick={() => setIsResumeViewerOpen(true)}
                        >
                          VIEW
                        </Button>
                        <Button
                          className="box-border inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full bg-primary px-3 text-xs font-semibold leading-none text-white cursor-pointer disabled:opacity-50"
                          onClick={() => void handleDownloadResume()}
                          disabled={isResumeUrlLoading}
                        >
                          {isResumeUrlLoading ? 'PREPARING…' : 'DOWNLOAD'}
                        </Button>
                      </>
                    ) : (
                      <Tooltip
                        title={
                          resumeUploadLinkExpired
                            ? undefined
                            : "Available once the candidate's 24-hour upload link has expired"
                        }
                      >
                        <span className="inline-flex">
                          <Button
                            className="box-border inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full bg-primary px-3 text-xs font-semibold leading-none text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => void handleResendUploadLink()}
                            disabled={!resumeUploadLinkExpired || isResendingUploadLink}
                          >
                            {isResendingUploadLink ? 'SENDING…' : 'RESEND UPLOAD LINK'}
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  {candidate?.resume_s3_key && candidateId ? (
                    <ResumeInlinePreview
                      candidateId={candidateId}
                      candidateName={candidateDisplayName(candidate)}
                      onExpand={() => setIsResumeViewerOpen(true)}
                      heightClassName="h-[400px]"
                    />
                  ) : (
                    <p className="py-4 text-center text-sm text-gray-500">
                      {resumeUploadLinkExpired
                        ? "No resume yet — the candidate's upload link expired."
                        : 'No resume on file yet.'}
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'assessment' && (
            // Old app's Assessment layout: rounds down the left as vertical
            // tabs, the picked round's full detail on the right. Replaces the
            // separate round-card row that used to sit above the tabs — its
            // at-a-glance status lives in each tab (RoundSidebarItem), its
            // action links in the round detail's action row, and its summary
            // footer in the bar below.
            <div className="flex flex-col gap-3">
              {rounds.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400">Next step</div>
                    <div className="font-semibold text-gray-900">
                      {pipeline.nextRound
                        ? roundLabel(pipeline.nextRound)
                        : 'None, pipeline complete'}
                      {pipeline.nextWhen && (
                        <span className="ml-1 font-normal text-gray-500">
                          · {pipeline.nextWhen}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Rounds completed</div>
                    <div className="font-semibold text-gray-900">
                      {pipeline.completedCount} / {rounds.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Avg. score so far</div>
                    <div className="font-semibold text-gray-900">
                      {pipeline.avgScore != null ? `${pipeline.avgScore} / ${AI_SCORE_MAX}` : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Overall standing</div>
                    <Badge status={pipeline.standing.status}>{pipeline.standing.label}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 lg:ml-auto">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-success" /> Completed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-warning" /> Current stage
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-neutral-300" /> Upcoming
                    </span>
                    {pipeline.hasFailure && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-danger" /> Needs attention
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                <div className="w-full shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white lg:w-[260px]">
                  <ul className="flex overflow-x-auto text-sm text-gray-800 lg:flex-col lg:overflow-visible">
                    {roundsLoaded && !hasResumeStageRound && (
                      <li className="relative min-w-[210px] border-r border-gray-100 last:border-r-0 lg:min-w-0 lg:border-r-0 lg:border-b">
                        <button
                          type="button"
                          className={`w-full px-3 py-3 text-left cursor-pointer hover:bg-gray-50 ${
                            isResumeFallbackSelected ? 'bg-primary-50' : ''
                          }`}
                          onClick={() => {
                            setSelectedRound(null);
                            setIsResumeFallbackSelected(true);
                          }}
                        >
                          <h3
                            className={`text-sm font-semibold ${isResumeFallbackSelected ? 'text-primary' : 'text-gray-900'}`}
                          >
                            Resume Screening
                          </h3>
                          {candidate?.resume_score != null && (
                            <p className="mt-1 text-xs font-semibold text-primary-600">
                              Score: {candidate.resume_score} / {AI_SCORE_MAX}
                            </p>
                          )}
                        </button>
                        {isResumeFallbackSelected && (
                          <span
                            className="absolute left-0 top-0 h-full w-1 bg-primary"
                            aria-hidden
                          />
                        )}
                      </li>
                    )}
                    {rounds.map((round, index) => (
                      <RoundSidebarItem
                        key={round.id ?? `assessment-${index}`}
                        round={round}
                        index={index}
                        bucket={pipeline.displayBuckets[index]}
                        overdue={pipeline.overdueFlags[index]}
                        isCurrentStage={index === pipeline.activeIndex}
                        isSelected={!isResumeFallbackSelected && selectedRound?.id === round.id}
                        isResumeScored={isResumeScored(round, candidate?.resume_score ?? null)}
                        roundScore={
                          round.stage_type === 'interview'
                            ? scores.find((sc) => sc.candidate_interview_round_id === round.id)
                            : undefined
                        }
                        resumeScore={candidate?.resume_score ?? null}
                        consistencyScore={candidate?.consistency_score ?? null}
                        onSelect={() => {
                          setIsResumeFallbackSelected(false);
                          setSelectedRound(round);
                        }}
                      />
                    ))}
                    {roundsLoaded && rounds.length === 0 && (
                      <li className="px-3 py-3 text-xs text-gray-500">No round plan yet.</li>
                    )}
                  </ul>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  {isResumeFallbackSelected ? (
                    <CommonCard>
                      <div className="p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold">Resume Assessment</h3>
                          <Button
                            className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700"
                            onClick={() => setIsResumeReviewOpen(true)}
                          >
                            {candidate?.resume_rating ? 'EDIT SCORING' : 'ADD SCORING'}
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
                              <p className="text-sm text-gray-600 mt-1">
                                {candidate.scoring_reason}
                              </p>
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
                              Recruiter Scoring
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
                                  Remove scoring
                                </button>
                              </>
                            ) : (
                              <p className="text-sm text-gray-400">No scoring yet.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CommonCard>
                  ) : selectedRound ? (
                    <WidgetErrorBoundary key={selectedRound.id} label="Round details">
                      {roundDetailBody}
                    </WidgetErrorBoundary>
                  ) : (
                    <p className="text-sm text-gray-500">
                      {roundsLoaded ? 'Select a round to see its details.' : 'Loading rounds…'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scheduling' && (
            <div className="flex flex-col gap-4">
              {rounds.length === 0 ? (
                <p className="text-sm text-gray-500">No interview rounds recorded yet.</p>
              ) : (
                <>
                  <CommonCard>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Scores across rounds
                        </h3>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-success" /> Strong
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-warning" /> Fair
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-danger" /> Weak
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-end gap-4">
                        {rounds.map((round, index) => {
                          // The resume stage / Intake Call rows have no
                          // `CandidateInterviewScore`; `summariseRound`
                          // substitutes the AI resume score and the
                          // consistency score respectively. All three
                          // sources (resume, consistency, round score/
                          // recruiter_score) are 0-5, so `pct` scales the
                          // same way regardless of which one a round uses.
                          const { chartValue, pct, scoreText } = summariseRound(round);
                          const hasScore = chartValue != null;
                          const barColorClass = !hasScore
                            ? 'bg-transparent border-2 border-dashed border-gray-200'
                            : pct >= 70
                              ? 'bg-success'
                              : pct >= 40
                                ? 'bg-warning'
                                : 'bg-danger';
                          return (
                            <Tooltip
                              key={round.id ?? `score-${index}`}
                              title={
                                hasScore
                                  ? `${roundLabel(round)}: ${scoreText}`
                                  : `${roundLabel(round)}: No score recorded`
                              }
                            >
                              <div className="flex flex-1 flex-col items-center gap-2">
                                <div className="flex h-32 w-full max-w-[56px] flex-col items-center justify-end">
                                  {hasScore && (
                                    <span className="mb-1.5 text-xs font-bold text-gray-700">
                                      {scoreText?.split(' · ')[0]}
                                    </span>
                                  )}
                                  <div
                                    className={`w-full rounded-t-md transition-all ${barColorClass}`}
                                    style={{ height: hasScore ? `${Math.max(pct, 6)}%` : '8%' }}
                                  />
                                </div>
                              </div>
                            </Tooltip>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex gap-4 border-t border-gray-100 pt-2 text-[10px] text-gray-400">
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
                        <thead className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
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
                                  {/* `recruiter_scored_by` is a user id, not a
                                      name — show "You" or a hiring manager's
                                      name when known, never the raw id. */}
                                  {!roundScore?.recruiter_scored_by
                                    ? 'Not scored yet'
                                    : String(roundScore.recruiter_scored_by) === String(userId)
                                      ? 'You'
                                      : (hiringManagerOptions.find((o) =>
                                          idsMatch(o.id, roundScore.recruiter_scored_by)
                                        )?.name ?? 'Recruiter')}
                                </td>
                                <td className="max-w-[260px] px-2 py-3 text-gray-700">
                                  {/* Section breakdown and the AI's own reasoning
                                      (CandidateInterviewScoreView.section_scores/
                                      scoring_reason) now live on the round's own
                                      "AI Assessment" card in the Assessment tab's round detail
                                      instead — a cross-round comparison table isn't
                                      built to hold a full paragraph per row. */}
                                  {scoreText ?? statusText}
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
                                      {roundScore.recruiter_score
                                        ? 'EDIT RECRUITER SCORE'
                                        : 'RATE THIS ROUND'}
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
                      <div className="p-4">
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
                      <div className="p-4">
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

          {activeTab === 'sms' && candidateId && (
            <CandidateMessageHistory
              candidateId={candidateId}
              canSms={Boolean(candidate?.contact_no)}
              onSendSms={() => setIsSmsOpen(true)}
            />
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
            // round other than the one currently selected.
            rescheduleRound &&
            isIntakeCallRound(rescheduleRound) &&
            candidate?.consistency_score != null
              ? `Requesting a reschedule will email the candidate a new link, valid for 24 hours. Once they complete the new call, the resume-consistency score will be recalculated from it and will overwrite the current score (${candidate.consistency_score} / ${AI_SCORE_MAX}).`
              : rescheduleRound && isIntakeCallRound(rescheduleRound)
                ? 'Requesting a reschedule will email the candidate a new link, valid for 24 hours. Once they complete the new call, a resume-consistency score will be calculated from it.'
                : 'Requesting a reschedule will email the candidate a new link, valid for 24 hours.'
          }
          confirmText="REQUEST RESCHEDULE"
          cancelText="CANCEL"
          isLoading={isRequestingReschedule}
        />
      )}
      {artifactsModalFor && candidateId && (
        <RoundArtifactsModal
          open={!!artifactsModalFor}
          onClose={() => setArtifactsModalFor(null)}
          candidateId={candidateId}
          roundId={artifactsModalFor.id}
          roundName={roundLabel(artifactsModalFor)}
          roundType={artifactsModalFor.round_type}
          feedback={{
            candidate_feedback_rating: artifactsModalFor.candidate_feedback_rating,
            candidate_feedback_text: artifactsModalFor.candidate_feedback_text,
            candidate_feedback_submitted_at: artifactsModalFor.candidate_feedback_submitted_at,
          }}
        />
      )}
      {interviewersModalFor && candidateId && (
        <PanelInterviewersModal
          open={!!interviewersModalFor}
          onClose={() => setInterviewersModalFor(null)}
          candidateId={candidateId}
          roundId={interviewersModalFor.id}
          roundName={roundLabel(interviewersModalFor)}
          currentInterviewerIds={interviewersModalFor.interviewer_ids ?? []}
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
