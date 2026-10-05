import { useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from 'antd';
import { MdInfoOutline, MdOutlineQuestionAnswer } from 'react-icons/md';
import { HiOutlineTrash } from 'react-icons/hi';
import { useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../redux/provider/store';
import { stopStream } from '../../../redux/slices/streamSlice';
import { setIsDraft } from '../../../redux/slices/editJobOpeningSlice';
import { Loader } from '../../shared/ui/loader';
import { Button, showToast, Typography } from '../../shared';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { useNavigationBlocker } from '../../../hooks/useNavigationBlocker';
import QuestionFormModal from './QuestionFormModal';
import JobIntakeQuestionsSection from './JobIntakeQuestionsSection';
import {
  useGetJobIntakeQuestionsQuery,
  useGetJobQuestionsQuery,
  useSaveJobQuestionsMutation,
  useGenerateJobQuestionsMutation,
  useRegenerateJobQuestionsMutation,
  useBulkImportJobQuestionsMutation,
  useLazyGetQuestionImportTemplateQuery,
  jobQuestionsApi,
} from '../../../api/job-service/JobOpening/jobQuestions';
import { useListInterviewRoundTypesQuery } from '../../../api/job-service/JobOpening/catalogs';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import {
  useGetJobScoringConfigQuery,
  type JobScoringWeight,
} from '../../../api/job-service/JobOpening/jobScoringConfig';
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

import UploadAndGenerateHeader, { type ImportWarningItem } from './UploadAndGenerateHeader';
import InlineQuestionInput from './InlineQuestionInput';
import QuestionRowItem from './QuestionRowItem';
import { GenerateQuestionsConsentModal } from './GenerateQuestionsConsentModal';
import { useIsEditingDraft } from '../../../hooks/useIsEditingDraft';

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
    return 'Add an AI Video, Hiring Panel, or AI Audio Screening round to the Interview Sequence before generating questions.';
  }
  return getJobErrorMessage(err, fallback);
};

type RoundNavItemProps = {
  label: string;
  subtitle?: string;
  count: number;
  active: boolean;
  onClick: () => void;
};

