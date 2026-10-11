import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useJobDetailsHeaderSlot } from '../../../layouts/jobDetailsHeaderSlot';
import { Tooltip } from 'antd';
import { MdClose, MdInfoOutline, MdOutlineQuestionAnswer } from 'react-icons/md';
import { useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../redux/provider/store';
import { stopStream } from '../../../redux/slices/streamSlice';
import { setIsDraft } from '../../../redux/slices/editJobOpeningSlice';
import { Loader } from '../../shared/ui/loader';
import { showToast, Typography } from '../../shared';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { useNavigationBlocker } from '../../../hooks/useNavigationBlocker';
import JobIntakeQuestionsSection from './JobIntakeQuestionsSection';
import {
  useGetJobIntakeQuestionsQuery,
  useImportJobIntakeQuestionsMutation,
  useGetJobQuestionsQuery,
  useSaveJobQuestionsMutation,
  useGenerateJobQuestionsMutation,
  useRegenerateJobQuestionsMutation,
  useBulkImportJobQuestionsMutation,
  useGetQuestionImportFormatsQuery,
  useGetQuestionImportsQuery,
  useLazyGetQuestionImportTemplateQuery,
  jobQuestionsApi,
} from '../../../api/job-service/JobOpening/jobQuestions';
import { useListInterviewRoundTypesQuery } from '../../../api/job-service/JobOpening/catalogs';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import { useGetJobScoringConfigQuery } from '../../../api/job-service/JobOpening/jobScoringConfig';
import {
  useLazyValidateForPublishQuery,
  usePublishJobMutation,
} from '../../../api/job-service/JobOpening/CloseJob';
import { useDeleteDraftJobMutation } from '../../../api/job-service/JobOpening/AddJobOpening';
import {
  jobOpeningByIdApi,
  useGetJobOpeningByIdQuery,
} from '../../../api/job-service/JobOpening/GetJobOpeningById';
import type { QuestionRequest, QuestionResponse } from '../../../api/job-service/types';
import { asJobId } from '../../../api/job-service/jobId';
import { Authorities } from '../../../constants/authorities.constant';
import useEffectivePermissions from '../../../hooks/useEffectivePermissions';
import { isAssignedToJob } from '../../../shared/utils/auth/getAccess';
import {
  getJobErrorCode,
  getJobErrorDetails,
  getJobErrorMessage,
} from '../../../shared/utils/auth/jobError.helpers';

import { type ImportWarningItem } from './UploadAndGenerateHeader';
import QuestionEntryPanel from './QuestionEntryPanel';
import QuestionList from './QuestionList';
import { isRepeat, splitRepeats } from './questionRepeats';
import { GenerateQuestionsConsentModal } from './GenerateQuestionsConsentModal';
import { useIsEditingDraft } from '../../../hooks/useIsEditingDraft';
import AiQuestionsActionFooter from './AiQuestionsActionFooter';

const DEFAULT_QUESTION_COUNT = 10;
const GENERATION_POLL_INTERVAL_MS = 1000;
const GENERATION_POLL_TIMEOUT_MS = 90_000;

// Human-readable text for each publish-readiness failure code.
const PUBLISH_CHECK_LABELS: Record<string, string> = {
  jd_missing: 'Job Description is missing',
  mandatory_fields_incomplete:
    'Some required Job Details fields are missing - check Job Title, Department, Job Type, Open Date, Vacancies, Minimum Experience, Salary Range, and Hiring Manager',
  no_education_preference: 'Education preference is not set',
  no_location: 'At least one job location is required',
  no_skill: 'At least one skill is required',
  no_mandatory_skill: 'At least one skill must be marked Required, not just Optional',
  no_round: 'At least one interview round is required',
  no_question: 'At least one question is required',
  no_intake_question: 'Add Intake Call questions, or remove the Intake Call round',
};

const describeFailedChecks = (checks: string[], roundsMissingQuestions: string[] = []): string =>
  checks
    .map((check) => {
      if (check === 'no_question' && roundsMissingQuestions.length > 0) {
        return `These interview round(s) need at least one question: ${roundsMissingQuestions.join(', ')}`;
      }
      return PUBLISH_CHECK_LABELS[check] ?? check;
    })
    .join('; ');

/** Applies the same per-check translation to a publish-call error, not
 * just the pre-check. Falls back to the backend's own message otherwise. */
const describePublishError = (err: unknown, fallback: string): string => {
  if (getJobErrorCode(err) === 'PUBLISH_VALIDATION_FAILED') {
    const details = getJobErrorDetails(err);
    const failedChecks = (details?.failed_checks as string[] | undefined) ?? [];
    const roundsMissingQuestions =
      (details?.rounds_missing_questions as string[] | undefined) ?? [];
    if (failedChecks.length > 0) {
      return `Cannot publish yet: ${describeFailedChecks(failedChecks, roundsMissingQuestions)}`;
    }
  }
  return getJobErrorMessage(err, fallback);
};

const getRoundIdsMissingQuestions = (err: unknown): string[] =>
  getJobErrorCode(err) === 'PUBLISH_VALIDATION_FAILED'
    ? ((getJobErrorDetails(err)?.round_ids_missing_questions as string[] | undefined) ?? [])
    : [];

/** Friendlier copy for NO_ELIGIBLE_INTERVIEW_ROUNDS than the backend's own wording. */
const describeGenerateQuestionsError = (err: unknown, fallback: string): string => {
  if (getJobErrorCode(err) === 'NO_ELIGIBLE_INTERVIEW_ROUNDS') {
    return 'Add an AI Agent Call, AI Video Interview, Live Video Interview or In-Person Interview round to the Interview Sequence before generating questions.';
  }
  return getJobErrorMessage(err, fallback);
};

const joinWithAnd = (items: string[]): string =>
  items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

type RoundNavItemProps = {
  label: string;
  subtitle?: string;
  count: number;
  active: boolean;
  onClick: () => void;
};

const RoundNavItem = ({ label, subtitle, count, active, onClick }: RoundNavItemProps) => {
  const isEmpty = count === 0;
  const buttonClass = active
    ? 'border-primary bg-primary-50 text-primary-700'
    : isEmpty
      ? 'border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-50'
      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
  const badgeClass = active
    ? 'bg-primary text-white'
    : isEmpty
      ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
      : 'bg-primary text-white';
  return (
    <Tooltip title={subtitle}>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'true' : undefined}
        className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold leading-none transition-colors cursor-pointer ${buttonClass}`}
      >
        {label}
        <span
          title={count > 0 ? `${count} question(s)` : 'No questions yet - add at least one.'}
          className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${badgeClass}`}
        >
          {count}
        </span>
      </button>
    </Tooltip>
  );
};

