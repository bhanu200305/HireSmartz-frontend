import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ConfigProvider, Input, Rate, Select, Tabs, Tooltip } from 'antd';
import type { RootState } from '../../../redux/provider/store';
import dayjs from 'dayjs';
import {
  LuDownload,
  LuEye,
  LuMail,
  LuPencil,
  LuThumbsDown,
  LuThumbsUp,
  LuUsers,
  LuSkipForward,
  LuFileText,
  LuChevronLeft,
  LuChevronRight,
  LuListChecks,
  LuCalendarPlus,
  LuCalendarCheck,
  LuUpload,
  LuCircleCheck,
  LuTriangleAlert,
} from 'react-icons/lu';
import { IoChatbubbleEllipses } from 'react-icons/io5';
import { Button, Badge, InfoHint, Textarea, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
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
  useSendRoundInviteMutation,
  useSkipInterviewRoundMutation,
  type InterviewerView,
  type CandidateInterviewRoundView,
} from '../../../api/candidate-service/Candidates/interviewRounds';
import {
  useListCandidateInterviewScoresQuery,
  useDeleteResumeReviewMutation,
  useRecordResumeReviewMutation,
  useLazyGetCandidateResumeDownloadQuery,
  useResendResumeUploadLinkMutation,
} from '../../../api/candidate-service/Candidates/scoring';
import { useListRecruiterNotesQuery } from '../../../api/candidate-service/Candidates/notes';
import { useListApplicationSourcesQuery } from '../../../api/candidate-service/Master/master';
import {
  candidateDisplayStatusColor,
  candidateDisplayStatusLabel,
  getSmsBlockedReason,
  resolveDisplayStatus,
} from './candidateDisplay';
import {
  useGetBookingQuery,
  useGetBookingHistoryQuery,
  useRequestCallRescheduleMutation,
  useReinviteBookingMutation,
  MAX_REINVITES,
  useLazyGetCalendarConnectUrlQuery,
  useGetCalendarGrantStatusQuery,
  useGetArtifactsQuery,
  useGetInterviewersCalendarStatusQuery,
  useUploadOfflineRecordingMutation,
  toUploadableAudioFile,
  AUDIO_UPLOAD_ACCEPT,
  useGetQuestionsAskedQuery,
  CONCLUDED_BOOKING_STATUSES,
  type InterviewApiError,
} from '../../../api/interview-service/client';
import {
  getCandidateErrorMessage,
  getCandidateErrorStatusCode,
} from '../../../shared/utils/auth/candidateError.helpers';
import AdvanceCandidateModal, {
  type AdvanceFeedbackRequirement,
} from './Modal/AdvanceCandidateModal';
import InterviewSchedulingTab from './InterviewSchedulingTab';
import NameMissingFlag from './NameMissingFlag';
import ChangeCandidateStatusModal, {
  type ChangeCandidateStatusMode,
} from './Modal/ChangeCandidateStatusModal';
import BulkEmailCandidatesModal from './Modal/BulkEmailCandidatesModal';
import BulkSendSmsModal from './Modal/BulkSendSmsModal';
import CandidateDetailsForm from './CandidateDetailsForm';
import CandidateRecruiterNotesPanel from './Notes/CandidateRecruiterNotesPanel';
import RecruiterRoundScoreModal from './Modal/RecruiterRoundScoreModal';
import AssignJobModal from './Modal/AssignJobModal';
import ResumeSplitLayout from './ResumeSplitLayout';
import AiCommentsBox from './AiCommentsBox';
import { useRecordCandidateViewedMutation } from '../../../api/candidate-service/Candidates/candidateViewedApi';
import ResumeViewerModal from './Modal/ResumeViewerModal';
import RoundSidebarItem from './RoundSidebarItem';
import {
  isPhoneNumberUnusableError,
  phoneIssueBlocksRoundInvite,
  phoneNumberIssueMessage,
  PHONE_BLOCKED_INVITE_MESSAGE,
} from './phoneNumberIssue';
import { RoundCandidateFeedback, RoundRecording, RoundTranscript } from './RoundArtifactsPanel';
import PanelInterviewersModal from './Modal/PanelInterviewersModal';
import {
  summarisePipeline,
  findRoundScore,
  isResumeScored,
  hasRoundRecordings,
  canManageRoundInterviewers,
  HUMAN_SCORE_MAX,
  AI_SCORE_MAX,
} from './roundPipeline';
import ResumeInlinePreview from './ResumeInlinePreview';
import RoundCollapsibleSection from './RoundCollapsibleSection';
import RoundDetailTabs from './RoundDetailTabs';
import ScoringCriteriaModal, { type InterviewScoringRoundType } from './Modal/ScoringCriteriaModal';
import { useGetJobScoringConfigQuery } from '../../../api/job-service/JobOpening/jobScoringConfig';
import CandidateMessageHistory from './CandidateMessageHistory';
import { useCandidateNavigation } from './useCandidateNavigation';
import { useJobDetailsHeaderSlot } from '../../../layouts/jobDetailsHeaderSlot';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import { useSessionTenantId } from '../../../hooks/useSessionTenantId';
import useEffectivePermissions from '../../../hooks/useEffectivePermissions';
import { isAssignedToJob } from '../../../shared/utils/auth/getAccess';
import {
  idsMatch,
  tenantJobTitleFormId,
  useListTenantDepartmentJobTitlesQuery,
  useListTenantJobTitleCatalogueQuery,
} from '../../../api/organization-service/Tenants/jobTitles';
import { roundLabel, formatCallIntent } from './roundDisplay';
import {
  resolveCurrentRound,
  isReadyForOverallScore,
  isRoundConcluded,
  isAiVideoRound,
  isAudioScreeningRound,
  isIntakeCallRound,
  isIdentityVerificationRound,
  isResumeStageRound,
  isRoundSkipped,
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
// round sidebar) and SMS Communication. The Interview Scheduling tab was
// removed 2026-09-30 (its scoring/notes are on Assessment and the header).

// job-service resume category codes -> the labels ScoringCriteriaModal
// knows (it drops any metric whose label it has no description for).
const RESUME_CRITERIA_LABELS: Record<string, string> = {
  SKILLS_MATCH: 'Skills Match',
  EXPERIENCE_MATCH: 'Experience Match',
  QUALIFICATIONS: 'Qualifications',
  KEYWORD_PRESENCE: 'Keyword Presence',
};

/** "SKILLS_MATCH" -> "Skills Match" for the Scorecard rows. */
const formatSectionKey = (key: string) =>
  key
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** A category's non-blank reason phrases. */
const sectionReasons = (reason: string[] | null | undefined): string[] =>
  (reason ?? []).map((r) => r.trim()).filter(Boolean);

/** One phrase as-is, two as "a and b", three as "a, b, and c". */
const joinReasons = (reasons: string[]): string =>
  reasons.length <= 1
    ? (reasons[0] ?? '')
    : reasons.length === 2
      ? `${reasons[0]} and ${reasons[1]}`
      : `${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`;

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
  value && dayjs(value).isValid() ? dayjs(value).format('MMM D, YYYY · h:mm A') : null;

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

/** 409 `CANDIDATE_ALREADY_SELECTED` - creating a booking, requesting a
 * reschedule or reinviting after the candidate was marked selected (maybe
 * moments ago, maybe from another round). Not a failure to retry: this job's
 * remaining rounds are closed for booking. */
const isAlreadySelectedError = (error: unknown): boolean =>
  (error as InterviewApiError)?.code === 'CANDIDATE_ALREADY_SELECTED';

const ALREADY_SELECTED_MESSAGE =
  'This candidate has already been selected, so the remaining rounds are closed for scheduling.';

/** 409 `INTERVIEW_IN_PROGRESS` - requesting a reschedule while the candidate
 * is on the live call right now (interview-service 2026-10-05). Not a
 * failure: it works again once the call ends. Matched on the code, not the
 * backend message, which currently says "cannot be skipped". */
const isInterviewInProgressError = (error: unknown): boolean =>
  (error as InterviewApiError)?.code === 'INTERVIEW_IN_PROGRESS';

const INTERVIEW_IN_PROGRESS_RESCHEDULE_MESSAGE =
  'The candidate is currently on the call. Try again once it ends.';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const candidateNav = useCandidateNavigation(candidateId, parsedJobId);
  const headerSlot = useJobDetailsHeaderSlot();
  const userId = useSelector((state: RootState) => state.LoginSlice.userId);
  const loginRole = useSelector((state: RootState) => state.LoginSlice.role);
  const effectivePermissions = useEffectivePermissions();

  // `?tab=` deep links. The Interview Scheduling tab is back (invite,
  // re-invite, reschedule and skip live there); the legacy `summary` (from
  // InterviewLiveKit.tsx's "Complete Full Feedback") and `3` (from
  // ActivityFeed.tsx) keys still land on Assessment. Read once via
  // useState's lazy initializer so the page never flashes the wrong tab.
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tabParam = searchParams.get('tab');
    const validTabs: TabKey[] = ['details', 'assessment', 'scheduling', 'sms'];
    if (tabParam && validTabs.includes(tabParam as TabKey)) return tabParam as TabKey;
    if (tabParam === 'resume' || searchParams.get('edit') === 'true') return 'details';
    return 'assessment';
  });
  const [statusModal, setStatusModal] = useState<ChangeCandidateStatusMode | null>(null);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  // The Hiring Panel round the candidate was just advanced into (pop-up).
  const [panelPromptRound, setPanelPromptRound] = useState<CandidateInterviewRoundView | null>(
    null
  );
  // The round the last successful Advance completed. Advance stays disabled
  // while that round is still the current one (the refreshed list has not
  // caught up yet), so it can't be clicked twice for the same round.
  const [advancedFromRoundId, setAdvancedFromRoundId] = useState<string | null>(null);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  // Feedback Comments is typed in place; this is the unsaved draft.
  const [resumeCommentDraft, setResumeCommentDraft] = useState('');
  // SKIP (beside ADVANCE / REJECT): the backend requires a reason.
  const [isSkipOpen, setIsSkipOpen] = useState(false);
  const [isAssignJobOpen, setIsAssignJobOpen] = useState(false);
  const [isAiCommentExpanded, setIsAiCommentExpanded] = useState(false);
  // The interview round Summary's own expand state (separate from the resume stage's).
  const [isRoundSummaryExpanded, setIsRoundSummaryExpanded] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  // Content-guardrail message from the server, shown under the feedback box.
  const [skipReasonError, setSkipReasonError] = useState<string | null>(null);
  const [skipInterviewRound, { isLoading: isSkipping }] = useSkipInterviewRoundMutation();
  // "Scoring Criteria" popup (old app's per-round button): the resume
  // round's weighted breakdown, or the interview-scoring explainer.
  const [scoringCriteriaFor, setScoringCriteriaFor] = useState<{
    kind: 'resume' | 'interview' | 'intake';
    subtitle?: string;
    // Interview rounds only: ai-service scores each round type differently.
    interviewRoundType?: InterviewScoringRoundType;
  } | null>(null);
  // The job's own resume / interview weights (job override, else the
  // organization's, else the platform default — the same weights ai-service
  // scores with), fetched only while a resume or interview popup is open;
  // the modal falls back to the platform defaults if they can't be loaded.
  const { data: jobScoringConfig } = useGetJobScoringConfigQuery(parsedJobId ?? '', {
    skip: !parsedJobId || !scoringCriteriaFor || scoringCriteriaFor.kind === 'intake',
  });
  const [isResumeViewerOpen, setIsResumeViewerOpen] = useState(false);
  // Candidate Details tab's edit mode. The listing's Edit action lands here
  // with `?tab=details&edit=true` (as the legacy app did); the flag is read
  // once, then dropped from the URL so a reload opens read-only. Stepping to
  // another candidate (Previous / Next) always starts read-only.
  const [isEditingDetails, setIsEditingDetails] = useState(
    () => searchParams.get('edit') === 'true'
  );
  const [editingCandidateId, setEditingCandidateId] = useState(candidateId);
  if (editingCandidateId !== candidateId) {
    setEditingCandidateId(candidateId);
    setIsEditingDetails(false);
  }
  useEffect(() => {
    if (searchParams.has('edit')) {
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      // Keep router state — it carries the list order Previous / Next use.
      setSearchParams(next, { replace: true, state: location.state });
    }
  }, [searchParams, setSearchParams, location.state]);
  // The round picked in the Assessment tab's sidebar. Stored as picked (and
  // updated optimistically after Create Booking), but read through
  // `selectedRound` below, which swaps in the latest polled copy of the same
  // round so the detail panel never lags the sidebar's live status.
  const [pickedRound, setSelectedRound] = useState<CandidateInterviewRoundView | null>(null);
  const [isResumeFallbackSelected, setIsResumeFallbackSelected] = useState(false);
  // Round-card actions that now live in the round detail's action row.
  const [interviewersModalFor, setInterviewersModalFor] =
    useState<CandidateInterviewRoundView | null>(null);
  // Hiring Panel's reference question list defaults open (it's the main
  // reason a panelist opens this card) but can be collapsed once reviewed.
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  // Set the first time a booking action answers CANDIDATE_ALREADY_SELECTED:
  // the scheduling actions grey out instead of erroring on every click.
  const [bookingsClosed, setBookingsClosed] = useState(false);
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
  // separate from `selectedRound`. The round header's Re-invite button sets
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
  // The same keep-roster / choose-different-interviewers modals serve both the
  // reschedule request and a PANEL reinvite (unused link): only the endpoint
  // and the wording differ.
  const [rescheduleMode, setRescheduleMode] = useState<'reschedule' | 'reinvite'>('reschedule');
  const isReinviteMode = rescheduleMode === 'reinvite';
  // "Send interview invite" dialog behind the round's invite icon.
  const [isInviteOpen, setIsInviteOpen] = useState(false);
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
  // Reported to the backend (POST /candidates/{id}/viewed): that is what clears
  // this user's "New" badge (`is_new_for_me`) on any device. Fire-and-forget,
  // once per opened candidate: a failure never affects the page, and the call
  // is idempotent server-side.
  const [recordCandidateViewed] = useRecordCandidateViewedMutation();
  const reportedViewFor = useRef<string | null>(null);
  useEffect(() => {
    if (!candidate?.id) return;
    if (reportedViewFor.current === candidate.id) return;
    reportedViewFor.current = candidate.id;
    recordCandidateViewed(candidate.id)
      .unwrap()
      .catch(() => undefined);
  }, [candidate?.id, recordCandidateViewed]);

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

  const {
    data: rawRounds = [],
    isSuccess: roundsLoaded,
    refetch: refetchRounds,
  } = useListCandidateInterviewRoundsQuery(candidateId ?? '', {
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

  // A different round starts with its Summary collapsed.
  useEffect(() => {
    setIsRoundSummaryExpanded(false);
  }, [selectedRound?.id]);

  // Assessment tab always has something selected in its sidebar, like the
  // old app (which opened on Resume Review): the first round, or the
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
    // AI round scores land via an async event chain (ai-service →
    // candidate-service), so poll like the candidate/rounds queries —
    // otherwise a score that arrives while the page is open never unlocks
    // the round's Feedback tab until a manual reload.
    pollingInterval: 20_000,
    skipPollingIfUnfocused: true,
  });
  // Same args as CandidateRecruiterNotesPanel's own list query (limit 100),
  // so both share one cached request. Used for the header Notes badge count
  // (the API returns no total, so the count is the list's length — was
  // `limit: 1`, which capped the badge at 1).
  const { data: notesData } = useListRecruiterNotesQuery(
    { candidateId: candidateId ?? '', limit: 100 },
    { skip: !candidateId }
  );
  const [deleteResumeReview] = useDeleteResumeReviewMutation();
  const [recordResumeReview, { isLoading: isSavingResumeRating }] = useRecordResumeReviewMutation();
  const [getResumeDownload, { isLoading: isResumeUrlLoading }] =
    useLazyGetCandidateResumeDownloadQuery();
  const [resendResumeUploadLink, { isLoading: isResendingUploadLink }] =
    useResendResumeUploadLinkMutation();
  const [sendRoundInvite] = useSendRoundInviteMutation();
  // `round_type` first (candidate-service's real classification), round
  // name only for an unclassifiable round — same rule as
  // `interviewTypeForRound`.
  const isPanelRound = selectedRound
    ? selectedRound.round_type
      ? selectedRound.round_type === 'PANEL'
      : /panel|live video|in-person/i.test(selectedRound.round_name ?? '')
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
  const { data: selectedBooking, refetch: refetchSelectedBooking } = useGetBookingQuery(
    selectedRound?.interview_booking_id ?? '',
    {
      skip: !selectedRound?.interview_booking_id,
      // The candidate's scheduling email (and, for PANEL, the round flipping
      // to "Scheduled") both happen server-side once the last interviewer
      // connects their calendar — no action on this screen triggers either,
      // so this has to catch up on its own instead of waiting for a manual
      // refresh. Same reasoning as useGetCandidateQuery's own polling above.
      pollingInterval: 20_000,
      skipPollingIfUnfocused: true,
    }
  );
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
  const [reinviteBooking, { isLoading: isReinviting }] = useReinviteBookingMutation();
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
  // The in-person recording can only exist once the interview has started, so
  // the upload stays greyed out until the booking's start time — and switches
  // on by itself at that moment (no refresh), via the timer below. A booking
  // with no time picked yet has no start, so it stays off too.
  const interviewStartMs = selectedBooking?.start_time
    ? dayjs(selectedBooking.start_time).valueOf()
    : null;
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (interviewStartMs == null || Number.isNaN(interviewStartMs)) return;
    const wait = interviewStartMs - Date.now();
    if (wait <= 0) {
      // Already started: catch `nowMs` up once (it can predate the start if
      // the page was opened earlier); no further updates are needed.
      if (nowMs < interviewStartMs) setNowMs(Date.now());
      return;
    }
    // setTimeout caps at ~24.8 days; a longer wait just re-arms on wake-up.
    const timer = setTimeout(() => setNowMs(Date.now()), Math.min(wait + 500, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [interviewStartMs, nowMs]);
  const hasInterviewStarted =
    interviewStartMs != null && !Number.isNaN(interviewStartMs) && interviewStartMs <= nowMs;
  const [uploadOfflineRecording, { isLoading: isUploadingAudio }] =
    useUploadOfflineRecordingMutation();
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  // Rounds whose audio was uploaded in this session and whose AI score
  // hasn't landed yet. There is no backend "processing" flag for this — the
  // round's score (polled above) going from empty to populated is the only
  // real signal, so the "Scoring…" state is local and clears itself then.
  const [scoringRoundIds, setScoringRoundIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (scoringRoundIds.size === 0) return;
    const scoredIds = [...scoringRoundIds].filter((id) => {
      const round = rounds.find((r) => r.id === id);
      return round ? findRoundScore(scores, round)?.score != null : false;
    });
    if (scoredIds.length === 0) return;
    setScoringRoundIds((prev) => {
      const next = new Set(prev);
      scoredIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [scores, rounds, scoringRoundIds]);

  const handleAudioFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cleared unconditionally so picking the SAME filename again after a
    // failed upload still fires a change event.
    e.target.value = '';
    if (!file || !selectedRound?.interview_booking_id) return;
    const audioFile = toUploadableAudioFile(file);
    if (!audioFile) {
      showToast({ message: 'Please choose an audio file.', type: 'error' });
      return;
    }
    if (audioFile.size === 0) {
      showToast({ message: 'This audio file is empty.', type: 'error' });
      return;
    }
    const uploadedRoundId = selectedRound.id;
    try {
      await uploadOfflineRecording({
        bookingId: selectedRound.interview_booking_id,
        file: audioFile,
      }).unwrap();
      setScoringRoundIds((prev) => new Set(prev).add(uploadedRoundId));
      showToast({ message: 'Audio uploaded. The AI will score this round.', type: 'success' });
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
      const status = getCandidateErrorStatusCode(e);
      showToast({
        message:
          status === 409
            ? 'This candidate already has a resume on file, so there is nothing to resend.'
            : status === 422
              ? 'The candidate’s 24-hour upload window is still open. A new link can be sent once it expires.'
              : status === 404
                ? 'Candidate not found.'
                : getCandidateErrorMessage(e, 'Could not resend the upload link'),
        type: 'error',
      });
      // 409 means the resume has since arrived: pull the fresh state.
      if (status === 409) refetchCandidate();
    }
  };

  // What the recruiter is told before a Re-invite / Reschedule goes out.
  const REINVITE_COPY =
    'This sends the candidate a new invitation link. Their current invitation is replaced. Reinvites are limited to 3 per round.';
  const rescheduleCopy = (round: CandidateInterviewRoundView | null) => {
    const status = round ? normaliseRoundStatus(round.status) : '';
    const noShow = status === 'no_show' || status === 'interviewer_no_show';
    const base = noShow
      ? 'The candidate did not attend. This creates a new attempt and emails them a link valid for 24 hours.'
      : 'This creates a new attempt and emails the candidate a link valid for 24 hours.';
    // A panel round still booked for the future also frees its calendar slot.
    const calendar =
      round?.round_type === 'PANEL' && status === 'scheduled'
        ? ' The current calendar event will be cancelled.'
        : '';
    return base + calendar;
  };

  const closeRescheduleFlow = () => {
    setIsRescheduleConfirmOpen(false);
    setRescheduleRound(null);
    setRescheduleStep('choice');
    setRescheduleInterviewerIds([]);
    setRescheduleMode('reschedule');
  };

  // `interviewerIds` is PANEL's "choose different interviewers" path only —
  // omitted (undefined), the backend carries the original roster forward
  // automatically. Same degradation as creating a booking the first time,
  // so the toast branches the same way `handleCreateBooking` below does.
  const handleRequestCallReschedule = async (interviewerIds?: string[]) => {
    if (!rescheduleRound?.interview_booking_id) return;
    if (isReinviteMode) {
      await runReinvite(rescheduleRound.interview_booking_id, interviewerIds);
      closeRescheduleFlow();
      return;
    }
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
      if (isAlreadySelectedError(e)) {
        setBookingsClosed(true);
        showToast({ message: ALREADY_SELECTED_MESSAGE, type: 'info' });
      } else if (isInterviewInProgressError(e)) {
        showToast({ message: INTERVIEW_IN_PROGRESS_RESCHEDULE_MESSAGE, type: 'info' });
      } else {
        showToast({
          message: getInterviewErrorMessage(e, 'Could not request a reschedule'),
          type: 'error',
        });
      }
    } finally {
      closeRescheduleFlow();
    }
  };

  // Reinvite for a booking whose scheduling link hasn't been used yet,
  // expired or not (no longer gated on expiry, interview-service
  // 2026-10-05): POST /bookings/{id}/reinvite, capped at the booking's `max_reinvite_count` (fallback MAX_REINVITES).
  // PANEL carries the original roster forward.
  const runReinvite = async (bookingId: string | null | undefined, interviewerIds?: string[]) => {
    if (!bookingId) return;
    try {
      await reinviteBooking({ bookingId, interviewerIds }).unwrap();
      showToast({
        message: 'Reinvite sent: the candidate has been emailed a new link.',
        type: 'success',
      });
      // The reinvite is a NEW booking (new id): pick the round's new
      // booking up now instead of waiting for the next poll.
      void refetchRounds();
    } catch (e) {
      const code = (e as InterviewApiError)?.code;
      if (isAlreadySelectedError(e)) {
        setBookingsClosed(true);
        showToast({ message: ALREADY_SELECTED_MESSAGE, type: 'info' });
      } else if (code === 'MAX_REINVITES_EXCEEDED') {
        showToast({
          message: `The maximum of ${selectedBooking?.max_reinvite_count ?? MAX_REINVITES} reinvites has been used for this round.`,
          type: 'error',
        });
        // Screen was out of date: reload the round's state.
        void refetchSelectedBooking();
        void refetchRounds();
      } else if (code === 'REINVITE_NOT_ELIGIBLE') {
        // Covers several cases (link already used, booking already scheduled,
        // cancelled for another reason), so show the backend's own message.
        showToast({
          message: getInterviewErrorMessage(e, 'This booking cannot be reinvited right now.'),
          type: 'error',
        });
        void refetchSelectedBooking();
        void refetchRounds();
      } else {
        showToast({
          message: getInterviewErrorMessage(e, 'Could not send the reinvite'),
          type: 'error',
        });
      }
    }
  };

  // Clicking a star saves the rating straight away — same
  // `POST /resume-review` the scoring modal uses, re-sending the existing
  // comment so a star click never wipes it.
  const saveResumeReview = async (rating: number | null, comment: string) => {
    if (!candidateId) return;
    try {
      await recordResumeReview({
        candidateId,
        body: { rating: rating || undefined, comment: comment.trim() || undefined },
      }).unwrap();
      showToast({ message: 'Resume scoring saved.', type: 'success' });
      refetchCandidate();
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not save scoring'), type: 'error' });
    }
  };

  // Clicking the star that's already selected clears the rating (antd's
  // `allowClear` reports 0) — same delete as the old "Remove Scoring" link.
  const handleRateResume = (rating: number) => {
    if (!rating) {
      if (candidate?.resume_rating) void handleDeleteResumeReview();
      return;
    }
    void saveResumeReview(rating, candidate?.resume_review_comment ?? '');
  };

  const savedResumeComment = candidate?.resume_review_comment ?? '';
  const isResumeCommentDirty = resumeCommentDraft.trim() !== savedResumeComment.trim();

  // Re-seed the draft whenever the saved comment changes (load, save,
  // Remove scoring, or switching candidate).
  useEffect(() => {
    setResumeCommentDraft(savedResumeComment);
  }, [savedResumeComment, candidateId]);

  const resetSkipForm = () => {
    setSkipReason('');
    setSkipReasonError(null);
  };

  const handleSkipRound = async () => {
    if (!candidateId || !skipReason.trim()) return;
    setSkipReasonError(null);
    try {
      // Skip needs only a reason (the one box). No feedback is asked for.
      const result = await skipInterviewRound({
        candidateId,
        reason: skipReason.trim(),
        // The round this screen shows as current: a stale screen is refused
        // (ROUND_ALREADY_ADVANCED) instead of skipping the wrong round.
        expectedRoundId: currentRound?.id ?? null,
        // Skipping asks for a reason only; feedback is for advancing. The
        // backend's interviewer-feedback gate is for rounds that were run:
        // a deliberate skip, with its reason on record, passes it.
        overridePendingInterviewerFeedback: true,
      }).unwrap();
      showToast({
        message: result.skipped_round
          ? `${roundLabel(result.skipped_round)} skipped.`
          : 'Round skipped.',
        type: 'success',
      });
      setIsSkipOpen(false);
      resetSkipForm();
    } catch (e) {
      const status = getCandidateErrorStatusCode(e);
      const serverMessage = getCandidateErrorMessage(e, '');
      // candidate-service's error body carries no machine code (see
      // candidateError.helpers), so the cases are told apart by status + message.
      if (status === 409 && /already moved on/i.test(serverMessage)) {
        // ROUND_ALREADY_ADVANCED: nothing was skipped. Bring the page up to date.
        showToast({
          message: 'This candidate has already moved on from that round. The page was refreshed.',
          type: 'info',
        });
        setIsSkipOpen(false);
        resetSkipForm();
        void refetchRounds();
        refetchCandidate();
        return;
      }
      if (status === 422 && /guidelines|content/i.test(serverMessage)) {
        // Show the content-check message under the reason box.
        setSkipReasonError(serverMessage);
        return;
      }
      let message = serverMessage || 'Could not skip round';
      if (status === 409) {
        if (/in[ _-]?progress/i.test(serverMessage)) {
          message = "Can't skip: the interview is in progress.";
        } else if (/terminal|concluded|already (finished|skipped|completed)/i.test(serverMessage)) {
          message = 'This round has already concluded.';
        } else if (/scored/i.test(serverMessage)) {
          message = "This round has been scored and can't be skipped.";
        } else if (/final|selected|rejected|withdrawn/i.test(serverMessage)) {
          message = 'This candidate is already finished.';
        }
        // The round list is stale if the round already moved on.
        void refetchCandidate();
      }
      showToast({ message, type: 'error' });
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

  const handleCreateBooking = async (): Promise<boolean> => {
    if (!candidateId || !selectedRound || bookingsClosed) return false;
    // Belt-and-suspenders alongside the button's own `disabled` — a PANEL
    // booking with no roster falls back to interview-service auto-composing
    // it from whichever calendar-connected interviewers are in the pool,
    // which is exactly the untested, no-real-caller path this picker exists
    // to avoid (see CreateBookingRequest.interviewer_ids's own comment).
    if (isPanelRound && selectedInterviewerIds.length === 0) return false;

    setIsCreatingBooking(true);
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
      // The candidate-service Send Invite (`POST /candidates/{id}/send-invite`),
      // the recruiter's "go ahead and schedule" for the round that is due: it
      // stamps the invite on the round and announces it to interview-service,
      // which creates the booking and emails the candidate (with the
      // call-now option for recruiter-uploaded candidates). A PANEL round's
      // saved interviewers ride along on the same publish.
      const sent = await sendRoundInvite(candidateId).unwrap();
      void refetchRounds();
      // A panel round's candidate mail goes out only once every selected
      // interviewer has a connected calendar: say which are still missing.
      const missingInterviewers = isPanelRound
        ? selectedInterviewerIds
            .filter((id) => interviewerCalendarConnectedById.get(id) === false)
            .map(
              (id) =>
                (eligibleInterviewers ?? []).find((i) => i.id === id)?.display_name ?? 'Interviewer'
            )
        : [];
      reportInviteSent(sent, missingInterviewers);
      return true;
    } catch (error) {
      reportInviteError(error);
      return false;
    } finally {
      setIsCreatingBooking(false);
    }
  };

  // How a sent invite is reported — shared by the invite dialog above and the
  // Panel Interviewers picker's "send invite" box, so both read the same.
  // A panel round's candidate mail goes out only once every selected
  // interviewer has a connected calendar: `missingInterviewers` names them.
  function reportInviteSent(sent: { invite_sent: boolean }, missingInterviewers: string[]) {
    showToast({
      message:
        missingInterviewers.length > 0
          ? `Invitation created. The candidate will be emailed once all interviewers have connected their calendars (waiting on ${missingInterviewers.join(', ')}).`
          : sent.invite_sent
            ? 'Invitation sent to the candidate.'
            : 'An invitation for this round was just sent.',
      type: missingInterviewers.length > 0 || !sent.invite_sent ? 'info' : 'success',
    });
  }

  function reportInviteError(error: unknown) {
    // candidate-service's own refusals (409/422: the resume stage has no
    // invite, no round is awaiting one, the round is already booked) carry a
    // readable message; the 'already selected' case still closes bookings.
    if (isAlreadySelectedError(error)) {
      setBookingsClosed(true);
      showToast({ message: ALREADY_SELECTED_MESSAGE, type: 'info' });
      return;
    }
    // A stale screen can still offer Invite after the number was flagged.
    if (isPhoneNumberUnusableError(error)) {
      showToast({ message: PHONE_BLOCKED_INVITE_MESSAGE, type: 'error' });
      void refetchCandidate();
      return;
    }
    showToast({
      message: getCandidateErrorMessage(error, 'Could not send the invitation.'),
      type: 'error',
    });
    void refetchRounds();
  }

  // The Panel Interviewers picker's "send invite" box: the roster is already
  // saved by the picker, so this only sends the due round's invite (same
  // `POST /candidates/{id}/send-invite` as the Invite button — the saved
  // interviewers ride along). Once sent, the round is no longer "not
  // invited", so the scheduling tab's Invite button goes away by itself.
  const sendInviteFromPanelPicker = async (missingInterviewers: string[]): Promise<boolean> => {
    if (!candidateId || bookingsClosed) return false;
    setIsCreatingBooking(true);
    try {
      const sent = await sendRoundInvite(candidateId).unwrap();
      void refetchRounds();
      reportInviteSent(sent, missingInterviewers);
      return true;
    } catch (error) {
      reportInviteError(error);
      return false;
    } finally {
      setIsCreatingBooking(false);
    }
  };

  // SMS needs a phone number, and the candidate must not have opted out
  // (SMS is on by default; candidate-service refuses the send otherwise, 422
  // CANDIDATE_OPTED_OUT_OF_SMS). A missing `sms_opted_out_at` means "allowed".
  const smsBlockedReason = getSmsBlockedReason(candidate);

  // The header pill shows the same four top-level states as the candidate list
  // (In Process / Selected / Rejected / Withdrawn). The raw status label can
  // sit on a stale intermediate value, e.g. "Consistency Check — Needs Review",
  // which the backend stamps when the Intake Call check returns and which no
  // later advance replaces.
  const displayStatus = candidate ? resolveDisplayStatus(candidate) : 'in_process';
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
  // Reusing the one shared definition means this file and the sidebar can
  // never disagree about which round is the Intake Call.
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
  const selectedRoundScore = selectedRound ? findRoundScore(scores, selectedRound) : undefined;
  const isSelectedRoundScoring = Boolean(
    selectedRound && scoringRoundIds.has(selectedRound.id) && selectedRoundScore?.score == null
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
  const overallScoreReady = isReadyForOverallScore(rounds);
  const isAdvanceLocked = currentRound !== null && currentRound.id === advancedFromRoundId;
  const nextRound = currentRound
    ? (rounds[rounds.findIndex((r) => r.id === currentRound.id) + 1] ?? null)
    : null;
  // The next round can be invited together with Advance, except Identity
  // Verification, and a PANEL round with no interviewers picked yet. A PANEL
  // round whose roster is already saved can: Advance's invite publishes the
  // same round-ready event as the card's Invite, roster included.
  const isNextRoundPanel =
    nextRound !== null &&
    (nextRound.round_type === 'PANEL' ||
      (nextRound.round_type == null && /panel/i.test(nextRound.round_name ?? '')));
  const nextRoundInterviewerIds = isNextRoundPanel ? (nextRound?.interviewer_ids ?? []) : [];
  const canAutoInviteNextRound =
    nextRound !== null &&
    nextRound.stage_type === 'interview' &&
    (!isNextRoundPanel || nextRoundInterviewerIds.length > 0) &&
    !isIdentityVerificationRound(nextRound);
  // Names for the panel roster shown in the Advance popup — same candidate-
  // scoped directory the interviewer picker uses (RTK shares the cache).
  const { data: nextRoundEligibleInterviewers } = useListEligibleInterviewersQuery(
    candidateId ?? '',
    { skip: !candidateId || !isAdvanceOpen || nextRoundInterviewerIds.length === 0 }
  );
  const nextRoundInterviewerNames = nextRoundInterviewerIds.map(
    (id) => nextRoundEligibleInterviewers?.find((i) => i.id === id)?.display_name ?? 'Interviewer'
  );
  // The round being completed needs the recruiter's feedback on file first.
  const currentRoundScore = currentRound ? findRoundScore(scores, currentRound) : undefined;
  // Both a star rating and written feedback are required; whatever is already
  // on file is prefilled so only the missing part has to be added.
  const advanceFeedbackRequirement: AdvanceFeedbackRequirement = !currentRound
    ? null
    : isResumeStageRound(currentRound)
      ? candidate?.resume_rating && candidate.resume_review_comment?.trim()
        ? null
        : {
            kind: 'resume',
            rating: candidate?.resume_rating ?? 0,
            comment: candidate?.resume_review_comment ?? '',
          }
      : {
          // Interview rounds: the backend refuses to close one until its
          // interviewer's feedback is recorded (409 INTERVIEWER_FEEDBACK_PENDING),
          // and takes it with the advance itself. The Intake Call is exempt
          // on the backend, so no recommendation is sent for it. Stars are
          // saved on the round's score record when it has one.
          kind: 'round',
          scoreId: currentRoundScore?.id ?? null,
          rating: currentRoundScore?.recruiter_score ?? 0,
          comment: currentRoundScore?.recruiter_score_reason ?? '',
          withRecommendation: !isIntakeCallRound(currentRound),
        };
  // MARK AS SELECTED also appears once the candidate is ON their last round
  // (2026-09-29 product decision) — no need to ADVANCE past it first.
  // `rounds` is already in walk order (orderRoundsForFlow), so "last" is
  // the final entry.
  const isOnLastRound =
    currentRound !== null && rounds.length > 0 && currentRound.id === rounds[rounds.length - 1].id;

  // The header's quick action follows the round the candidate is on:
  //   advance - the round is finished (or it is the resume stage): the
  //             manual Advance, with feedback and the invite checkbox;
  //   skip    - an interview round hasn't finished: the button becomes Skip
  //             and turns back into Advance once the round concludes;
  //   last    - the final round: Advance is greyed out, the candidate is
  //             marked as selected or rejected instead.
  // Only the job's hiring managers and recruiters may act (a job with none
  // listed is left open so nobody is locked out).
  // A candidate who gave the Intake Call first uploads the resume afterwards
  // through an emailed link; until it arrives the resume stage can't be
  // advanced (resume is mandatory and there is nothing to rate yet).
  const awaitingResume =
    currentRound !== null && isResumeStageRound(currentRound) && !candidate?.resume_s3_key;
  const quickAction: 'advance' | 'skip' | 'last' | 'none' | 'awaiting_resume' = !currentRound
    ? 'none'
    : awaitingResume
      ? 'awaiting_resume'
      : isOnLastRound
        ? 'last'
        : advanceDisabled
          ? 'skip'
          : 'advance';
  // The app's own "who may act on this job" rule (`isAssignedToJob`): the
  // job's hiring managers, recruiters and creator, plus the roles above them
  // (company admin, owner, anyone holding job-delete), who can do everything
  // in the pipeline. Left open until the job has loaded.
  const jobDetails = jobOpeningData?.details;
  const isJobInCharge = !jobOpeningData
    ? true
    : isAssignedToJob(
        {
          hiringManagerIds: jobDetails?.hiring_manager_ids,
          recruiterIds: jobDetails?.recruiter_ids,
          createdById: jobDetails?.created_by,
        },
        userId,
        loginRole,
        effectivePermissions
      );
  const NOT_IN_CHARGE_MESSAGE =
    'Only the hiring manager or a recruiter on this job, or a company admin, can advance or skip a candidate.';
  const LAST_ROUND_MESSAGE =
    'This is the last round. Mark the candidate as selected or reject them.';

  // The Intake Call is optional (job-service, 2026-10-05) and its
  // consistency check no longer gates anything: ADVANCE / REJECT / MARK
  // SELECTED / SKIP stay live on the Resume and Intake Call rounds whether or
  // not a consistency score has landed.

  // Header card's "Scored" table — one row per real round, per-round
  // sources (resume stage: AI resume score + the
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
    /** Shows "Skipped" in both columns instead of the round's (0) score. */
    skipped?: boolean;
  }[] = [
    ...(roundsLoaded && !hasResumeStageRound
      ? [
          {
            key: RESUME_FALLBACK_KEY,
            label: 'Resume Review',
            ai: candidate?.resume_score ?? null,
            human: candidate?.resume_rating ?? null,
          },
        ]
      : []),
    ...rounds.map((round) => {
      // A skipped round never ran, so its score row's 0 isn't a result:
      // shown as "Skipped" and kept out of the Overall Score average.
      if (isRoundSkipped(round)) {
        return {
          key: round.id,
          label: roundLabel(round),
          ai: null,
          human: null,
          skipped: true,
          excludeFromOverall: true,
        };
      }
      if (isResumeStageRound(round)) {
        return {
          key: round.id,
          label: roundLabel(round),
          ai: candidate?.resume_score ?? null,
          human: candidate?.resume_rating ?? null,
        };
      }
      if (isIntakeCallRound(round)) {
        // candidate-service now also records the consistency check as this
        // round's score row, which is what the recruiter's score attaches
        // to. No row yet (older candidates, or a check still pending): no
        // human counterpart, same as before.
        const intakeScore = findRoundScore(scores, round);
        return {
          key: round.id,
          label: roundLabel(round),
          ai: candidate?.consistency_score ?? null,
          human: intakeScore ? (intakeScore.recruiter_score ?? null) : undefined,
          aiHint: 'Resume consistency score (call transcript vs. resume)',
          excludeFromOverall: true,
        };
      }
      const roundScore = findRoundScore(scores, round);
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
  // N/A (null) until every round is done and the last has concluded — a
  // mid-pipeline average would read as a final verdict.
  const overallScore = overallScoreReady
    ? {
        ai: averageOf(overallRows.map((row) => row.ai)),
        human: averageOf(overallRows.map((row) => row.human)),
      }
    : { ai: null, human: null };

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
  // Resume stage detail in the old app's text layout: score sentences, the
  // recruiter's star rating + comments, and the resume page on the right.
  // Same data and handlers as before; shared by the resume round and the
  // fallback "Resume Review" tab.
  const resumeMatchMetrics = (jobScoringConfig?.data?.resumeConfig?.weights ?? []).map((w) => ({
    label: RESUME_CRITERIA_LABELS[w.categoryName] ?? w.displayName ?? w.categoryName,
    max: w.weightPercentage,
    description: w.description,
  }));

  // Icon-only (label on hover) so it doesn't crowd each round's header.
  const scoringCriteriaButton = (
    kind: 'resume' | 'interview' | 'intake',
    subtitle?: string,
    interviewRoundType?: InterviewScoringRoundType
  ) => (
    <Tooltip title="Scoring Criteria">
      <button
        type="button"
        aria-label="Scoring Criteria"
        className={`${candidateHeaderIconCircle} shrink-0`}
        onClick={() => setScoringCriteriaFor({ kind, subtitle, interviewRoundType })}
      >
        <LuListChecks size={18} strokeWidth={2} aria-hidden />
      </button>
    </Tooltip>
  );

  // The four AI criteria behind the resume score as 0-5 bars (shown as a
  // percentage), in the fixed order the old app listed them. Empty for a
  // candidate scored before candidate-service stored the breakdown — nothing
  // is invented for them.
  const resumeCategoryBars = Object.entries(RESUME_CRITERIA_LABELS).flatMap(([key, label]) => {
    const entry = candidate?.resume_category_scores?.find(
      (c) => String(c.key ?? '').toUpperCase() === key
    );
    if (!entry) return [];
    const value = Number(entry.score) || 0;
    const percentage = Math.max(0, Math.min(100, Math.round((value / AI_SCORE_MAX) * 100)));
    // Same bands, vibrant but soft tones rather than pure status colours.
    const color = percentage >= 80 ? '#3FB97F' : percentage >= 50 ? '#F6BC3F' : '#F0686B';
    // The AI's short reasons for this category (a list, or null / empty: no tooltip).
    const reasons = (entry.reason ?? []).filter((r) => r && r.trim().length > 0);
    return [{ label, percentage, color, reasons }];
  });

  const renderResumeAssessment = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <p>
            Resume Score is <b>{candidate?.resume_score ?? 0}</b>/{AI_SCORE_MAX}
          </p>
          {/* Only for a pipeline with the (optional) Intake Call round: the
              call transcript checked against this resume. */}
          {rounds.some(isIntakeCallRound) && (
            <Tooltip title={candidate?.consistency_score_reason || undefined}>
              <p className="text-gray-600">
                Consistency (Intake Call):{' '}
                {candidate?.consistency_score != null ? (
                  <>
                    <b className="text-gray-900">{candidate.consistency_score}</b>/{AI_SCORE_MAX}
                  </>
                ) : (
                  <span className="text-gray-400">Pending</span>
                )}
              </p>
            </Tooltip>
          )}
        </div>
        <Button
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          onClick={() => setScoringCriteriaFor({ kind: 'resume' })}
        >
          <span>Scoring Criteria</span>
        </Button>
      </div>

      {/* flex, not a grid: a grid track's min-width defaults to its content's
          intrinsic size, so the PDF viewer's chrome could widen the "fixed"
          preview track and squeeze the text column. `shrink-0` makes the
          preview width a hard cap; `min-w-0` lets the text side wrap. */}
      <ResumeSplitLayout
        fitPreview={Boolean(candidate?.resume_s3_key && candidateId)}
        freezeSize={isAiCommentExpanded}
        aside={
          candidate?.resume_s3_key && candidateId ? (
            <ResumeInlinePreview
              candidateId={candidateId}
              candidateName={candidateDisplayName(candidate)}
              onExpand={() => setIsResumeViewerOpen(true)}
              heightClassName="h-full"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 self-start text-center">
              <p className="mt-4 text-gray-500">No resume on file yet.</p>
              <Tooltip
                title={
                  resumeUploadLinkExpired
                    ? undefined
                    : "Available once the candidate's 24-hour upload window has expired"
                }
              >
                <span className="inline-flex">
                  <Button
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void handleResendUploadLink()}
                    disabled={!resumeUploadLinkExpired || isResendingUploadLink}
                  >
                    {isResendingUploadLink ? 'Sending…' : 'Resend Upload Link'}
                  </Button>
                </span>
              </Tooltip>
            </div>
          )
        }
      >
        {resumeCategoryBars.length > 0 && (
          <div className="space-y-3.5">
            {resumeCategoryBars.map((bar) => {
              const row = (
                <div className="flex items-center gap-3">
                  <div className="h-5 w-44 shrink-0 overflow-hidden rounded-md bg-gray-100 xl:w-52">
                    <div
                      className="h-full rounded-md"
                      style={{ width: `${bar.percentage}%`, backgroundColor: bar.color }}
                    />
                  </div>
                  <span className="min-w-0 text-[13px] leading-tight text-gray-800">
                    {bar.label} – {bar.percentage}%
                  </span>
                </div>
              );
              // No reasons for this category: no tooltip at all (never an empty one).
              return bar.reasons.length > 0 ? (
                <Tooltip
                  key={bar.label}
                  placement="topLeft"
                  title={
                    <ul className="m-0 list-disc space-y-1 pl-4 text-xs">
                      {bar.reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  }
                >
                  <div>{row}</div>
                </Tooltip>
              ) : (
                <div key={bar.label}>{row}</div>
              );
            })}
          </div>
        )}

        <div>
          <h2 className="mb-1 text-base font-medium">Resume Rating</h2>
          {/* Clickable stars; empty stars in a visible grey (antd's
                default unfilled colour is near-invisible on white). */}
          <ConfigProvider theme={{ components: { Rate: { starBg: '#cbd5e1' } } }}>
            <Rate
              value={candidate?.resume_rating ?? 0}
              allowClear
              disabled={isSavingResumeRating}
              onChange={(value) => void handleRateResume(value)}
              tooltips={['Strong No', 'No', 'Neutral', 'Yes', 'Strong Yes']}
              className="text-xl"
            />
          </ConfigProvider>
        </div>

        <div>
          <h2 className="mb-1 text-base font-medium">Feedback Comments</h2>
          <Input.TextArea
            value={resumeCommentDraft}
            onChange={(e) => setResumeCommentDraft(e.target.value)}
            placeholder="No feedback comments yet"
            rows={4}
            disabled={isSavingResumeRating}
            className="rounded-lg text-xs"
          />
          {isResumeCommentDirty && (
            <div className="mt-2 flex items-center gap-2">
              <Button
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                disabled={isSavingResumeRating}
                onClick={() =>
                  void saveResumeReview(candidate?.resume_rating ?? null, resumeCommentDraft)
                }
              >
                {isSavingResumeRating ? 'Saving…' : 'Save'}
              </Button>
              <button
                type="button"
                className="text-xs font-semibold text-gray-500 hover:underline cursor-pointer"
                disabled={isSavingResumeRating}
                onClick={() => setResumeCommentDraft(savedResumeComment)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {(candidate?.scoring_reason || (candidate?.scoring_reason_bullets ?? []).length > 0) && (
          <div>
            <h2 className="mb-1 text-base font-medium">AI Comments</h2>
            <AiCommentsBox
              bullets={candidate?.scoring_reason_bullets ?? null}
              text={candidate?.scoring_reason ?? ''}
              expanded={isAiCommentExpanded}
              onToggle={() => setIsAiCommentExpanded((v) => !v)}
            />
          </div>
        )}
      </ResumeSplitLayout>
    </div>
  );

  const roundDetailBody = selectedRound ? (
    <>
      {selectedRound.skip_reason && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <p className="font-semibold text-gray-900">Round skipped</p>
          <p className="mt-1 text-gray-700">
            <span className="font-medium">Reason:</span> {selectedRound.skip_reason}
          </p>
          {selectedRound.skip_feedback &&
            selectedRound.skip_feedback !== selectedRound.skip_reason && (
              <p className="mt-1 whitespace-pre-line text-gray-700">
                <span className="font-medium">Feedback:</span> {selectedRound.skip_feedback}
              </p>
            )}
        </div>
      )}
      {isResumeStage ? (
        // The resume stage is "upload a resume, get it scored" —
        // there is no separate interview to schedule or book for
        // it (send_round_invite.py/skip_interview_round.py both
        // refuse this stage on the backend for the same reason).
        // What actually belongs here is the resume's own AI score
        // plus the recruiter's own review of it — previously only
        // reachable from the Assessment tab, so adding one here
        // never showed up on the "Resume Review" pipeline card
        // a recruiter actually clicks into.
        renderResumeAssessment()
      ) : (
        <RoundDetailTabs
          actions={
            // Round actions as icons (label on hover) — these replaced the
            // old "Interview Scheduling" card. Each shows only where that
            // card used to offer it; the invite icon sits next to Scoring
            // Criteria.
            <>
              {canManageRoundInterviewers(selectedRound) &&
                // Only until a panel is picked — an existing panel is changed
                // from the Re-invite / Reschedule popup instead.
                (selectedRound.interviewer_ids ?? []).length === 0 && (
                  // Saves the panel roster to the round (PanelInterviewersModal).
                  <Tooltip title="Set Interviewers">
                    <button
                      type="button"
                      aria-label="Set interviewers"
                      className={`${candidateHeaderIconCircle} shrink-0`}
                      onClick={() => setInterviewersModalFor(selectedRound)}
                    >
                      <LuUsers size={18} strokeWidth={2} aria-hidden />
                    </button>
                  </Tooltip>
                )}
              {isPanelRound &&
                (showsOwnConnectCalendarAction && calendarGrantStatus?.connected ? (
                  <Tooltip
                    title={`Calendar connected${calendarGrantStatus.email ? `: ${calendarGrantStatus.email}` : ''}`}
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-700">
                      <LuCalendarCheck size={18} strokeWidth={2} aria-label="Calendar connected" />
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Connect Calendar">
                    <button
                      type="button"
                      aria-label="Connect calendar"
                      className={`${candidateHeaderIconCircle} shrink-0`}
                      onClick={handleConnectCalendar}
                    >
                      <LuCalendarPlus size={18} strokeWidth={2} aria-hidden />
                    </button>
                  </Tooltip>
                ))}
              {/* Offline-PANEL only — an online PANEL round already gets its
                  recording via LiveKit egress, so attaching one there would
                  create a second, conflicting artifact. Mirrors
                  BookingDetailDrawer.tsx's own `isOfflinePanel`. */}
              {selectedRound.round_type === 'PANEL' &&
                selectedRound.interview_booking_id &&
                selectedBooking?.round_snapshot?.delivery_mode === 'offline' && (
                  <>
                    <input
                      ref={audioFileInputRef}
                      type="file"
                      accept={AUDIO_UPLOAD_ACCEPT}
                      className="hidden"
                      onChange={(e) => void handleAudioFileSelected(e)}
                    />
                    <Tooltip
                      title={
                        isUploadingAudio
                          ? 'Uploading…'
                          : hasRecording
                            ? 'Audio already uploaded for this round.'
                            : !hasInterviewStarted
                              ? interviewStartMs != null
                                ? `Available once the interview starts (${dayjs(interviewStartMs).format('MMM D, YYYY · h:mm A')}).`
                                : 'Available once the interview is scheduled and has started.'
                              : 'Upload Audio Recording'
                      }
                    >
                      <span className="inline-flex">
                        <button
                          type="button"
                          aria-label="Upload audio recording"
                          // Larger than the other round icons (h-9) so the
                          // in-person upload is easy to spot.
                          className={`${candidateHeaderIconCircle} !h-11 !w-11 shrink-0 ${hasRecording ? '!border-green-200 !bg-green-50 !text-green-700' : ''} ${!hasRecording && !hasInterviewStarted ? '!bg-gray-100 !text-gray-400' : ''}`}
                          disabled={isUploadingAudio || hasRecording || !hasInterviewStarted}
                          onClick={() => audioFileInputRef.current?.click()}
                        >
                          {hasRecording ? (
                            <LuCircleCheck size={22} strokeWidth={2} aria-hidden />
                          ) : (
                            <LuUpload size={22} strokeWidth={2} aria-hidden />
                          )}
                        </button>
                      </span>
                    </Tooltip>
                  </>
                )}
              {/* Identity Verification is never scored, so it gets no button. */}
              {isIntakeCallRound(selectedRound)
                ? scoringCriteriaButton('intake', roundLabel(selectedRound))
                : isIdentityVerificationRound(selectedRound)
                  ? null
                  : scoringCriteriaButton(
                      'interview',
                      roundLabel(selectedRound),
                      isAiVideoRound(selectedRound) ? 'ai_video' : isPanelRound ? 'panel' : 'audio'
                    )}
            </>
          }
          feedback={
            // The recruiter's own verdict on the round: their score and note
            // (the same record Interview Score shows beside the AI score),
            // then the candidate's own post-round rating once submitted.
            <>
              <section className="rounded-xl border border-[#E2E2E2] bg-white px-5 py-4 sm:px-6">
                {selectedRoundScore ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold tracking-wide text-gray-400">
                          Recruiter Score
                        </div>
                        <div className="mt-1 text-2xl font-bold text-green-700">
                          {selectedRoundScore.recruiter_score != null
                            ? `${selectedRoundScore.recruiter_score} / ${HUMAN_SCORE_MAX}`
                            : '-'}
                        </div>
                      </div>
                      <Button
                        className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700"
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
                          ? 'Edit Recruiter Score'
                          : 'Rate This Round'}
                      </Button>
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-semibold text-gray-700">Feedback</div>
                      <p className="whitespace-pre-line text-sm text-gray-600">
                        {selectedRoundScore.recruiter_score_reason || 'No feedback added yet.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Feedback can be added once this round has been scored.
                  </p>
                )}
              </section>
              {selectedRound.candidate_feedback_submitted_at && (
                <section className="rounded-xl border border-[#E2E2E2] bg-white px-5 py-4 sm:px-6">
                  <RoundCandidateFeedback
                    feedback={{
                      candidate_feedback_rating: selectedRound.candidate_feedback_rating,
                      candidate_feedback_text: selectedRound.candidate_feedback_text,
                      candidate_feedback_submitted_at:
                        selectedRound.candidate_feedback_submitted_at,
                    }}
                  />
                </section>
              )}
            </>
          }
          summary={
            <>
              {/* Old app's recording card: the player right in the card
              (RoundArtifactsPanel). `lazy`: nothing downloads until the card
              is first opened. Nothing is recorded before the round is booked. */}
              <RoundCollapsibleSection
                title={
                  isAiVideoRound(selectedRound) || isPanelRound
                    ? 'Video Interview Recording'
                    : 'Interview Recording'
                }
                lazy
              >
                {hasRoundRecordings(selectedRound) && candidateId ? (
                  <RoundRecording
                    candidateId={candidateId}
                    roundId={selectedRound.id}
                    roundType={selectedRound.round_type}
                  />
                ) : (
                  <p className="text-sm text-gray-600">Not available</p>
                )}
              </RoundCollapsibleSection>

              {!selectedRoundScore && isSelectedRoundScoring && (
                // Audio just uploaded and no score row exists yet — holds the
                // Interview Score slot until the AI's score lands.
                <RoundCollapsibleSection title="Interview Score" summary="Scoring…">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
                      aria-hidden
                    />
                    <span>Scoring… The AI score will appear here once it&apos;s ready.</span>
                  </div>
                </RoundCollapsibleSection>
              )}

              {selectedRoundScore && !selectedRoundIsIntakeCall && (
                // The round's own AI/recruiter score. The per-section
                // breakdown and the AI's reasoning get their own sections below.
                // Not for the Intake Call: its score row IS the consistency
                // check, already shown (score + reason) under Resume
                // Consistency; the recruiter rates it from the Feedback tab.
                <RoundCollapsibleSection
                  title="Interview Score"
                  summary={
                    selectedRoundScore.score == null &&
                    selectedRoundScore.recruiter_score == null &&
                    !isSelectedRoundScoring
                      ? undefined
                      : [
                          selectedRoundScore.score != null
                            ? `AI ${selectedRoundScore.score}/${AI_SCORE_MAX}`
                            : isSelectedRoundScoring
                              ? 'AI Scoring…'
                              : null,
                          selectedRoundScore.recruiter_score != null
                            ? `Recruiter ${selectedRoundScore.recruiter_score}/${HUMAN_SCORE_MAX}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
                      <div>
                        <div className="text-xs font-semibold tracking-wide text-gray-400">
                          AI Score
                        </div>
                        <div className="mt-1 text-2xl font-bold text-primary">
                          {selectedRoundScore.score != null ? (
                            `${selectedRoundScore.score} / ${AI_SCORE_MAX}`
                          ) : isSelectedRoundScoring ? (
                            <span className="text-base font-semibold text-gray-500">Scoring…</span>
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold tracking-wide text-gray-400">
                          Recruiter Score
                        </div>
                        <div className="mt-1 text-2xl font-bold text-green-700">
                          {selectedRoundScore.recruiter_score != null
                            ? `${selectedRoundScore.recruiter_score} / ${HUMAN_SCORE_MAX}`
                            : '-'}
                        </div>
                      </div>
                    </div>
                    <Button
                      className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700"
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
                        ? 'Edit Recruiter Score'
                        : 'Rate This Round'}
                    </Button>
                  </div>
                  {selectedRoundScore.recruiter_score_reason && (
                    <p className="mt-3 text-sm text-gray-600">
                      <span className="font-semibold text-gray-700">Recruiter note: </span>
                      {selectedRoundScore.recruiter_score_reason}
                    </p>
                  )}
                </RoundCollapsibleSection>
              )}

              {selectedRoundScore?.section_scores &&
                selectedRoundScore.section_scores.length > 0 && (
                  <RoundCollapsibleSection
                    title="Scorecard"
                    summary={`${selectedRoundScore.section_scores.length} categories`}
                  >
                    <div className="flex flex-col gap-3">
                      {selectedRoundScore.section_scores.map((section) => {
                        const pct = Math.max(
                          0,
                          Math.min(100, (section.score / AI_SCORE_MAX) * 100)
                        );
                        const barClass =
                          pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger';
                        const reasons = sectionReasons(section.reason);
                        const row = (
                          <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
                            <span
                              className="truncate text-gray-800"
                              title={reasons.length > 0 ? undefined : formatSectionKey(section.key)}
                            >
                              {formatSectionKey(section.key)}
                            </span>
                            <span className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                              <span
                                className={`block h-full rounded-full ${barClass}`}
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span className="text-right font-semibold text-gray-700">
                              {section.score}/{AI_SCORE_MAX}
                            </span>
                          </div>
                        );
                        // No reasons for this category: no tooltip at all.
                        return reasons.length > 0 ? (
                          <Tooltip
                            key={section.key}
                            placement="topLeft"
                            title={
                              <ul className="m-0 list-disc space-y-1 pl-4 text-xs">
                                {reasons.map((reason, i) => (
                                  <li key={i}>{reason}</li>
                                ))}
                              </ul>
                            }
                          >
                            {row}
                          </Tooltip>
                        ) : (
                          <div key={section.key}>{row}</div>
                        );
                      })}
                    </div>
                  </RoundCollapsibleSection>
                )}

              {selectedRoundScore?.scoring_reason && !selectedRoundIsIntakeCall && (
                <RoundCollapsibleSection title="Summary">
                  <AiCommentsBox
                    bullets={(selectedRoundScore.section_scores ?? [])
                      .map((section) => {
                        const reasons = sectionReasons(section.reason);
                        return reasons.length > 0
                          ? `${formatSectionKey(section.key)}: ${joinReasons(reasons)}`
                          : '';
                      })
                      .filter(Boolean)}
                    text={selectedRoundScore.scoring_reason ?? ''}
                    expanded={isRoundSummaryExpanded}
                    onToggle={() => setIsRoundSummaryExpanded((v) => !v)}
                  />
                </RoundCollapsibleSection>
              )}

              {/* Transcript as the old app's chat bubbles, in its own
                  scroll box with an expand-to-popup icon (RoundArtifactsPanel). */}
              <RoundCollapsibleSection title="Transcripts" lazy>
                {hasRoundRecordings(selectedRound) && candidateId ? (
                  <RoundTranscript
                    candidateId={candidateId}
                    roundId={selectedRound.id}
                    roundType={selectedRound.round_type}
                    roundName={roundLabel(selectedRound)}
                  />
                ) : (
                  <p className="text-sm text-gray-600">Not available</p>
                )}
              </RoundCollapsibleSection>

              {selectedRoundIsIntakeCall && (
                // Same transcript-vs-resume authenticity signal shown on the
                // Resume stage — surfaced here too since it's about THIS call.
                <RoundCollapsibleSection
                  title="Resume Consistency"
                  summary={
                    candidate?.consistency_score != null
                      ? `${candidate.consistency_score}/${AI_SCORE_MAX}`
                      : undefined
                  }
                >
                  <div className="text-2xl font-bold text-primary">
                    {candidate?.consistency_score != null
                      ? `${candidate.consistency_score} / ${AI_SCORE_MAX}`
                      : '-'}
                  </div>
                  {candidate?.consistency_score_reason ? (
                    <p className="mt-1 text-sm text-gray-600">
                      {candidate.consistency_score_reason}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">
                      Not available yet; reported once both the resume and this call&apos;s
                      transcript are in.
                    </p>
                  )}
                </RoundCollapsibleSection>
              )}

              {selectedRoundIsVoiceCall && (bookingHistory?.length ?? 0) > 1 && (
                // Only once there's more than one attempt. `bookingHistory` is
                // oldest-first; rendered newest-first.
                <RoundCollapsibleSection
                  title="Reschedule History"
                  subtitle="Select an attempt to view its questions below."
                  summary={`${bookingHistory?.length ?? 0} attempts`}
                >
                  <div className="flex flex-col gap-3">
                    {[...(bookingHistory ?? [])].reverse().map((attempt, index) => {
                      // Positional — the LAST entry after reversing is the
                      // original booking (never itself a reschedule).
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
                          onClick={() =>
                            setSelectedAttemptBookingId(index === 0 ? null : attempt.id)
                          }
                          aria-pressed={isSelected}
                          className={`flex w-full items-start justify-between gap-3 rounded-lg border-b border-gray-100 px-2 pb-3 pt-1 text-left last:border-0 last:pb-0 cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-white'
                              : 'group hover:bg-primary hover:text-white'
                          }`}
                        >
                          <div>
                            <div
                              className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-900 group-hover:text-white'}`}
                            >
                              {index === 0
                                ? 'Current Attempt'
                                : `Attempt ${bookingHistory!.length - index}`}
                            </div>
                            {index !== 0 && actionTime && (
                              <div
                                className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500 group-hover:text-white/80'}`}
                              >
                                {isOriginal ? 'Created' : 'Rescheduled'} {actionTime}
                              </div>
                            )}
                            <div
                              className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-400 group-hover:text-white/70'}`}
                            >
                              {formatDateTime(attempt.start_time)
                                ? `Scheduled for ${formatDateTime(attempt.start_time)}`
                                : CONCLUDED_BOOKING_STATUSES.includes(attempt.status)
                                  ? 'Call placed immediately (no scheduled time)'
                                  : 'Not yet scheduled'}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 text-xs font-semibold ${isSelected ? 'text-white' : 'text-primary-600 group-hover:text-white'}`}
                          >
                            {formatCallIntent(attempt.call_intent)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </RoundCollapsibleSection>
              )}

              {isPanelRound && (
                <RoundCollapsibleSection
                  title="Interview Questions"
                  subtitle="Visible to whoever is preparing for or sitting on this panel."
                  summary={
                    roundQuestions && roundQuestions.questions.length > 0
                      ? `${roundQuestions.questions.length} questions`
                      : undefined
                  }
                >
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
                </RoundCollapsibleSection>
              )}

              {isVoiceScreeningRound && (
                <RoundCollapsibleSection
                  title="Questions Asked"
                  summary={questionsAskedAttemptLabel ?? undefined}
                >
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
                        <p className="mt-2 text-xs text-gray-400">{questionsAsked.limitation}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No questions were recorded for this call.
                    </p>
                  )}
                </RoundCollapsibleSection>
              )}
            </>
          }
        />
      )}
    </>
  ) : null;

  // Previous / Next in the listing's order (see useCandidateNavigation).
  // Portaled into JobDetailsLayout's Back row, right under "Back to
  // Candidate List" on the right; inline in the name row as a fallback.
  const candidateSwitcher =
    candidateNav.isReady && candidateNav.total > 1 ? (
      <div
        className={`flex items-center gap-2 ${headerSlot ? '' : 'border-l border-gray-200 pl-3'}`}
      >
        <Tooltip title="Previous Candidate">
          <span className="inline-flex">
            <button
              type="button"
              className={candidateHeaderIconCircle}
              disabled={!candidateNav.hasPrev}
              aria-label="Previous candidate"
              onClick={() => candidateNav.goPrev(activeTab)}
            >
              <LuChevronLeft size={18} strokeWidth={2} aria-hidden />
            </button>
          </span>
        </Tooltip>
        <span className="whitespace-nowrap text-xs font-medium text-gray-500 tabular-nums">
          {candidateNav.position} of {candidateNav.total}
        </span>
        <Tooltip title="Next Candidate">
          <span className="inline-flex">
            <button
              type="button"
              className={candidateHeaderIconCircle}
              disabled={!candidateNav.hasNext}
              aria-label="Next candidate"
              onClick={() => candidateNav.goNext(activeTab)}
            >
              <LuChevronRight size={18} strokeWidth={2} aria-hidden />
            </button>
          </span>
        </Tooltip>
      </div>
    ) : null;

  // Shown under the header when the resume gave no email and/or phone number.
  const missingEmail = Boolean(candidate) && !candidate?.email_id?.trim();
  const missingPhone = Boolean(candidate) && !candidate?.contact_no?.trim();
  const missingContactNotice =
    missingEmail && missingPhone
      ? "No email or phone number found in candidate's resume. Actions like email, text, scheduling invites and notifications won't work until they are added."
      : missingEmail
        ? "No email found in candidate's resume. Actions like email and scheduling invites won't work until it is added."
        : missingPhone
          ? "No phone number found in candidate's resume. Actions like text and notifications won't work until it is added."
          : null;

  return (
    <>
      {headerSlot && candidateSwitcher && createPortal(candidateSwitcher, headerSlot)}
      {isCandidateLoading && <Loader />}
      {/* Floating Email / SMS dock on the right edge — reachable from
          anywhere on the page without scrolling back to the header. Opens
          the same modals as the header icons. */}
      <div className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3">
        <Tooltip placement="left" title={candidate?.email_id ? 'Send Email' : 'No email on file'}>
          <span className="inline-flex">
            <button
              type="button"
              aria-label="Email candidate"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-300 bg-primary-100 text-primary shadow-lg transition-colors hover:bg-primary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!candidate?.email_id}
              onClick={() => setIsEmailOpen(true)}
            >
              <LuMail size={19} strokeWidth={2} aria-hidden />
            </button>
          </span>
        </Tooltip>
        <Tooltip placement="left" title={smsBlockedReason ?? 'Send SMS'}>
          <span className="inline-flex">
            <button
              type="button"
              aria-label="Send SMS"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-300 bg-primary-100 text-primary shadow-lg transition-colors hover:bg-primary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              disabled={smsBlockedReason !== null}
              onClick={() => setIsSmsOpen(true)}
            >
              <IoChatbubbleEllipses size={19} aria-hidden />
            </button>
          </span>
        </Tooltip>
      </div>
      <div className="flex flex-col mb-4 gap-2">
        <div className="flex-1 bg-white px-6 py-4 shadow-sm rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-200">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold">{candidateDisplayName(candidate)}</h2>
              {candidate?.resume_name_missing && <NameMissingFlag />}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!candidate}
                onClick={() => {
                  setActiveTab('details');
                  setIsEditingDetails(true);
                }}
              >
                Edit Candidate Details
              </button>
              <Tooltip title={candidate?.email_id ? 'Send Email' : 'No email on file'}>
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
              <Tooltip title={smsBlockedReason ?? 'Send SMS'}>
                <span className="inline-flex">
                  <button
                    type="button"
                    className={candidateHeaderIconCircle}
                    disabled={smsBlockedReason !== null}
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
                        candidateDisplayStatusColor(displayStatus).text
                }`}
              >
                {statusUpper === 'selected' ? (
                  <LuThumbsUp size={16} />
                ) : statusUpper.includes('reject') ? (
                  <LuThumbsDown size={16} />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${candidateDisplayStatusColor(displayStatus).dot}`}
                  />
                )}
                {candidateDisplayStatusLabel(displayStatus)}
              </span>
              {/* Previous / Next fallback, only when there's no layout Back row to sit in. */}
              {!headerSlot && candidateSwitcher}
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
              <HeaderInfoRow label="Phone:">
                {candidate?.contact_no ?? 'N/A'}
                {phoneNumberIssueMessage(candidate?.phone_number_issue) && (
                  <span className="mt-1 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                    <LuTriangleAlert size={14} className="mt-px shrink-0" aria-hidden />
                    {phoneNumberIssueMessage(candidate?.phone_number_issue)}
                  </span>
                )}
              </HeaderInfoRow>
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
                      title={
                        overallScoreReady
                          ? 'Average across rounds with a score (skipped rounds and the Intake Call consistency check not included)'
                          : 'Shown once all rounds are completed'
                      }
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
                      {row.skipped ? (
                        <>
                          <div className="text-right text-gray-500">Skipped</div>
                          <div className="text-right text-gray-500">Skipped</div>
                        </>
                      ) : (
                        <>
                          <div className="text-right text-primary" title={row.aiHint}>
                            {formatScoredCell(row.ai)}
                          </div>
                          <div className="text-right text-green-700">
                            {formatScoredCell(row.human, HUMAN_SCORE_MAX)}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-3 border-t border-gray-200 pt-4 lg:border-t-0 lg:border-l lg:border-gray-300 lg:pl-6 lg:pt-0">
              {!isTerminal && (
                // Always visible while the candidate is still in the
                // pipeline.
                // MARK AS SELECTED is offered on every round: the backend
                // completes the resume stage and skips whatever rounds are
                // left (candidate-service _status_round_cascade.py).
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* One button for both: Advance moves the candidate on
                      once the current round has concluded; while an
                      interview round is still unfinished the same button
                      skips it (asks for a reason first). The resume stage
                      can only ever be advanced. */}
                  <Tooltip
                    title={
                      !isJobInCharge
                        ? NOT_IN_CHARGE_MESSAGE
                        : quickAction === 'none'
                          ? 'No round left to advance'
                          : quickAction === 'awaiting_resume'
                            ? "Waiting for the candidate's resume. Resume is mandatory and can't be skipped."
                            : quickAction === 'last'
                              ? LAST_ROUND_MESSAGE
                              : quickAction === 'skip' && currentRound
                                ? `${roundLabel(currentRound)} hasn't finished yet. Skip it, or wait until it finishes to advance.`
                                : undefined
                    }
                  >
                    <span className="flex">
                      <Button
                        className="flex h-[34px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-3 text-[13px] font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-50 border-primary bg-primary-50 text-primary hover:bg-primary-100"
                        onClick={() =>
                          quickAction === 'skip' ? setIsSkipOpen(true) : setIsAdvanceOpen(true)
                        }
                        disabled={
                          !isJobInCharge ||
                          isAdvanceLocked ||
                          quickAction === 'last' ||
                          quickAction === 'awaiting_resume' ||
                          quickAction === 'none'
                        }
                      >
                        {quickAction === 'skip' && <LuSkipForward size={15} aria-hidden />}
                        <span>{quickAction === 'skip' ? 'Skip' : 'Advance'}</span>
                      </Button>
                    </span>
                  </Tooltip>
                  <span className="flex">
                    <Button
                      className="flex h-[34px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-3 text-[13px] font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-50 border-red-600 bg-red-50 text-red-600 hover:bg-red-100"
                      onClick={() => setStatusModal('reject')}
                    >
                      <span>Reject</span>
                    </Button>
                  </span>
                  <Tooltip
                    title={
                      !isOnLastRound && !allRoundsCompleted
                        ? 'Select now: any remaining rounds will be skipped'
                        : undefined
                    }
                  >
                    <span className="flex">
                      <Button
                        className="flex h-[34px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-3 text-[13px] font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-50 border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                        onClick={() => setStatusModal('select')}
                      >
                        <span>Mark As Selected</span>
                      </Button>
                    </span>
                  </Tooltip>
                  <Button
                    className="flex h-[34px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-3 text-[13px] font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-50 border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100"
                    onClick={() => setIsAssignJobOpen(true)}
                  >
                    <span>Assign New Job</span>
                  </Button>
                  {quickAction === 'last' && (
                    <p className="text-xs text-gray-500 sm:col-span-2">{LAST_ROUND_MESSAGE}</p>
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

          {/* Email and/or phone missing (the resume had none, e.g. a bulk resume
              upload): say which, and which actions won't work, with a way
              straight into editing them. */}
          {candidate && missingContactNotice && (
            <div className="mt-4 flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-700">{missingContactNotice}</p>
              <button
                type="button"
                className="shrink-0 cursor-pointer rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                onClick={() => {
                  setActiveTab('details');
                  setIsEditingDetails(true);
                }}
              >
                Add Details
              </button>
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
            // Old app's layout: read-only fields styled like its inputs on the
            // left, the resume page (no card/heading around it) on the right,
            // sized to the fields' height. Actions sit in one row above both.
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  className="box-border inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 bg-white px-4 text-xs font-medium leading-none cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setIsEditingDetails((editing) => !editing)}
                  disabled={!candidate}
                >
                  {!isEditingDetails && <LuPencil size={13} className="shrink-0" aria-hidden />}
                  <span>{isEditingDetails ? 'Cancel' : 'Edit Details'}</span>
                </Button>
                {candidate?.resume_s3_key ? (
                  <>
                    <Tooltip title="View">
                      <button
                        type="button"
                        aria-label="View resume"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary-200 bg-primary-50 text-primary-700 transition-colors hover:bg-primary-100 cursor-pointer"
                        onClick={() => setIsResumeViewerOpen(true)}
                      >
                        <LuEye size={17} aria-hidden />
                      </button>
                    </Tooltip>
                    <Tooltip title={isResumeUrlLoading ? 'Preparing…' : 'Download'}>
                      <span className="inline-flex">
                        <button
                          type="button"
                          aria-label="Download resume"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-opacity hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => void handleDownloadResume()}
                          disabled={isResumeUrlLoading}
                        >
                          <LuDownload size={17} aria-hidden />
                        </button>
                      </span>
                    </Tooltip>
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
                        className="box-border inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-primary px-4 text-xs font-semibold leading-none text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => void handleResendUploadLink()}
                        disabled={!resumeUploadLinkExpired || isResendingUploadLink}
                      >
                        {isResendingUploadLink ? 'Sending…' : 'Resend Upload Link'}
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_230px]">
                {/* Read-only (not-allowed cursor) until Edit Details is
                    clicked, then editable in place. */}
                <CandidateDetailsForm
                  candidate={candidate}
                  isEditing={isEditingDetails}
                  onDone={() => setIsEditingDetails(false)}
                  sourceLabel={sourceLabel ?? undefined}
                  appliedDate={formatDateTime(candidate?.applied_date) ?? undefined}
                />

                {/* On lg the resume fills exactly the fields' height (absolute
                    inside a stretched grid cell, so it never sets the row
                    height itself); below lg it gets a fixed height. */}
                <div className="relative h-[360px] lg:h-auto">
                  <div className="absolute inset-0">
                    {candidate?.resume_s3_key && candidateId ? (
                      <ResumeInlinePreview
                        candidateId={candidateId}
                        candidateName={candidateDisplayName(candidate)}
                        onExpand={() => setIsResumeViewerOpen(true)}
                        heightClassName="h-full"
                      />
                    ) : (
                      // Same frame as the preview, message inside it.
                      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center">
                        <LuFileText size={28} className="text-gray-300" aria-hidden />
                        <p className="text-sm text-gray-500">
                          {resumeUploadLinkExpired
                            ? "No resume yet — the candidate's upload link expired."
                            : 'No resume on file yet.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
              <div className="flex flex-col gap-4 lg:min-h-[633px] lg:flex-row lg:items-stretch">
                <div className="w-full shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white lg:w-1/5">
                  <ul className="flex overflow-x-auto text-sm text-gray-800 lg:flex-col lg:overflow-visible">
                    {roundsLoaded && !hasResumeStageRound && (
                      <li className="relative min-w-[210px] border-r border-gray-100 last:border-r-0 lg:min-w-0 lg:border-r-0">
                        <button
                          type="button"
                          className={`flex w-full flex-col items-center gap-1 px-4 py-4 text-center cursor-pointer transition-colors hover:bg-gray-50 ${
                            isResumeFallbackSelected ? 'bg-primary-50/60' : ''
                          }`}
                          onClick={() => {
                            setSelectedRound(null);
                            setIsResumeFallbackSelected(true);
                          }}
                        >
                          <h3
                            className={`text-sm font-semibold ${isResumeFallbackSelected ? 'text-primary' : 'text-gray-900'}`}
                          >
                            Resume Review
                          </h3>
                          {candidate?.resume_score != null && (
                            <p className="text-xs text-gray-800">
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
                            ? findRoundScore(scores, round)
                            : undefined
                        }
                        resumeScore={candidate?.resume_score ?? null}
                        consistencyScore={candidate?.consistency_score ?? null}
                        jobId={parsedJobId || undefined}
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

                <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5">
                  {isResumeFallbackSelected ? (
                    renderResumeAssessment()
                  ) : selectedRound ? (
                    <WidgetErrorBoundary key={selectedRound.id} label="Round Details">
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

          {activeTab === 'scheduling' && candidateId && (
            <InterviewSchedulingTab
              candidateId={candidateId}
              rounds={rounds}
              roundsLoaded={roundsLoaded}
              scores={scores}
              currentRoundId={currentRound?.id ?? null}
              isTerminal={isTerminal}
              bookingsClosed={bookingsClosed}
              phoneNumberIssue={candidate?.phone_number_issue ?? null}
              isBusy={
                isCreatingBooking || isSavingInterviewers || isRequestingReschedule || isReinviting
              }
              onInvite={(round) => {
                setSelectedRound(round);
                setIsInviteOpen(true);
              }}
              jobId={parsedJobId || undefined}
              onSelectInterviewers={(round) => setInterviewersModalFor(round)}
              onReinvite={(round) => {
                // Always confirmed first (the wording says what will happen).
                // PANEL then asks whether to keep the roster or pick a new one.
                setSelectedRound(round);
                setRescheduleMode('reinvite');
                setRescheduleRound(round);
                setIsRescheduleConfirmOpen(true);
              }}
              onReschedule={(round) => {
                setSelectedRound(round);
                setRescheduleMode('reschedule');
                setRescheduleRound(round);
                setIsRescheduleConfirmOpen(true);
              }}
              canSkip={isJobInCharge}
              onSkip={() => setIsSkipOpen(true)}
              onReject={() => setStatusModal('reject')}
              onSubmitFeedback={(round, score) =>
                setScoreModalFor({
                  scoreId: score.id,
                  roundName: roundLabel(round),
                  currentScore: score.recruiter_score,
                  currentReason: score.recruiter_score_reason,
                })
              }
            />
          )}

          {activeTab === 'sms' && candidateId && (
            <CandidateMessageHistory
              candidateId={candidateId}
              smsBlockedReason={smsBlockedReason}
              onSendSms={() => setIsSmsOpen(true)}
            />
          )}
        </div>
      </div>

      <AssignJobModal
        open={isAssignJobOpen}
        onClose={() => setIsAssignJobOpen(false)}
        candidateId={candidateId ?? ''}
        candidateName={candidateDisplayName(candidate)}
        currentJobId={parsedJobId ?? ''}
      />
      {isSkipOpen && (
        // Same layout as the old app's skip popup (careerforcepro-web
        // InterviewRounds): one question as the title, a single Reason box,
        // SUBMIT and CANCEL side by side.
        <AntdCommonModal
          title="Please explain why you are skipping the interview"
          subtitle={
            currentRound
              ? `${roundLabel(currentRound)} · ${candidateDisplayName(candidate)}`
              : undefined
          }
          open
          onClose={() => {
            setIsSkipOpen(false);
            resetSkipForm();
          }}
          modalProps={{ width: 520 }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col justify-start">
              <label htmlFor="skip-round-reason" className="pb-2 text-sm font-medium">
                Reason <span className="required-asterisk">*</span>
              </label>
              <Textarea
                id="skip-round-reason"
                className="w-full rounded-3xl border border-gray-300 bg-white p-3 focus:ring focus:ring-blue-300"
                rows={4}
                maxLength={1000}
                value={skipReason}
                placeholder="Type your reason here....."
                onChange={(e) => {
                  setSkipReason(e.target.value);
                  setSkipReasonError(null);
                }}
              />
              {skipReasonError && <p className="mt-1 text-xs text-red-500">{skipReasonError}</p>}
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Button
                type="button"
                onClick={() => void handleSkipRound()}
                disabled={!skipReason.trim() || isSkipping}
                className="cursor-pointer rounded-full border bg-primary px-10 py-3 font-bold text-white disabled:opacity-50"
              >
                {isSkipping ? <Loader /> : <span>SUBMIT</span>}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsSkipOpen(false);
                  resetSkipForm();
                }}
                disabled={isSkipping}
                className="cursor-pointer rounded-full border border-gray-200 !bg-white px-7 py-3 font-bold"
              >
                <span>CANCEL</span>
              </Button>
            </div>
          </div>
        </AntdCommonModal>
      )}
      <ScoringCriteriaModal
        visible={!!scoringCriteriaFor}
        onClose={() => setScoringCriteriaFor(null)}
        title={
          scoringCriteriaFor?.kind === 'interview'
            ? 'INTERVIEW_SCORING'
            : scoringCriteriaFor?.kind === 'intake'
              ? 'INTAKE_CALL_SCORING'
              : 'Scoring Criteria'
        }
        subtitle={scoringCriteriaFor?.subtitle}
        footer={null}
        matchMetrics={scoringCriteriaFor?.kind === 'resume' ? resumeMatchMetrics : undefined}
        interviewRoundType={scoringCriteriaFor?.interviewRoundType}
        interviewWeights={
          scoringCriteriaFor?.kind === 'interview'
            ? (jobScoringConfig?.data?.interviewConfig?.weights ?? []).map((w) => ({
                label: w.displayName ?? formatSectionKey(w.categoryName),
                description: w.description,
                weight: w.weightPercentage,
              }))
            : undefined
        }
      />
      {isAdvanceOpen && candidate && (
        <AdvanceCandidateModal
          open
          onClose={() => setIsAdvanceOpen(false)}
          candidate={candidate}
          fromRound={currentRound}
          toRound={nextRound}
          feedbackRequirement={advanceFeedbackRequirement}
          canAutoInvite={canAutoInviteNextRound}
          panelInterviewerNames={nextRoundInterviewerNames}
          onSuccess={(newRound, inviteSent) => {
            setIsAdvanceOpen(false);
            // Locked until the refreshed round list moves `currentRound` on.
            setAdvancedFromRoundId(currentRound?.id ?? null);
            void refetchRounds();
            refetchCandidate();
            // Advancing into a panel round without inviting it: remind
            // the recruiter to pick the panel and invite. Shown once.
            if (newRound?.round_type === 'PANEL' && !inviteSent) setPanelPromptRound(newRound);
          }}
        />
      )}
      {panelPromptRound && (
        // Informational, never a gate: closing it any way (X, Escape, outside
        // click) is the same as Later. Shown once per advance.
        <AntdCommonModal
          title={`Next round: ${roundLabel(panelPromptRound)}`}
          open
          onClose={() => setPanelPromptRound(null)}
          modalProps={{ width: 480 }}
        >
          <div className="flex flex-col gap-5">
            <p className="text-center text-sm text-gray-700">
              Select the interviewers for this round, then click Invite. The candidate is emailed
              once every selected interviewer has connected their calendar.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setPanelPromptRound(null)}
                className="flex-1 rounded-full border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-600"
              >
                Later
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setInterviewersModalFor(panelPromptRound);
                  setPanelPromptRound(null);
                }}
                className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white"
              >
                Select Interviewers
              </Button>
            </div>
          </div>
        </AntdCommonModal>
      )}
      {statusModal && candidate && (
        <ChangeCandidateStatusModal
          open={!!statusModal}
          onClose={() => setStatusModal(null)}
          mode={statusModal}
          candidates={[candidate]}
          currentRound={currentRound}
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
        </>
      )}
      <CandidateRecruiterNotesPanel
        open={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        title={`Candidate Notes - ${candidateDisplayName(candidate)}`}
        candidateId={candidateId}
      />
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
          title={isReinviteMode ? 'Send Reinvite' : 'Request Reschedule'}
          subtitle={
            isReinviteMode
              ? `${REINVITE_COPY} Keep this round's current panel, or pick different interviewers for the new invite?`
              : `${rescheduleCopy(rescheduleRound)} Keep this round's current panel, or pick different interviewers for the new attempt?`
          }
          open
          onClose={closeRescheduleFlow}
          modalProps={{ width: 480 }}
        >
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              onClick={() => void handleRequestCallReschedule()}
              disabled={isRequestingReschedule}
              className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white disabled:opacity-50"
            >
              {isRequestingReschedule || isReinviting ? 'Sending…' : 'Keep The Same Interviewers'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setRescheduleInterviewerIds(rescheduleRound?.interviewer_ids ?? []);
                setRescheduleStep('picker');
              }}
              disabled={isRequestingReschedule}
              className="w-full rounded-full border border-primary-200 bg-primary-50 py-2.5 text-center text-sm font-semibold text-primary-700 disabled:opacity-50"
            >
              Choose Different Interviewers
            </Button>
          </div>
        </AntdCommonModal>
      )}
      {isInviteOpen && selectedRound && !selectedRound.interview_booking_id && (
        // Behind the round's invite icon. PANEL needs its roster picked
        // first (a PANEL booking with none would fall back to an untested
        // auto-compose path — see handleCreateBooking).
        <AntdCommonModal
          title="Send Interview Invite"
          subtitle={roundLabel(selectedRound)}
          open
          onClose={() => setIsInviteOpen(false)}
          modalProps={{ width: 560 }}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              The candidate gets a booking link to choose a time{' '}
              {isPanelRound
                ? 'from the panel’s connected calendar.'
                : isAiVideoRound(selectedRound)
                  ? 'from the available AI Video Interview slots.'
                  : isAudioScreeningRound(selectedRound) || isIntakeCallRound(selectedRound)
                    ? 'from the available AI Agent Call slots.'
                    : 'from the available slots.'}
            </p>
            {isPanelRound && (
              <PanelInterviewerPicker
                id="panel-interviewer-select"
                value={selectedInterviewerIds}
                onChange={setSelectedInterviewerIds}
                options={eligibleInterviewers ?? []}
                loading={isLoadingInterviewers}
                calendarConnectedById={interviewerCalendarConnectedById}
                helperText="Pick at least one panel interviewer to enable Send Invite."
              />
            )}
            {phoneIssueBlocksRoundInvite(candidate?.phone_number_issue, selectedRound) && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {PHONE_BLOCKED_INVITE_MESSAGE}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                disabled={isCreatingBooking || isSavingInterviewers || bookingsClosed}
                className="flex-1 rounded-full border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-600 disabled:opacity-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() =>
                  void handleCreateBooking().then((ok) => {
                    if (ok) setIsInviteOpen(false);
                  })
                }
                disabled={
                  isCreatingBooking ||
                  isSavingInterviewers ||
                  (isPanelRound && selectedInterviewerIds.length === 0) ||
                  phoneIssueBlocksRoundInvite(candidate?.phone_number_issue, selectedRound)
                }
                className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white disabled:opacity-50"
              >
                {isCreatingBooking || isSavingInterviewers ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </AntdCommonModal>
      )}
      {isRescheduleConfirmOpen && isRescheduleRoundPanel && rescheduleStep === 'picker' && (
        // Same picker UI as the initial Create Booking flow (colored by
        // calendar-connect status) — just feeding `request-reschedule`'s
        // `interviewer_ids` instead of `createBooking`'s.
        <AntdCommonModal
          title="Choose different interviewers"
          subtitle={
            isReinviteMode
              ? 'The new invite will go out with the roster picked below.'
              : 'This new attempt will be scheduled with the roster picked below.'
          }
          open
          onClose={closeRescheduleFlow}
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
              helperText={
                isReinviteMode
                  ? 'Pick at least one panel interviewer to send the reinvite.'
                  : 'Pick at least one panel interviewer to request the reschedule.'
              }
            />
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setRescheduleStep('choice')}
                disabled={isRequestingReschedule}
                className="flex-1 rounded-full border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-600 disabled:opacity-50"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => void handleRequestCallReschedule(rescheduleInterviewerIds)}
                disabled={isRequestingReschedule || rescheduleInterviewerIds.length === 0}
                className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white disabled:opacity-50"
              >
                {isRequestingReschedule || isReinviting
                  ? 'Sending…'
                  : isReinviteMode
                    ? 'Send Reinvite'
                    : 'Request Reschedule'}
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
            isReinviteMode
              ? REINVITE_COPY
              : // Resume-consistency scoring is Intake Call (AUDIO) specific -
                // Audio Screening/AI Video rounds don't have one, so this
                // clause would be misleading there. Driven by `rescheduleRound`,
                // not `selectedRound` - this modal can open straight from a
                // round other than the one currently selected.
                rescheduleRound &&
                  isIntakeCallRound(rescheduleRound) &&
                  candidate?.consistency_score != null
                ? `${rescheduleCopy(rescheduleRound)} Once they complete the new call, the resume-consistency score will be recalculated from it and will overwrite the current score (${candidate.consistency_score} / ${AI_SCORE_MAX}).`
                : rescheduleRound && isIntakeCallRound(rescheduleRound)
                  ? `${rescheduleCopy(rescheduleRound)} Once they complete the new call, a resume-consistency score will be calculated from it.`
                  : rescheduleCopy(rescheduleRound)
          }
          confirmText={isReinviteMode ? 'Send Reinvite' : 'Request Reschedule'}
          cancelText="Cancel"
          isLoading={isRequestingReschedule}
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
          jobId={parsedJobId || undefined}
          // Same conditions as the scheduling tab's Invite button: the round
          // is due now and hasn't been invited or booked yet.
          canSendInvite={
            !isTerminal &&
            !bookingsClosed &&
            currentRound?.id === interviewersModalFor.id &&
            normaliseRoundStatus(interviewersModalFor.status) === 'to_be_scheduled' &&
            !interviewersModalFor.invite_sent_at &&
            !interviewersModalFor.interview_booking_id
          }
          onSendInvite={sendInviteFromPanelPicker}
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

// Keyed on the candidate so Previous / Next starts each candidate fresh
// (tab, drafts, open modals) instead of carrying the last one's local state.
const CandidateDetailsPage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  return <CandidateDetails key={candidateId} />;
};

export default CandidateDetailsPage;