const RoundNavItem = ({ label, subtitle, count, active, onClick }: RoundNavItemProps) => (
  <Tooltip title={subtitle}>
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
        active
          ? 'border-primary bg-primary-50 text-primary-700'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
      <span
        title={count > 0 ? `${count} question(s)` : 'No questions yet - add at least one.'}
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          count > 0 ? 'bg-primary text-white' : 'bg-white text-primary-700 ring-1 ring-primary-200'
        }`}
      >
        {count}
      </span>
    </button>
  </Tooltip>
);

const AiQuestionsSetup = () => {
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionResponse | null>(null);
  const [editedQuestionText, setEditedQuestionText] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const [inlineInputText, setInlineInputText] = useState('');
  const [isInlineSubmitting, setIsInlineSubmitting] = useState(false);
  // Which round's questions are currently shown/added to.
  const [selectedRoundInstanceId, setSelectedRoundInstanceId] = useState<string | null>(null);

  const [importWarnings, setImportWarnings] = useState<ImportWarningItem[]>([]);
  const [failedRowCount, setFailedRowCount] = useState<number>(0);
  const [duplicateRowCount, setDuplicateRowCount] = useState<number>(0);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const [showGenerateConsentModal, setShowGenerateConsentModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
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

  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
    refetch: refetchQuestions,
  } = useGetJobQuestionsQuery(activeJobOpeningId, {
    skip: !activeJobOpeningId,
    pollingInterval: isGeneratingQuestions ? GENERATION_POLL_INTERVAL_MS : 0,
  });

  const [saveJobQuestions] = useSaveJobQuestionsMutation();
  const [generateJobQuestions, { isLoading: isGenerateRequestPending }] =
    useGenerateJobQuestionsMutation();
  const [regenerateJobQuestions] = useRegenerateJobQuestionsMutation();
  const [bulkImportJobQuestions, { isLoading: isUploadingExcel }] =
    useBulkImportJobQuestionsMutation();
  const [downloadTemplate, { isLoading: isDownloadingTemplate }] =
    useLazyGetQuestionImportTemplateQuery();
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
  const visibleQuestions = useMemo(
    () => questions.filter((q) => q.interview_round_id === activeRoundInstanceId),
    [questions, activeRoundInstanceId]
  );
  // After an add, scroll the list so the new question at the bottom is in view.
  const questionListRef = useRef<HTMLDivElement>(null);
  const scrollToEndAfterAddRef = useRef(false);
  useEffect(() => {
    if (!scrollToEndAfterAddRef.current) return;
    scrollToEndAfterAddRef.current = false;
    const list = questionListRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [visibleQuestions.length]);
  // Content fingerprint rather than a count, since REPLACE can reduce the count.
  const questionsSnapshotKey = useMemo(() => questions.map((q) => q.id).join(','), [questions]);

  // Accordion: one section open at a time. '__default__' defers to the
  // active round; '' means every section is explicitly collapsed.
  const [openSectionKey, setOpenSectionKey] = useState<string>('__default__');
  const effectiveOpenKey =
    openSectionKey === '__default__' ? (activeRoundInstanceId ?? '') : openSectionKey;

  // Hiring Panel = available_variants ["online", "offline"].
  const activeRoundTypeId = jdRounds.find(
    (round) => round.round_instance_id === activeRoundInstanceId
  )?.round_id;
  const isHiringPanelActiveRound = useMemo(() => {
    const variants = roundTypes.find((rt) => rt.round_id === activeRoundTypeId)?.available_variants;
    return (
      !!variants &&
      variants.length === 2 &&
      variants.includes('online') &&
      variants.includes('offline')
    );
  }, [roundTypes, activeRoundTypeId]);
  // AI Video = available_variants ["soundwave", "avatar"].
  const isAiVideoActiveRound = useMemo(() => {
    const variants = roundTypes.find((rt) => rt.round_id === activeRoundTypeId)?.available_variants;
    return (
      !!variants &&
      variants.length === 2 &&
      variants.includes('soundwave') &&
      variants.includes('avatar')
    );
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
  // What this round's questions should probe - shown as guidance text.
  const activeRoundGuidanceLabels = useMemo(() => {
    const weights = scoringData?.data?.interviewConfig?.weights ?? [];
    const appliesToActiveRound = isHiringPanelActiveRound
      ? (w: JobScoringWeight) => w.appliesPanel
      : isAiVideoActiveRound
        ? (w: JobScoringWeight) => w.appliesAiVideo
        : (w: JobScoringWeight) => w.appliesAudioScreening;
    return weights.filter(appliesToActiveRound).map((w) => w.displayName ?? w.categoryName);
  }, [scoringData, isHiringPanelActiveRound, isAiVideoActiveRound]);

  // A batch rejected by the content check: stop waiting and show why.
  const generationError = questionsData?.generation_error;
  useEffect(() => {
    if (!isGeneratingQuestions || !generationError) return;
    setIsGeneratingQuestions(false);
    roundBeingGeneratedForRef.current = null;
    showToast({ message: generationError, type: 'error' });
  }, [isGeneratingQuestions, generationError]);

  // Stop polling once the list differs from its pre-generation snapshot.
  useEffect(() => {
    if (!isGeneratingQuestions) return;
    if (questionSnapshotBeforeGenerateRef.current === null) return;
    if (questionsSnapshotKey === questionSnapshotBeforeGenerateRef.current) return;
    setIsGeneratingQuestions(false);
    showToast({ message: 'Questions generated', type: 'success' });
    if (roundBeingGeneratedForRef.current) {
      setOpenSectionKey(roundBeingGeneratedForRef.current);
      roundBeingGeneratedForRef.current = null;
    }
  }, [isGeneratingQuestions, questionsSnapshotKey]);

  // Safety net so polling doesn't run forever. Does one last refetch before
  // giving up, in case generation finished right around the timeout.
  useEffect(() => {
    if (!isGeneratingQuestions) return;
    const timeoutId = setTimeout(async () => {
      const result = await refetchQuestions();
      const latestKey = (result.data?.rounds ?? [])
        .flatMap((round) => round.questions ?? [])
        .map((q) => q.id)
        .join(',');
      if (latestKey !== questionSnapshotBeforeGenerateRef.current) {
        setIsGeneratingQuestions(false);
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

  const isAllSelected =
    visibleQuestions.length > 0 && selectedIds.length === visibleQuestions.length;

  const toQuestionRequest = (question: QuestionResponse): QuestionRequest => ({
    id: question.id,
    question_text: question.question_text,
    answer_text: question.answer_text,
    interview_round_id: question.interview_round_id,
    scoring_sections: question.scoring_sections,
  });

  // Shared save path for add/edit/delete — sends the job's whole updated
  // list. Writes the PUT's response into the cache directly so the update
  // lands even if the follow-up refetch doesn't land in time.
  const persistQuestions = async (next: QuestionRequest[]) => {
    if (!activeJobOpeningId) return;
    const res = await saveJobQuestions({
      jobOpeningId: activeJobOpeningId,
      questions: next,
    }).unwrap();
    dispatch(jobQuestionsApi.util.upsertQueryData('getJobQuestions', activeJobOpeningId, res));
    await refetchQuestions();
  };

  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? visibleQuestions.map((q) => q.id) : []);
  const handleSelectOne = (questionId: string, checked: boolean) =>
    setSelectedIds((prev) =>
      checked ? [...prev, questionId] : prev.filter((item) => item !== questionId)
    );

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
    try {
      const result = await downloadTemplate().unwrap();
      if (result?.download_url) {
        window.open(result.download_url, '_blank');
        showToast({ message: 'Template downloaded successfully', type: 'success' });
      }
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to download template'),
        type: 'error',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeJobOpeningId) return;
    try {
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
            message: `Row ${row.row_number}: ${row.error}`,
          })
        ),
        ...(res.skipped_duplicate_rows ?? []).map(
          (row): ImportWarningItem => ({
            type: 'duplicate',
            message: `Row ${row.row_number}: duplicate of an existing question - "${row.question_text}"`,
          })
        ),
      ]);
      // No same-shape response to upsert here (unlike persistQuestions
      // above) - wait for the real refetch before returning.
      await refetchQuestions();
      showToast({ message: 'Questions uploaded successfully', type: 'success' });
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
      const next: QuestionRequest[] = [
        ...questions.map(toQuestionRequest),
        ...lines.map((question_text) => ({
          question_text,
          interview_round_id: activeRoundInstanceId,
        })),
      ];
      scrollToEndAfterAddRef.current = true;
      await persistQuestions(next);
      showToast({ message: 'Questions added successfully', type: 'success' });
      setInlineInputText('');
    } catch (err) {
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
    const idsToRemove = new Set(
      selectedIds.length > 0 ? selectedIds : selectedQuestionId ? [selectedQuestionId] : []
    );
    const remaining = questions.filter((q) => !idsToRemove.has(q.id)).map(toQuestionRequest);

    persistQuestions(remaining)
      .then(() => {
        showToast({ message: 'Deleted successfully', type: 'success' });
        setSelectedIds([]);
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

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingQuestion(null);
    setEditedQuestionText('');
  };

  const handleEditSave = async () => {
    if (!editingQuestion || isEditSubmitting) return;

    const normalizedQuestion = editedQuestionText.trim();
    if (!normalizedQuestion) {
      showToast({ message: 'Question is required.', type: 'error' });
      return;
    }

    setIsEditSubmitting(true);
    try {
      const next = questions.map((q) =>
        q.id === editingQuestion.id
          ? { ...toQuestionRequest(q), question_text: normalizedQuestion }
          : toQuestionRequest(q)
      );
      await persistQuestions(next);
      showToast({ message: 'Question updated successfully', type: 'success' });
      closeEditModal();
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Error updating question'),
        type: 'error',
      });
    } finally {
      setIsEditSubmitting(false);
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
    dispatch(stopStream());
    if (isEditingAlreadyPublishedJob) {
      // Edits save as they're made; this only checks no round was left empty.
      try {
        const validation = await validateForPublish(activeJobOpeningId).unwrap();
        const emptyRounds = validation.rounds_missing_questions ?? [];
        if (emptyRounds.length > 0) {
          setBlockedRoundIds(validation.round_ids_missing_questions ?? []);
          showToast({
            message: describeFailedChecks(['no_question'], emptyRounds),
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
      setSelectedIds([]);
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
  const { data: intakeData } = useGetJobIntakeQuestionsQuery(activeJobOpeningId, {
    skip: !activeJobOpeningId || !jobHasIntakeRound,
  });
  const intakeCount = intakeData?.questions?.length ?? 0;
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
    ? jdRounds.filter((r) => !questionCountByRound[r.round_instance_id]).map((r) => r.round_name)
    : [];
  const leaveIssues = [
    unsentDraft && "a question you haven't added",
    intakeUnsaved && 'unsaved intake changes',
    roundsLeftEmpty.length > 0 && `empty rounds: ${roundsLeftEmpty.join(', ')}`,
  ].filter(Boolean);
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
  const activeRoundDescription = roundTypes.find(
    (rt) => rt.round_id === activeRound?.round_id
  )?.round_description;

  return (
    <>
      <div className="flex flex-col gap-3 py-2">
        {(isLoadingQuestions ||
          isGenerating ||
          isUploadingExcel ||
          isDownloadingTemplate ||
          isDeleteInProgress ||
          isEditSubmitting ||
          isInlineSubmitting ||
          isPublishing) && <Loader />}

        <div className="flex items-center gap-2">
          <span className="bg-primary-50 text-primary-600 p-1.5 rounded-lg flex items-center justify-center">
            <MdOutlineQuestionAnswer size={16} />
          </span>
          <Typography variant="h5" className="text-neutral-900 font-bold m-0">
            Questions
          </Typography>
        </div>

        {noEligibleRound && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Add an AI Video, Hiring Panel, or AI Audio Screening round to the Interview Sequence
            before adding questions.
          </div>
        )}

        {emptyRoundNames.length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            Add at least one question to: <strong>{emptyRoundNames.join(', ')}</strong>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <nav aria-label="Interview rounds" className="flex flex-wrap gap-2">
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

          <section className="min-w-0 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            {isIntakeActive && activeJobOpeningId ? (
              <>
                <JobIntakeQuestionsSection
                  jobOpeningId={activeJobOpeningId}
                  canManage={isAssignedToThisJob}
                  embedded
                  onUnsavedChange={setIntakeUnsaved}
                />
              </>
            ) : activeRound ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Typography variant="subtitle1" className="m-0 font-bold text-gray-900">
                    {activeRound.round_name}
                  </Typography>
                  {(activeRoundDescription || activeRoundGuidanceLabels.length > 0) && (
                    <Tooltip
                      title={
                        <div className="flex flex-col gap-1">
                          {activeRoundDescription && <span>{activeRoundDescription}</span>}
                          {activeRoundGuidanceLabels.length > 0 && (
                            <span>Focus areas: {activeRoundGuidanceLabels.join(', ')}</span>
                          )}
                        </div>
                      }
                    >
                      <MdInfoOutline className="-ml-1.5 text-gray-400" size={15} />
                    </Tooltip>
                  )}
                  <span className="text-sm text-gray-400">
                    {visibleQuestions.length} question{visibleQuestions.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_370px]">
                  <div className="order-2 min-w-0 lg:order-1">
                    {visibleQuestions.length > 0 && (
                      <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-semibold text-gray-800">Select All</span>
                        </label>
                        <Tooltip
                          title={
                            selectedIds.length > 0
                              ? 'Delete the ticked questions.'
                              : 'Delete every question in this round.'
                          }
                        >
                          <button
                            className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (selectedIds.length === 0)
                                setSelectedIds(visibleQuestions.map((q) => q.id));
                              setShowDeleteModal(true);
                            }}
                          >
                            <HiOutlineTrash size={15} />
                            {selectedIds.length > 0
                              ? `Delete Selected (${selectedIds.length})`
                              : 'Delete All'}
                          </button>
                        </Tooltip>
                      </div>
                    )}

                    {isLoadingQuestions ? (
                      <p className="py-6 text-center text-sm italic text-gray-400">Loading...</p>
                    ) : visibleQuestions.length === 0 ? (
                      <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
                        <p className="m-0 text-sm font-semibold text-gray-700">
                          No questions for this round yet
                        </p>
                        <p className="m-0 mt-1 text-sm text-gray-500">
                          Write a question, generate with AI, or upload a file.
                        </p>
                      </div>
                    ) : (
                      <div
                        ref={questionListRef}
                        className="max-h-[46vh] min-h-[120px] space-y-3 overflow-y-auto pr-1"
                      >
                        {visibleQuestions.map((q, index) => (
                          <QuestionRowItem
                            key={q.id}
                            number={index + 1}
                            question={{ id: q.id, question: q.question_text }}
                            checked={selectedIds.includes(q.id)}
                            onCheckChange={(checked) => handleSelectOne(q.id, checked)}
                            onEdit={() => {
                              setEditingQuestion(q);
                              setEditedQuestionText(q.question_text);
                              setIsEditModalOpen(true);
                            }}
                            onDelete={() => {
                              setSelectedQuestionId(q.id);
                              setShowDeleteModal(true);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="order-1 flex flex-col gap-3 lg:order-2">
                    <InlineQuestionInput
                      value={inlineInputText}
                      onChange={setInlineInputText}
                      onSubmit={handleInlineSubmit}
                      isSubmitting={isInlineSubmitting || isLoadingQuestions}
                      disabled={noEligibleRound}
                    />
                    <UploadAndGenerateHeader
                      description="Or add questions faster here:"
                      onGenerate={() => setShowGenerateConsentModal(true)}
                      onUpload={handleFileUpload}
                      onDownloadTemplate={handleDownloadTemplate}
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
                      generateDisabled={noEligibleRound}
                      isUploading={isUploadingExcel}
                      isDownloading={isDownloadingTemplate}
                    />
                  </div>
                </div>
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
            title={selectedIds.length > 0 ? 'Delete selected questions?' : 'Delete question?'}
            onConfirm={confirmDelete}
            confirmText="Delete"
            isLoading={isDeleteInProgress}
          />
        )}
        <QuestionFormModal
          open={isEditModalOpen}
          title="Update AI Question"
          questionText={editedQuestionText}
          submitLabel="Update Question"
          isSubmitting={isEditSubmitting}
          onQuestionChange={setEditedQuestionText}
          onSubmit={handleEditSave}
          onClose={closeEditModal}
          disableSubmit={!editedQuestionText.trim()}
        />
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
            title={`Leave this page? Still pending: ${leaveIssues.join(', ')}.`}
            confirmText="Leave Page"
          />
        )}
        {activeJobOpeningId && (
          <p className="m-0 mt-2 text-center text-xs text-gray-500">
            {isEditingAlreadyPublishedJob
              ? 'Your question changes are saved automatically.'
              : 'Your questions are saved automatically. The job stays a draft until you publish it.'}
          </p>
        )}
        {(isEditingAlreadyPublishedJob || (canPublish && isAssignedToThisJob)) && (
          <div className="flex justify-center gap-6">
            {!isEditingAlreadyPublishedJob && (
              <Tooltip title="Save progress and come back later.">
                <Button
                  className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
                  onClick={handleSaveDraft}
                >
                  Save As Draft
                </Button>
              </Tooltip>
            )}
            {!isEditingAlreadyPublishedJob && (
              <Tooltip title="Delete this job opening and everything in it.">
                <Button
                  className="text-white bg-gray-400 hover:bg-gray-500 rounded-3xl px-8 py-2 flex items-center space-x-2"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel
                </Button>
              </Tooltip>
            )}
            <Tooltip
              title={
                isEditingAlreadyPublishedJob
                  ? 'Save changes to this published job.'
                  : 'Publish this job opening live.'
              }
            >
              <Button
                className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => void handlePublishOrFinish()}
                disabled={isPublishing || !activeJobOpeningId}
              >
                {isPublishing
                  ? 'Publishing…'
                  : isEditingAlreadyPublishedJob
                    ? 'Save & Finish'
                    : '✓ Publish Job Opening'}
              </Button>
            </Tooltip>
          </div>
        )}
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
