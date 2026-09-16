import { useEffect, useMemo, useRef, useState } from 'react';
import { Select } from 'antd';
import { MdOutlineQuestionAnswer } from 'react-icons/md';
import { HiOutlineTrash } from 'react-icons/hi';
import { useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../redux/provider/store';
import { stopStream } from '../../../redux/slices/streamSlice';
import { setIsDraft } from '../../../redux/slices/editJobOpeningSlice';
import { Loader } from '../../shared/ui/loader';
import { Button, showToast, Typography } from '../../shared';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import QuestionFormModal from './QuestionFormModal';
import {
  useGetJobQuestionsQuery,
  useGetAudioQuestionsQuery,
  useSaveJobQuestionsMutation,
  useGenerateJobQuestionsMutation,
  useRegenerateJobQuestionsMutation,
  useBulkImportJobQuestionsMutation,
  useLazyGetQuestionImportTemplateQuery,
  jobQuestionsApi,
} from '../../../api/job-service/JobOpening/jobQuestions';
import { useListInterviewRoundTypesQuery } from '../../../api/job-service/JobOpening/catalogs';
import { useGetJobScoringConfigQuery } from '../../../api/job-service/JobOpening/jobScoringConfig';
import {
  useLazyValidateForPublishQuery,
  usePublishJobMutation,
} from '../../../api/job-service/JobOpening/CloseJob';
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

const DEFAULT_QUESTION_COUNT = 10;
const GENERATION_POLL_INTERVAL_MS = 1000;
const GENERATION_POLL_TIMEOUT_MS = 90_000;

// Human-readable text for each publish-readiness failure code.
const PUBLISH_CHECK_LABELS: Record<string, string> = {
  jd_missing: 'Job description is missing',
  mandatory_fields_incomplete:
    'Some required Job Details fields are missing - check Job Title, Department, Job Mode, Job Type, Open Date, Vacancies, Minimum Experience, Salary Range, and Hiring Manager',
  no_education_preference: 'Education preference is not set',
  no_location: 'At least one job location is required',
  no_skill: 'At least one skill is required',
  no_mandatory_skill: 'At least one skill must be marked Required, not just Optional',
  no_round: 'At least one interview round is required',
  no_question: 'At least one question is required',
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
  const isEditingAlreadyPublishedJob = useSelector(
    (state: RootState) => isEditRoute && !state.EditJobSlice.isDraft
  );

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

  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
    refetch: refetchQuestions,
  } = useGetJobQuestionsQuery(activeJobOpeningId, {
    skip: !activeJobOpeningId,
    pollingInterval: isGeneratingQuestions ? GENERATION_POLL_INTERVAL_MS : 0,
  });

  const { data: audioData } = useGetAudioQuestionsQuery(activeJobOpeningId, {
    skip: !activeJobOpeningId,
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
  const audioQuestions = audioData?.questions ?? [];
  // Content fingerprint rather than a count, since REPLACE can reduce the count.
  const questionsSnapshotKey = useMemo(() => questions.map((q) => q.id).join(','), [questions]);

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

  const { data: scoringData } = useGetJobScoringConfigQuery(activeJobOpeningId, {
    skip: !activeJobOpeningId || !isHiringPanelActiveRound,
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

  // Stop polling once the list differs from its pre-generation snapshot.
  useEffect(() => {
    if (!isGeneratingQuestions) return;
    if (questionSnapshotBeforeGenerateRef.current === null) return;
    if (questionsSnapshotKey === questionSnapshotBeforeGenerateRef.current) return;
    setIsGeneratingQuestions(false);
    showToast({ message: 'Questions generated', type: 'success' });
  }, [isGeneratingQuestions, questionsSnapshotKey]);

  // Safety net so polling doesn't run forever if generation never visibly finishes.
  useEffect(() => {
    if (!isGeneratingQuestions) return;
    const timeoutId = setTimeout(() => {
      setIsGeneratingQuestions(false);
      showToast({
        message: "Still generating - refresh in a moment if the questions don't appear shortly.",
        type: 'warning',
      });
    }, GENERATION_POLL_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [isGeneratingQuestions]);

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
        message: getJobErrorMessage(err, 'Error generating questions'),
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
        message: getJobErrorMessage(err, 'Error uploading file'),
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
      await persistQuestions(next);
      showToast({ message: 'Questions added successfully', type: 'success' });
      setInlineInputText('');
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Error saving questions'),
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

  const handlePublishOrFinish = async () => {
    dispatch(stopStream());
    if (isEditingAlreadyPublishedJob) {
      navigate(`/jobs/view/${id}/details`);
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
      navigate(isEditRoute ? `/jobs/view/${id}/details` : '/jobs');
    } catch (err) {
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

  return (
    <>
      <div className="flex flex-col gap-6 py-4">
        {(isLoadingQuestions ||
          isGenerating ||
          isUploadingExcel ||
          isDownloadingTemplate ||
          isDeleteInProgress ||
          isEditSubmitting ||
          isInlineSubmitting ||
          isPublishing) && <Loader />}

        <div className="flex items-center gap-2 px-1">
          <span className="bg-primary-50 text-primary-600 p-1.5 rounded-lg flex items-center justify-center">
            <MdOutlineQuestionAnswer size={16} />
          </span>
          <Typography variant="h5" className="text-neutral-900 font-bold m-0">
            Questions
          </Typography>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <Typography variant="subtitle1" className="font-bold text-gray-800 m-0">
              Intake Questions
            </Typography>
            <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 rounded-full px-3 py-1">
              View only
            </span>
          </div>
          <div className="space-y-3">
            {audioQuestions.length === 0 ? (
              <p className="text-gray-400 italic text-sm">No intake questions configured.</p>
            ) : (
              audioQuestions.map((question) => (
                <div
                  key={question.question_id}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700"
                >
                  {question.question_text}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-between items-center px-2">
          <Typography variant="subtitle1" className="font-bold text-gray-800 m-0">
            JD Questions
          </Typography>
        </div>

        {jdRounds.length > 0 && (
          <div className="mb-4">
            <Typography variant="body2" className="text-gray-600 mb-1.5 font-semibold">
              Interview Round
            </Typography>
            <Select
              value={activeRoundInstanceId ?? undefined}
              onChange={(value) => {
                setSelectedRoundInstanceId(value);
                setSelectedIds([]);
                setUploadedFileName('');
                setImportedCount(0);
                setFailedRowCount(0);
                setDuplicateRowCount(0);
                setImportWarnings([]);
              }}
              className="w-full max-w-sm"
              options={jdRounds.map((round) => ({
                value: round.round_instance_id,
                label: round.round_name,
              }))}
            />
          </div>
        )}

        <UploadAndGenerateHeader
          description="Type a question, or paste several at once - one question per line."
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
          isUploading={isUploadingExcel}
          isDownloading={isDownloadingTemplate}
        />

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 cursor-pointer"
              />
              <Typography variant="subtitle1" className="font-bold text-gray-800 m-0">
                All Questions ({visibleQuestions.length})
              </Typography>
            </div>
            {(selectedIds.length > 0 || visibleQuestions.length > 0) && (
              <button
                className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm font-semibold cursor-pointer"
                onClick={() => {
                  if (selectedIds.length === 0) setSelectedIds(visibleQuestions.map((q) => q.id));
                  setShowDeleteModal(true);
                }}
              >
                <HiOutlineTrash size={15} />
                {selectedIds.length > 0 ? `Delete selected (${selectedIds.length})` : 'Delete all'}
              </button>
            )}
          </div>

          {isLoadingQuestions ? (
            <p className="text-gray-400 py-6 text-center italic text-sm">Loading...</p>
          ) : visibleQuestions.length === 0 ? (
            <p className="text-gray-400 py-6 text-center italic text-sm">
              No questions. Add questions manually, import via Excel, or generate with AI.
            </p>
          ) : (
            <div className="space-y-3 mb-6">
              {visibleQuestions.map((q, idx) => (
                <QuestionRowItem
                  key={q.id}
                  question={{ id: q.id, question: q.question_text }}
                  index={idx}
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

          <InlineQuestionInput
            value={inlineInputText}
            onChange={setInlineInputText}
            onSubmit={handleInlineSubmit}
            isSubmitting={isInlineSubmitting || isLoadingQuestions}
          />
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
            confirmText="DELETE"
            isLoading={isDeleteInProgress}
          />
        )}
        <QuestionFormModal
          open={isEditModalOpen}
          title="Update AI Question"
          questionText={editedQuestionText}
          submitLabel="UPDATE QUESTION"
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
        {(isEditingAlreadyPublishedJob || (canPublish && isAssignedToThisJob)) && (
          <div className="mt-6 flex justify-center">
            <Button
              className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => void handlePublishOrFinish()}
              disabled={isPublishing || !activeJobOpeningId}
            >
              {isPublishing
                ? 'PUBLISHING…'
                : isEditingAlreadyPublishedJob
                  ? 'SAVE & FINISH'
                  : '✓ PUBLISH JOB OPENING'}
            </Button>
          </div>
        )}
        <Outlet />
      </div>
    </>
  );
};

export default AiQuestionsSetup;