const AiQuestionsSetup = () => {
  const headerSlot = useJobDetailsHeaderSlot();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { pathname } = useLocation();
  const { id } = useParams<{ id?: string }>();
  const reduxJobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  // Fallback source for the job id in edit mode, tried after reduxJobOpeningId below.
  const editJobOpeningId = useSelector((state: RootState) => state.EditJobSlice.jobOpeningId);
  const { role, userId } = useSelector((state: RootState) => state.LoginSlice);

  // Publish shares the backend's job:approve permission with "close" (see
  // Authorities.JOB_OPENING_CLOSE) — no dedicated publish authority exists.
  const effectivePermissions = useEffectivePermissions();
  const canPublish = effectivePermissions.includes(Authorities.JOB_OPENING_CLOSE);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isDeleteInProgress, setIsDeleteInProgress] = useState(false);
  // Per-round selection map so selections persist when switching tabs.
  const [selectedIdsByRound, setSelectedIdsByRound] = useState<Record<string, string[]>>({});
  // Per-round search query so each tab remembers its own search independently.
  const [searchByRound, setSearchByRound] = useState<Record<string, string>>({});

  const [inlineInputText, setInlineInputText] = useState('');
  const [isInlineSubmitting, setIsInlineSubmitting] = useState(false);
  // Which round's questions are currently shown/added to.
  const [selectedRoundInstanceId, setSelectedRoundInstanceId] = useState<string | null>(null);
  // Local draft edits (questionId → text) — flushed to API on Save & Next / Publish.
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});
  const [isSavingEdits, setIsSavingEdits] = useState(false);

  const [importWarnings, setImportWarnings] = useState<ImportWarningItem[]>([]);
  const [failedRowCount, setFailedRowCount] = useState<number>(0);
  const [duplicateRowCount, setDuplicateRowCount] = useState<number>(0);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const [showGenerateConsentModal, setShowGenerateConsentModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Slot beside the round chips where the add-questions buttons render.
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);
  // Rounds (by id) the backend last reported as having no questions.
  const [blockedRoundIds, setBlockedRoundIds] = useState<string[]>([]);
  const [intakeUnsaved, setIntakeUnsaved] = useState(false);
  const [deleteDraftJob, { isLoading: isCancelling }] = useDeleteDraftJobMutation();

  // Priority: URL param, then create-mode JobSlice, then EditJobSlice.
  const activeJobOpeningId = useMemo(
    () => asJobId(id) || asJobId(reduxJobOpeningId) || asJobId(editJobOpeningId),
    [id, reduxJobOpeningId, editJobOpeningId]
  );

  // True while the job hasn't loaded yet, so this never hides Publish early.
  const { data: activeJobOpening } = useGetJobOpeningByIdQuery(
    { jobOpeningId: activeJobOpeningId ?? '' },
    { skip: !activeJobOpeningId }
  );
  const isAssignedToThisJob = !activeJobOpening
    ? true
    : isAssignedToJob(
        {
          hiringManagerIds: activeJobOpening.details?.hiring_manager_ids,
          recruiterIds: activeJobOpening.details?.recruiter_ids,
          createdById: activeJobOpening.details?.created_by,
        },
        userId,
        role,
        effectivePermissions
      );

  // Editing an already-published job skips publish and just saves; editing
  // an unpublished draft still goes through validate-then-publish below.
  const isEditRoute = pathname.includes('/edit/') && Boolean(id);
  const isEditingAlreadyPublishedJob =
    useIsEditingDraft(isEditRoute ? activeJobOpeningId : null) === false;

  const { data: roundTypes = [] } = useListInterviewRoundTypesQuery();
  // Rounds without a recruiter-set duration never take Q&A questions.
  const audioRoundTypeIds = useMemo(
    () =>
      new Set(roundTypes.filter((item) => !item.requires_duration).map((item) => item.round_id)),
    [roundTypes]
  );

  // True while waiting for the polled question list to change after generation.
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const questionSnapshotBeforeGenerateRef = useRef<string | null>(null);
  // Round the in-flight generation targeted - auto-opens its section once done.
  const roundBeingGeneratedForRef = useRef<string | null>(null);
  // For the completion toast: what the round held before, and whether this was an append.
  const roundCountBeforeGenerateRef = useRef(0);
  const generationModeRef = useRef<'ADD' | 'REPLACE'>('REPLACE');
  // Tracks which rounds have had their is_selected state initialized from the backend.
  const initializedRoundsRef = useRef<Set<string>>(new Set());
  // Debounce timer for persisting selection changes without hammering the API on rapid ticks.
  const selectionPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search value — drives the server-side search query 300 ms after the last keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Base query (no search) — used for generation polling, round counts, and as the save payload.
  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
    refetch: refetchQuestions,
  } = useGetJobQuestionsQuery(
    { jobOpeningId: activeJobOpeningId ?? '' },
    {
      skip: !activeJobOpeningId,
      pollingInterval: isGeneratingQuestions ? GENERATION_POLL_INTERVAL_MS : 0,
    }
  );

  const [saveJobQuestions] = useSaveJobQuestionsMutation();
  const [generateJobQuestions, { isLoading: isGenerateRequestPending }] =
    useGenerateJobQuestionsMutation();
  const [regenerateJobQuestions] = useRegenerateJobQuestionsMutation();
  const [bulkImportJobQuestions, { isLoading: isUploadingExcel }] =
    useBulkImportJobQuestionsMutation();
  const [fetchImportTemplate] = useLazyGetQuestionImportTemplateQuery();
  const [validateForPublish] = useLazyValidateForPublishQuery();
  const [publishJob, { isLoading: isPublishing }] = usePublishJobMutation();
  // Covers both the initial request and the polling wait after it.
  const isGenerating = isGenerateRequestPending || isGeneratingQuestions;

  // Unfiltered rounds — the source for the full save/add/delete payload.
  const allRounds = useMemo(() => questionsData?.rounds ?? [], [questionsData]);
  const jdRounds = useMemo(
    () => allRounds.filter((round) => !audioRoundTypeIds.has(round.round_id)),
    [allRounds, audioRoundTypeIds]
  );
  const noEligibleRound = !isLoadingQuestions && jdRounds.length === 0;

  // Every round's questions, not just the picker-eligible ones.
  const questions = useMemo(() => allRounds.flatMap((round) => round.questions ?? []), [allRounds]);
  const defaultRoundInstanceId = jdRounds[0]?.round_instance_id ?? null;
  // Falls back to the first round if the picked one no longer exists.
  const activeRoundInstanceId =
    (selectedRoundInstanceId &&
      jdRounds.some((round) => round.round_instance_id === selectedRoundInstanceId) &&
      selectedRoundInstanceId) ||
    defaultRoundInstanceId;

  // Derived: selected ids for the active round (persists across tab switches).
  // Must be keyed on activeRoundInstanceId (not selectedRoundInstanceId) so that
  // the initial render — before the user has clicked any tab — still reads from the
  // correct round instead of from the empty-string key.
  const selectedIds = selectedIdsByRound[activeRoundInstanceId ?? ''] ?? [];
  const setSelectedIds = (ids: string[]) => {
    if (!activeRoundInstanceId) return;
    setSelectedIdsByRound((prev) => ({ ...prev, [activeRoundInstanceId]: ids }));
  };

  // Derived: search query for the active round (persists across tab switches).
  const activeSearch = searchByRound[activeRoundInstanceId ?? ''] ?? '';
  const handleSearchChange = (value: string) => {
    if (!activeRoundInstanceId) return;
    setSearchByRound((prev) => ({ ...prev, [activeRoundInstanceId]: value }));
  };

  // Debounce: update debouncedSearch 300 ms after the user stops typing.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(activeSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [activeSearch]);

  // Filtered search query — only active while the user has typed a search term.
  const { data: searchData, isFetching: isSearchFetching } = useGetJobQuestionsQuery(
    {
      jobOpeningId: activeJobOpeningId ?? '',
      interview_round_id: activeRoundInstanceId,
      search: debouncedSearch,
    },
    { skip: !activeJobOpeningId || !activeRoundInstanceId || !debouncedSearch }
  );

  // The file types the upload accepts, from the backend (consumed by UploadAndGenerateHeader).
  useGetQuestionImportFormatsQuery();
  // Files bulk-imported into this round, newest first.
  const { data: questionImports } = useGetQuestionImportsQuery(
    { jobOpeningId: activeJobOpeningId ?? '', interviewRoundId: activeRoundInstanceId },
    { skip: !activeJobOpeningId || !activeRoundInstanceId }
  );
  const uploadedFiles = useMemo(
    () =>
      (questionImports?.imports ?? []).map((file) => ({
        id: file.id,
        fileName: file.file_name,
        uploadedAt: file.uploaded_at,
        imported: file.imported_count,
        failed: file.failed_count,
        duplicates: file.duplicate_count,
      })),
    [questionImports]
  );
  // When a search is active, show the server-filtered results; otherwise use base data.
  // Sort by question_order so the display always matches what the backend persisted.
  const visibleQuestions = useMemo(() => {
    if (debouncedSearch && searchData) {
      return (searchData.rounds ?? [])
        .flatMap((r) => r.questions ?? [])
        .sort((a, b) => a.question_order - b.question_order);
    }
    return questions
      .filter((q) => q.interview_round_id === activeRoundInstanceId)
      .sort((a, b) => a.question_order - b.question_order);
  }, [debouncedSearch, searchData, questions, activeRoundInstanceId]);
  const questionListRef = useRef<HTMLDivElement>(null);
  const scrollToTopAfterAddRef = useRef(false);
  // Content fingerprint rather than a count, since REPLACE can reduce the count.
  const questionsSnapshotKey = useMemo(() => questions.map((q) => q.id).join(','), [questions]);

  // Accordion: one section open at a time. '__default__' defers to the
  // active round; '' means every section is explicitly collapsed.
  const [openSectionKey, setOpenSectionKey] = useState<string>('__default__');
  const effectiveOpenKey =
    openSectionKey === '__default__' ? (activeRoundInstanceId ?? '') : openSectionKey;

  // A human-led round: Live Video or In-Person.
  const activeRoundTypeId = jdRounds.find(
    (round) => round.round_instance_id === activeRoundInstanceId
  )?.round_id;
  const isHiringPanelActiveRound = useMemo(() => {
    const kind = roundTypes.find((rt) => rt.round_id === activeRoundTypeId)?.special_kind;
    return kind === 'live_video' || kind === 'in_person';
  }, [roundTypes, activeRoundTypeId]);
  const { data: scoringData } = useGetJobScoringConfigQuery(activeJobOpeningId, {
    skip: !activeJobOpeningId,
  });
  const scoringSectionOptions = useMemo(
    () =>
      isHiringPanelActiveRound
        ? (scoringData?.data?.interviewConfig?.weights ?? [])
            .filter((w) => w.appliesPanel)
            .map((w) => ({
              code: w.categoryName,
              label: w.displayName ?? w.categoryName,
            }))
        : [],
    [isHiringPanelActiveRound, scoringData]
  );
  // A batch rejected by the content check: stop waiting and show why.
  const generationError = questionsData?.generation_error;
  useEffect(() => {
    if (!isGeneratingQuestions || !generationError) return;
    setIsGeneratingQuestions(false);
    roundBeingGeneratedForRef.current = null;
    showToast({ message: generationError, type: 'error' });
  }, [isGeneratingQuestions, generationError]);

  const generationNotice = questionsData?.generation_notice;

  // "10 questions added" for an append, "18 questions generated" for a replace.
  const generatedToastMessage = (roundQuestionCount: number) => {
    const isAppend = generationModeRef.current === 'ADD';
    const count = isAppend
      ? roundQuestionCount - roundCountBeforeGenerateRef.current
      : roundQuestionCount;
    if (count <= 0) return 'Questions generated';
    return `${count} question${count === 1 ? '' : 's'} ${isAppend ? 'added' : 'generated'}`;
  };

  // Freshly generated questions start ticked: every question in the round
  // that wasn't there before generating (all of them after a replace, just
  // the new ones after an add).
  const selectGeneratedQuestions = (
    latest: { id: string; interview_round_id?: string | null }[],
    roundId: string | null
  ) => {
    scrollToTopAfterAddRef.current = true;
    const before = new Set((questionSnapshotBeforeGenerateRef.current ?? '').split(','));
    const newIds = latest
      .filter((q) => (roundId ? q.interview_round_id === roundId : true) && !before.has(q.id))
      .map((q) => q.id);
    const isAdd = generationModeRef.current === 'ADD';
    if (roundId) {
      setSelectedIdsByRound((prev) => ({
        ...prev,
        [roundId]: isAdd ? [...new Set([...(prev[roundId] ?? []), ...newIds])] : newIds,
      }));
    } else if (selectedRoundInstanceId) {
      setSelectedIdsByRound((prev) => ({
        ...prev,
        [selectedRoundInstanceId]: isAdd
          ? [...new Set([...(prev[selectedRoundInstanceId] ?? []), ...newIds])]
          : newIds,
      }));
    }
  };

  // Stop polling once the list differs from its pre-generation snapshot.
  useEffect(() => {
    if (!isGeneratingQuestions) return;
    if (questionSnapshotBeforeGenerateRef.current === null) return;
    if (questionsSnapshotKey === questionSnapshotBeforeGenerateRef.current) return;
    setIsGeneratingQuestions(false);
    const generatedRoundId = roundBeingGeneratedForRef.current;
    selectGeneratedQuestions(questions, generatedRoundId);
    // Fewer than requested: say so, instead of a plain success count.
    if (generationNotice) {
      showToast({ message: generationNotice, type: 'info' });
    } else {
      showToast({
        message: generatedToastMessage(
          generatedRoundId
            ? questions.filter((q) => q.interview_round_id === generatedRoundId).length
            : questions.length
        ),
        type: 'success',
      });
    }
    if (generatedRoundId) {
      setOpenSectionKey(generatedRoundId);
      roundBeingGeneratedForRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGeneratingQuestions, questionsSnapshotKey]);

  // New questions are added at the top, so show the top, not wherever the list was.
  useEffect(() => {
    if (!scrollToTopAfterAddRef.current) return;
    scrollToTopAfterAddRef.current = false;
    questionListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [visibleQuestions]);

  // Safety net so polling doesn't run forever. Does one last refetch before
  // giving up, in case generation finished right around the timeout.
  useEffect(() => {
    if (!isGeneratingQuestions) return;
    const timeoutId = setTimeout(async () => {
      const result = await refetchQuestions();
      const latestQuestions = (result.data?.rounds ?? []).flatMap((round) => round.questions ?? []);
      const latestKey = latestQuestions.map((q) => q.id).join(',');
      if (latestKey !== questionSnapshotBeforeGenerateRef.current) {
        setIsGeneratingQuestions(false);
        selectGeneratedQuestions(latestQuestions, roundBeingGeneratedForRef.current);
        questionListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        showToast({ message: 'Questions generated', type: 'success' });
        if (roundBeingGeneratedForRef.current) {
          setOpenSectionKey(roundBeingGeneratedForRef.current);
          roundBeingGeneratedForRef.current = null;
        }
        return;
      }
      setIsGeneratingQuestions(false);
      showToast({
        message: "Still generating - refresh in a moment if the questions don't appear shortly.",
        type: 'warning',
      });
    }, GENERATION_POLL_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [isGeneratingQuestions, refetchQuestions]);

  // Initialize each round's selection state from the backend is_selected field, once per round.
  // Subsequent local changes are tracked in selectedIdsByRound without overwriting.
  useEffect(() => {
    if (!questionsData) return;
    const toInit: Record<string, string[]> = {};
    let hasNew = false;
    questionsData.rounds.forEach((round) => {
      if (!initializedRoundsRef.current.has(round.round_instance_id)) {
        toInit[round.round_instance_id] = (round.questions ?? [])
          .filter((q) => q.is_selected)
          .map((q) => q.id);
        initializedRoundsRef.current.add(round.round_instance_id);
        hasNew = true;
      }
    });
    if (hasNew) {
      setSelectedIdsByRound((prev) => ({ ...prev, ...toInit }));
    }
  }, [questionsData]);

  const toQuestionRequest = (question: QuestionResponse): QuestionRequest => ({
    id: question.id,
    question_text: question.question_text,
    answer_text: question.answer_text,
    interview_round_id: question.interview_round_id,
    scoring_sections: question.scoring_sections,
    is_selected: (selectedIdsByRound[question.interview_round_id ?? ''] ?? []).includes(
      question.id
    ),
  });

  // Shared save path for add/edit/delete/reorder — sends the job's whole updated list.
  // question_order is set to the 1-based position in `next` so the backend persists the order.
  // Writes the PUT's response into the cache directly so the update lands even if the
  // follow-up refetch doesn't land in time.
  const persistQuestions = async (next: QuestionRequest[]) => {
    if (!activeJobOpeningId) return null;
    const withOrder = next.map((q, i) => ({ ...q, question_order: i }));
    const res = await saveJobQuestions({
      jobOpeningId: activeJobOpeningId,
      questions: withOrder,
    }).unwrap();
    dispatch(
      jobQuestionsApi.util.upsertQueryData(
        'getJobQuestions',
        { jobOpeningId: activeJobOpeningId },
        res
      )
    );
    await refetchQuestions();
    return res;
  };

  // User-triggered selection change: updates local state immediately and
  // debounces a PUT so is_selected persists across page reloads.
  const handleSelectionChange = (ids: string[]) => {
    if (!activeRoundInstanceId) return;
    setSelectedIdsByRound((prev) => ({ ...prev, [activeRoundInstanceId]: ids }));

    if (selectionPersistTimerRef.current) clearTimeout(selectionPersistTimerRef.current);
    // Capture round, ids, and current state in the closure so the timer uses the correct values.
    const roundId = activeRoundInstanceId;
    const snapshot = { questions, selectedIdsByRound };
    selectionPersistTimerRef.current = setTimeout(async () => {
      if (!activeJobOpeningId) return;
      try {
        const next: QuestionRequest[] = snapshot.questions.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          answer_text: q.answer_text,
          interview_round_id: q.interview_round_id,
          scoring_sections: q.scoring_sections,
          is_selected:
            q.interview_round_id === roundId
              ? ids.includes(q.id)
              : (snapshot.selectedIdsByRound[q.interview_round_id ?? ''] ?? []).includes(q.id),
        }));
        await persistQuestions(next);
      } catch {
        // Silent — local state already reflects the user's intent.
      }
    }, 400);
  };

  const handleGenerateDefaultQuestions = async (
    mode: 'ADD' | 'REPLACE',
    questionCount: number = DEFAULT_QUESTION_COUNT,
    categoryCodes: string[] | null = null
  ) => {
    if (!activeJobOpeningId) {
      showToast({ message: 'Missing Job ID', type: 'error' });
      return;
    }
    try {
      // Snapshot the current list so the polling effect can detect a change.
      questionSnapshotBeforeGenerateRef.current = questionsSnapshotKey;
      roundBeingGeneratedForRef.current = activeRoundInstanceId;
      generationModeRef.current = mode;
      roundCountBeforeGenerateRef.current = visibleQuestions.length;
      if (mode === 'REPLACE') {
        await regenerateJobQuestions({
          jobOpeningId: activeJobOpeningId,
          question_count: questionCount,
          interview_round_id: activeRoundInstanceId,
          category_codes: categoryCodes,
        }).unwrap();
      } else {
        await generateJobQuestions({
          jobOpeningId: activeJobOpeningId,
          question_count: questionCount,
          interview_round_id: activeRoundInstanceId,
          category_codes: categoryCodes,
        }).unwrap();
      }
      showToast({ message: 'Question generation started', type: 'success' });
      setIsGeneratingQuestions(true);
      refetchQuestions();
      setShowGenerateConsentModal(false);
    } catch (err) {
      showToast({
        message: describeGenerateQuestionsError(err, 'Error generating questions'),
        type: 'error',
      });
    }
  };

  const handleDownloadTemplate = async () => {
    if (isDownloadingTemplate) return;
    setIsDownloadingTemplate(true);
    try {
      const result = await fetchImportTemplate().unwrap();
      const a = document.createElement('a');
      a.href = result.download_url;
      a.download = '';
      a.click();
    } catch {
      showToast({ message: 'Failed to download template', type: 'error' });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeJobOpeningId) return;
    try {
      const existingIds = new Set(questions.map((q) => q.id));
      const res = await bulkImportJobQuestions({
        jobOpeningId: activeJobOpeningId,
        file,
        interview_round_id: activeRoundInstanceId,
      }).unwrap();
      setUploadedFileName(file.name);
      setImportedCount(res.imported_count || 0);
      setFailedRowCount(res.failed_rows?.length || 0);
      setDuplicateRowCount(res.skipped_duplicate_rows?.length || 0);
      setImportWarnings([
        ...(res.failed_rows ?? []).map(
          (row): ImportWarningItem => ({
            type: 'error',
            row: row.row_number,
            // Backend wording, shown as it comes.
            reason: row.error,
            questionText: row.question_text,
          })
        ),
        ...(res.skipped_duplicate_rows ?? []).map(
          (row): ImportWarningItem => ({
            type: 'duplicate',
            row: row.row_number,
            reason:
              row.duplicate_of === 'file' && row.first_row_number != null
                ? `Same question as row ${row.first_row_number} in this file`
                : 'Already in this round',
            questionText: row.question_text,
          })
        ),
      ]);
      // No same-shape response to upsert here (unlike persistQuestions
      // above) - wait for the real refetch before returning.
      scrollToTopAfterAddRef.current = (res.imported_count ?? 0) > 0;
      const refetchResult = await refetchQuestions();
      if ((res.imported_count ?? 0) > 0 && activeRoundInstanceId && refetchResult.data) {
        const newIds = (refetchResult.data.rounds ?? [])
          .flatMap((r) => r.questions ?? [])
          .filter((q) => q.interview_round_id === activeRoundInstanceId && !existingIds.has(q.id))
          .map((q) => q.id);
        if (newIds.length > 0) {
          setSelectedIdsByRound((prev) => ({
            ...prev,
            [activeRoundInstanceId]: [
              ...new Set([...(prev[activeRoundInstanceId] ?? []), ...newIds]),
            ],
          }));
        }
      }
      const skipped = (res.failed_rows?.length ?? 0) + (res.skipped_duplicate_rows?.length ?? 0);
      if ((res.imported_count ?? 0) === 0) {
        showToast({
          message: 'No questions were imported. See the details below.',
          type: 'warning',
        });
      } else if (skipped > 0) {
        showToast({
          message: `${res.imported_count} imported, ${skipped} skipped. See the details below.`,
          type: 'warning',
        });
      } else {
        showToast({ message: 'Questions uploaded successfully.', type: 'success' });
      }
    } catch (err) {
      showToast({
        message: describeGenerateQuestionsError(err, 'Error uploading file'),
        type: 'error',
      });
    }
    e.target.value = '';
  };

  const handleInlineSubmit = async () => {
    const trimmedInput = inlineInputText.trim();
    // Avoid submitting before existing questions have loaded.
    if (
      !trimmedInput ||
      !activeJobOpeningId ||
      !activeRoundInstanceId ||
      isLoadingQuestions ||
      !questionsData
    ) {
      return;
    }
    setIsInlineSubmitting(true);
    try {
      const lines = trimmedInput
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      // A repeat is judged within this round only.
      const { fresh, repeats } = splitRepeats(
        lines,
        visibleQuestions.map((q) => q.question_text)
      );
      if (fresh.length === 0) {
        showToast({
          message:
            repeats.length === 1
              ? 'This question is already in this round.'
              : 'These questions are already in this round.',
          type: 'error',
        });
        setIsInlineSubmitting(false);
        return;
      }
      const next: QuestionRequest[] = [
        ...questions.map(toQuestionRequest),
        ...fresh.map((question_text) => ({
          question_text,
          interview_round_id: activeRoundInstanceId,
          is_selected: true,
        })),
      ];
      const existingIds = new Set(questions.map((q) => q.id));
      scrollToTopAfterAddRef.current = true;
      const saved = await persistQuestions(next);
      if (saved) {
        const newIds = (saved.rounds ?? [])
          .flatMap((r) => r.questions ?? [])
          .filter((q) => q.interview_round_id === activeRoundInstanceId && !existingIds.has(q.id))
          .map((q) => q.id);
        if (newIds.length > 0) {
          setSelectedIdsByRound((prev) => ({
            ...prev,
            [activeRoundInstanceId]: [
              ...new Set([...(prev[activeRoundInstanceId] ?? []), ...newIds]),
            ],
          }));
        }
      }
      showToast(
        repeats.length > 0
          ? {
              message: `${fresh.length} added, ${repeats.length} skipped - already in this round.`,
              type: 'warning',
            }
          : { message: 'Questions added successfully', type: 'success' }
      );
      setInlineInputText('');
    } catch (err) {
      scrollToTopAfterAddRef.current = false;
      showToast({
        message: describeGenerateQuestionsError(err, 'Error saving questions'),
        type: 'error',
      });
    }
    setIsInlineSubmitting(false);
  };

  const confirmDelete = () => {
    if (isDeleteInProgress || !activeJobOpeningId) return;
    setIsDeleteInProgress(true);
    // A row's own trash icon deletes just that row, even while other rows are
    // ticked (it used to delete every ticked row instead); the header button
    // deletes the ticked rows.
    const idsToRemove = new Set(selectedQuestionId ? [selectedQuestionId] : selectedIds);
    const remaining = questions.filter((q) => !idsToRemove.has(q.id)).map(toQuestionRequest);

    persistQuestions(remaining)
      .then(() => {
        showToast({ message: 'Deleted successfully', type: 'success' });
        setSelectedIds(selectedIds.filter((id) => !idsToRemove.has(id)));
      })
      .catch((err) =>
        showToast({
          message: getJobErrorMessage(err, 'Error deleting'),
          type: 'error',
        })
      )
      .finally(() => {
        setIsDeleteInProgress(false);
        setShowDeleteModal(false);
        setSelectedQuestionId(null);
      });
  };

  /** Save a question edit to local draft only — no API call. */
  const handleLocalEdit = (question: QuestionResponse, newText: string) => {
    const normalizedText = newText.trim();
    if (!normalizedText) return;
    // Duplicate check against the current visible questions (with existing local edits merged).
    const otherTexts = visibleQuestions
      .filter((q) => q.id !== question.id)
      .map((q) => localEdits[q.id] ?? q.question_text);
    if (isRepeat(normalizedText, otherTexts)) {
      showToast({ message: 'This question is already in this round.', type: 'error' });
      return;
    }
    setLocalEdits((prev) => ({ ...prev, [question.id]: normalizedText }));
  };

  /** Merge all local draft edits into the saved questions list via API. */
  const flushLocalEdits = async (): Promise<boolean> => {
    if (Object.keys(localEdits).length === 0) return true;
    setIsSavingEdits(true);
    try {
      const merged = questions.map((q) =>
        localEdits[q.id]
          ? { ...toQuestionRequest(q), question_text: localEdits[q.id] }
          : toQuestionRequest(q)
      );
      await persistQuestions(merged);
      setLocalEdits({});
      return true;
    } catch (err) {
      showToast({ message: getJobErrorMessage(err, 'Error saving edits'), type: 'error' });
      return false;
    } finally {
      setIsSavingEdits(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (activeJobOpeningId) {
      try {
        await deleteDraftJob(activeJobOpeningId).unwrap();
      } catch (error) {
        showToast({
          message: getJobErrorMessage(error, 'Failed to remove job opening'),
          type: 'error',
        });
        setShowCancelConfirm(false);
        return;
      }
    }
    setShowCancelConfirm(false);
    navigate('/jobs');
  };

  // Intentional "leave as draft" exit, same as every other step.
  const handleSaveDraft = () => {
    showToast({ message: 'Job saved as draft successfully', type: 'success' });
    navigate('/jobs');
  };

  const handlePublishOrFinish = async () => {
    const saved = await flushLocalEdits();
    if (!saved) return;
    dispatch(stopStream());
    if (isEditingAlreadyPublishedJob) {
      // Edits save as they're made; this only checks no round was left empty.
      try {
        const validation = await validateForPublish(activeJobOpeningId).unwrap();
        const emptyRounds = validation.rounds_missing_questions ?? [];
        const questionChecks = (validation.failed_checks ?? []).filter(
          (check) => check === 'no_question' || check === 'no_intake_question'
        );
        if (questionChecks.length > 0) {
          setBlockedRoundIds(validation.round_ids_missing_questions ?? []);
          showToast({
            message: describeFailedChecks(questionChecks, emptyRounds),
            type: 'error',
          });
          return;
        }
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Could not verify the questions - try again.'),
          type: 'error',
        });
        return;
      }
      showToast({ message: 'Job updated successfully', type: 'success' });
      navigate('/jobs');
      return;
    }
    if (!activeJobOpeningId) {
      // Surface this rather than silently no-op'ing if the job id isn't resolved yet.
      showToast({
        message: 'Could not identify this job opening - please refresh the page and try again.',
        type: 'error',
      });
      return;
    }
    try {
      const validation = await validateForPublish(activeJobOpeningId).unwrap();
      if (!validation.is_valid) {
        setBlockedRoundIds(validation.round_ids_missing_questions ?? []);
        showToast({
          message: `Cannot publish yet: ${describeFailedChecks(
            validation.failed_checks ?? [],
            validation.rounds_missing_questions ?? []
          )}`,
          type: 'error',
        });
        return;
      }
      const published = await publishJob(activeJobOpeningId).unwrap();
      // Write the fresh state into cache directly — navigate() below can
      // unmount before the invalidated query refetches.
      dispatch(
        jobOpeningByIdApi.util.updateQueryData(
          'getJobOpeningById',
          { jobOpeningId: activeJobOpeningId },
          (draft) => {
            draft.data.isDraft = published.is_draft;
            draft.is_draft = published.is_draft;
            draft.is_published = published.is_published;
          }
        )
      );
      dispatch(setIsDraft(published.is_draft));
      showToast({ message: 'Job opening published', type: 'success' });
      navigate('/jobs');
    } catch (err) {
      setBlockedRoundIds(getRoundIdsMissingQuestions(err));
      showToast({
        message: describePublishError(err, 'Failed to publish job opening'),
        type: 'error',
      });
    }
  };

  useEffect(() => {
    if (activeJobOpeningId) {
      refetchQuestions();
    }
  }, [activeJobOpeningId, refetchQuestions]);

  const handleSelectSection = (key: string) => {
    setOpenSectionKey(key);
    if (key !== 'intake') {
      setSelectedRoundInstanceId(key);
      // Keep selections; per-round map preserves them automatically.
      setUploadedFileName('');
      setImportedCount(0);
      setFailedRowCount(0);
      setDuplicateRowCount(0);
      setImportWarnings([]);
    }
  };

  // The Intake Call round is optional (job-service, 2026-10-05): its question
  // section only belongs here when this job's sequence actually has one.
  const { data: jobRounds = [] } = useGetInterviewRoundsByJobIdQuery(activeJobOpeningId ?? '', {
    skip: !activeJobOpeningId,
  });
  const jobHasIntakeRound = useMemo(() => {
    const intakeTypeIds = new Set(
      roundTypes.filter((t) => t.special_kind === 'intake_call').map((t) => String(t.round_id))
    );
    return jobRounds.some((round) => intakeTypeIds.has(String(round.round?.id ?? '')));
  }, [roundTypes, jobRounds]);
  const {
    data: intakeData,
    isFetching: isFetchingIntake,
    isError: intakeFailed,
  } = useGetJobIntakeQuestionsQuery(activeJobOpeningId, {
    skip: !activeJobOpeningId || !jobHasIntakeRound,
  });
  const intakeCount = intakeData?.questions?.length ?? 0;
  // Company intake questions are copied in as soon as the job has an Intake Call, so
  // they are already there (and counted) before the tab is opened.
  const [importIntakeQuestions] = useImportJobIntakeQuestionsMutation();
  const autoImportedIntakeForRef = useRef<string | null>(null);
  const [companyHasNoIntakeQuestions, setCompanyHasNoIntakeQuestions] = useState(false);
  useEffect(() => {
    if (!activeJobOpeningId || !jobHasIntakeRound || !isAssignedToThisJob) return;
    if (isFetchingIntake || intakeFailed || !intakeData || intakeCount > 0) return;
    if (autoImportedIntakeForRef.current === activeJobOpeningId) return;
    autoImportedIntakeForRef.current = activeJobOpeningId;
    importIntakeQuestions(activeJobOpeningId)
      .unwrap()
      .then((result) => setCompanyHasNoIntakeQuestions(result.questions.length === 0))
      .catch((err) => {
        showToast({
          message: getJobErrorMessage(err, 'Failed to import intake questions.'),
          type: 'error',
        });
      });
  }, [
    activeJobOpeningId,
    jobHasIntakeRound,
    isAssignedToThisJob,
    isFetchingIntake,
    intakeFailed,
    intakeData,
    intakeCount,
    importIntakeQuestions,
  ]);
  const questionCountByRound = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach((q) => {
      counts[q.interview_round_id] = (counts[q.interview_round_id] ?? 0) + 1;
    });
    return counts;
  }, [questions]);

  // Live list, so the banner clears itself as the rounds get filled.
  const emptyRoundNames = jdRounds
    .filter(
      (r) =>
        blockedRoundIds.includes(r.round_instance_id) && !questionCountByRound[r.round_instance_id]
    )
    .map((r) => r.round_name);

  // Warn only for unsent text or empty rounds on a published job.
  const unsentDraft = inlineInputText.trim().length > 0;
  const roundsLeftEmpty = isEditingAlreadyPublishedJob
    ? jdRounds
        .filter((r) => !questionCountByRound[r.round_instance_id])
        .map((r) => r.round_name ?? 'Interview Round')
    : [];
  const leaveIssues = [
    unsentDraft && "the question you typed hasn't been added",
    intakeUnsaved && "your intake question changes aren't saved",
    roundsLeftEmpty.length > 0 &&
      `${joinWithAnd(roundsLeftEmpty)} ${roundsLeftEmpty.length > 1 ? 'have' : 'has'} no questions`,
  ].filter(Boolean) as string[];
  const { isBlocked, confirmNavigation, cancelNavigation } = useNavigationBlocker(
    true,
    leaveIssues.length > 0
  );

  // Intake is its own entry in the round list; otherwise the active round.
  const activeKey = effectiveOpenKey || activeRoundInstanceId || 'intake';
  const isIntakeActive = jobHasIntakeRound && activeKey === 'intake';
  // Leaving the Intake tab drops its unsaved edits, so ask first.
  const [pendingSectionKey, setPendingSectionKey] = useState<string | null>(null);
  const requestSelectSection = (key: string) => {
    if (isIntakeActive && intakeUnsaved && key !== 'intake') {
      setPendingSectionKey(key);
      return;
    }
    handleSelectSection(key);
  };
  const activeRound = isIntakeActive
    ? null
    : (jdRounds.find((round) => round.round_instance_id === activeKey) ?? jdRounds[0] ?? null);
  // Tabs in display order: Intake Call (when the job has one), then each round.
  // Save & Next walks them; the last one publishes.
  const sectionKeys = [
    ...(activeJobOpeningId && jobHasIntakeRound ? ['intake'] : []),
    ...jdRounds.map((round) => round.round_instance_id),
  ];
  const activeSectionIndex = sectionKeys.indexOf(
    isIntakeActive ? 'intake' : (activeRound?.round_instance_id ?? '')
  );
  const nextSectionKey = activeSectionIndex >= 0 ? sectionKeys[activeSectionIndex + 1] : undefined;
  const isLastSection = nextSectionKey === undefined;
  const canPublishHere = isEditingAlreadyPublishedJob || (canPublish && isAssignedToThisJob);
  const emptyRoundsBlockingPublish = [
    ...(jobHasIntakeRound && intakeCount === 0 ? ['Intake Call'] : []),
    ...jdRounds
      .filter((r) => !questionCountByRound[r.round_instance_id])
      .map((r) => r.round_name ?? 'Interview Round'),
  ];
  const roundsMissingSelection = jdRounds
    .filter(
      (r) =>
        (questionCountByRound[r.round_instance_id] ?? 0) > 0 &&
        (selectedIdsByRound[r.round_instance_id]?.length ?? 0) === 0
    )
    .map((r) => r.round_name ?? 'Interview Round');
  const publishDisabledReason =
    isLoadingQuestions || !questionsData
      ? null
      : jdRounds.length === 0
        ? 'Add an interview round with questions first.'
        : emptyRoundsBlockingPublish.length > 0
          ? `Add at least one question to: ${emptyRoundsBlockingPublish.join(', ')}`
          : roundsMissingSelection.length > 0
            ? `Select at least one question in: ${roundsMissingSelection.join(', ')}`
            : null;
  const handleSaveAndNext = async () => {
    if (!nextSectionKey) return;
    const sectionIsEmpty = isIntakeActive
      ? intakeCount === 0
      : !!activeRound && !questionCountByRound[activeRound.round_instance_id];
    if (sectionIsEmpty) {
      if (activeRound) {
        setBlockedRoundIds((ids) => [...new Set([...ids, activeRound.round_instance_id])]);
      }
      showToast({
        message: `Add at least one question to ${
          isIntakeActive ? 'the Intake Call' : activeRound?.round_name
        } before continuing.`,
        type: 'error',
      });
      return;
    }
    const saved = await flushLocalEdits();
    if (!saved) return;
    requestSelectSection(nextSectionKey);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="flex min-w-0 max-w-full flex-col gap-1.5">
        {(isLoadingQuestions ||
          isGenerating ||
          isUploadingExcel ||
          isDownloadingTemplate ||
          isDeleteInProgress ||
          isInlineSubmitting ||
          isSavingEdits ||
          isPublishing) && <Loader />}

        <div className="flex shrink-0 items-center gap-2">
          <span className="bg-primary-50 text-primary-600 p-1.5 rounded-lg flex items-center justify-center">
            <MdOutlineQuestionAnswer size={16} />
          </span>
          <Typography variant="h5" className="text-neutral-900 font-bold m-0">
            Questions
          </Typography>
        </div>

        {headerSlot &&
          createPortal(
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100/80 bg-gradient-to-r from-primary-50 via-white to-accent-50 px-3.5 py-1.5 shadow-xs">
              <MdInfoOutline className="text-primary-600 shrink-0" size={15} />
              <Typography
                variant="caption"
                color="inherit"
                as="span"
                className="m-0 text-xs font-medium text-neutral-700"
              >
                {isEditingAlreadyPublishedJob
                  ? 'Your question changes are saved automatically.'
                  : 'Your questions are saved automatically. The job stays a draft until you publish it.'}
              </Typography>
            </div>,
            headerSlot
          )}

        {noEligibleRound && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Add an AI Agent Call, AI Video Interview, Live Video Interview or In-Person Interview
            round to the Interview Sequence before adding questions.
          </div>
        )}

        {emptyRoundNames.length > 0 && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>
              Add at least one question to: <strong>{emptyRoundNames.join(', ')}</strong>
            </span>
            <button
              type="button"
              onClick={() => setBlockedRoundIds([])}
              aria-label="Dismiss"
              className="shrink-0 cursor-pointer text-red-500 hover:text-red-700"
            >
              <MdClose size={18} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center mb-1 gap-2">
            <nav aria-label="Interview rounds" className="flex flex-wrap mb-1.5 gap-2">
              {activeJobOpeningId && jobHasIntakeRound && (
                <RoundNavItem
                  label="Intake Call"
                  subtitle="Asked on the intake call"
                  count={intakeCount}
                  active={isIntakeActive}
                  onClick={() => handleSelectSection('intake')}
                />
              )}
              {jdRounds.map((round) => (
                <RoundNavItem
                  key={round.round_instance_id}
                  label={round.round_name ?? 'Interview Round'}
                  count={questionCountByRound[round.round_instance_id] ?? 0}
                  active={
                    !isIntakeActive && activeRound?.round_instance_id === round.round_instance_id
                  }
                  onClick={() => requestSelectSection(round.round_instance_id)}
                />
              ))}
            </nav>
            <div ref={setActionsSlot} className="flex flex-wrap items-center gap-2 sm:ml-auto" />
          </div>

          <section>
            {isIntakeActive && activeJobOpeningId ? (
              <>
                <JobIntakeQuestionsSection
                  jobOpeningId={activeJobOpeningId}
                  canManage={isAssignedToThisJob}
                  companyHasNoQuestions={companyHasNoIntakeQuestions}
                  embedded
                  onUnsavedChange={setIntakeUnsaved}
                />
              </>
            ) : activeRound ? (
              <div className="flex flex-col gap-2">
                <QuestionEntryPanel
                  actionsContainer={actionsSlot}
                  empty={!isLoadingQuestions && !activeSearch && visibleQuestions.length === 0}
                  description=""
                  text={inlineInputText}
                  onTextChange={setInlineInputText}
                  onSubmit={handleInlineSubmit}
                  isSubmitting={isInlineSubmitting || isLoadingQuestions}
                  roundName={activeRound.round_name ?? 'Interview Round'}
                  onGenerate={() => setShowGenerateConsentModal(true)}
                  onUpload={handleFileUpload}
                  uploadedFiles={uploadedFiles}
                  uploadedFileName={uploadedFileName}
                  importedCount={importedCount}
                  failedCount={failedRowCount}
                  duplicateCount={duplicateRowCount}
                  warnings={importWarnings}
                  onClearDetails={() => {
                    setUploadedFileName('');
                    setImportWarnings([]);
                    setFailedRowCount(0);
                    setDuplicateRowCount(0);
                  }}
                  isGenerating={isGenerating}
                  generateDisabled={noEligibleRound || isLoadingQuestions}
                  isUploading={isUploadingExcel}
                  onDownloadTemplate={handleDownloadTemplate}
                  isDownloading={isDownloadingTemplate}
                />
                <QuestionList
                  key={activeRound.round_instance_id}
                  questions={visibleQuestions.map((q) =>
                    localEdits[q.id] ? { ...q, question_text: localEdits[q.id] } : q
                  )}
                  selectedIds={selectedIds}
                  isLoading={isLoadingQuestions}
                  isSearchLoading={isSearchFetching}
                  listRef={questionListRef}
                  searchValue={activeSearch}
                  onSearchChange={handleSearchChange}
                  onSelectionChange={handleSelectionChange}
                  onLocalEdit={handleLocalEdit}
                  onDelete={(questionId) => {
                    setSelectedQuestionId(questionId);
                    setShowDeleteModal(true);
                  }}
                  onDeleteSelected={() => {
                    setSelectedQuestionId(null);
                    setShowDeleteModal(true);
                  }}
                  onReorder={(reorderedQuestions) => {
                    // Other rounds keep their current order; only the active round is reordered.
                    const otherRoundQuestions = questions
                      .filter((q) => q.interview_round_id !== activeRoundInstanceId)
                      .map(toQuestionRequest);
                    persistQuestions([
                      ...otherRoundQuestions,
                      ...reorderedQuestions.map(toQuestionRequest),
                    ]);
                  }}
                />
              </div>
            ) : (
              <p className="m-0 py-8 text-center text-sm text-gray-500">
                Add an interview round first to start adding questions.
              </p>
            )}
          </section>
        </div>

        {showDeleteModal && (
          <ConfirmationModal
            onClose={() => {
              if (!isDeleteInProgress) {
                setShowDeleteModal(false);
                setSelectedQuestionId(null);
              }
            }}
            title={
              !selectedQuestionId && selectedIds.length > 0
                ? 'Delete selected questions?'
                : 'Delete question?'
            }
            onConfirm={confirmDelete}
            confirmText="Delete"
            isLoading={isDeleteInProgress}
          />
        )}
        <GenerateQuestionsConsentModal
          open={showGenerateConsentModal}
          onClose={() => setShowGenerateConsentModal(false)}
          onConfirm={handleGenerateDefaultQuestions}
          isLoading={isGenerateRequestPending}
          hasExistingQuestions={visibleQuestions.length > 0}
          scoringSectionOptions={scoringSectionOptions}
        />
        {pendingSectionKey && (
          <ConfirmationModal
            onClose={() => setPendingSectionKey(null)}
            onConfirm={() => {
              handleSelectSection(pendingSectionKey);
              setPendingSectionKey(null);
            }}
            title="You have unsaved intake changes. Switch anyway?"
            confirmText="Switch"
          />
        )}
        {isBlocked && (
          <ConfirmationModal
            onClose={cancelNavigation}
            onConfirm={confirmNavigation}
            title={`Leave this page? ${capitalize(joinWithAnd(leaveIssues))}.`}
            confirmText="Leave Page"
          />
        )}
        <AiQuestionsActionFooter
          canPublishHere={canPublishHere}
          isEditingAlreadyPublishedJob={isEditingAlreadyPublishedJob}
          isLastSection={isLastSection}
          isPublishing={isPublishing}
          activeJobOpeningId={activeJobOpeningId}
          publishDisabledReason={publishDisabledReason}
          onSaveDraft={handleSaveDraft}
          onCancel={() => setShowCancelConfirm(true)}
          onSaveAndNext={handleSaveAndNext}
          onPublishOrFinish={handlePublishOrFinish}
        />
        {showCancelConfirm && (
          <ConfirmationModal
            onClose={() => setShowCancelConfirm(false)}
            onConfirm={handleConfirmCancel}
            title="Cancel this job opening? Everything added so far will be permanently deleted."
            confirmText="Cancel Job"
            isLoading={isCancelling}
          />
        )}
        <Outlet />
      </div>
    </>
  );
};

export default AiQuestionsSetup;
