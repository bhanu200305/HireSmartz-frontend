import { useEffect, useMemo, useRef, useState } from 'react';
import { MdOutlineQuestionAnswer } from 'react-icons/md';
import { HiOutlineTrash } from 'react-icons/hi';
import { useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { stopStream } from '../../../redux/slices/streamSlice';
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
} from '../../../api/job-service/JobOpening/jobQuestions';
import { useListInterviewRoundTypesQuery } from '../../../api/job-service/JobOpening/catalogs';
import {
  useLazyValidateForPublishQuery,
  usePublishJobMutation,
} from '../../../api/job-service/JobOpening/CloseJob';
import type { QuestionRequest, QuestionResponse } from '../../../api/job-service/types';
import { asJobId } from '../../../api/job-service/jobId';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';

import UploadAndGenerateHeader from './UploadAndGenerateHeader';
import InlineQuestionInput from './InlineQuestionInput';
import QuestionRowItem from './QuestionRowItem';
import { GenerateQuestionsConsentModal } from './GenerateQuestionsConsentModal';

const DEFAULT_QUESTION_COUNT = 10;
// AI question generation is fire-and-forget on the backend — POST
// .../questions/generate|regenerate only ever returns `{generation_status:
// "GENERATING"}`, and nothing on GET .../questions ever reports when a
// generation actually finished (no analogue of the AI Description panel's
// jd_status). The only observable signal is the question list itself
// changing, so this polls it for a bounded window after triggering
// generation rather than leaving the recruiter to notice nothing arrived
// and refresh the whole page.
const GENERATION_POLL_INTERVAL_MS = 3000;
const GENERATION_POLL_TIMEOUT_MS = 90_000;

// Human-readable text for each `failed_checks` code check_publish_readiness
// (job-service's _publish_validation.py) can return — the API only reports
// which named gate failed, not which specific field, so
// 'mandatory_fields_incomplete' lists every field that gate covers rather
// than guessing which one this job is actually missing.
const PUBLISH_CHECK_LABELS: Record<string, string> = {
  jd_missing: 'Job description is missing',
  mandatory_fields_incomplete:
    'Some required Job Details fields are missing — check Job Title, Department, Job Mode, Job Type, Open Date, Vacancies, Minimum Experience, Salary Range, and Hiring Manager',
  no_education_preference: 'Education preference is not set',
  no_location: 'At least one job location is required',
  no_skill: 'At least one skill is required',
  no_mandatory_skill: 'At least one skill must be marked Mandatory, not just Optional',
  no_round: 'At least one interview round is required',
  no_question: 'At least one question is required',
};

const describeFailedChecks = (checks: string[]): string =>
  checks.map((check) => PUBLISH_CHECK_LABELS[check] ?? check).join('; ');

const AiQuestionsSetup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { id } = useParams<{ id?: string }>();
  const reduxJobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);

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

  const [warnings, setWarnings] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const [showGenerateConsentModal, setShowGenerateConsentModal] = useState(false);

  // `id` only exists on the Edit-mode route (/jobs/edit/:id/...); this
  // page is also mounted create-mode at the id-less /ai-questions, where
  // `reduxJobOpeningId` (JobSlice, set by useStartManualJobOpening when
  // the wizard started) is the only correct source. `EditJobSlice`'s own
  // jobOpeningId used to be consulted here too, ahead of this — a stale
  // value left over from a previous Edit-mode visit silently overrode a
  // freshly-created job's real id on this page, since Edit-mode never
  // needs that fallback in the first place (its routes already carry
  // `:id`, resolved above). See the "already published" report this
  // fixes — a fresh Manual job kept landing back on an old published one.
  const activeJobOpeningId = useMemo(
    () => asJobId(id) || asJobId(reduxJobOpeningId),
    [id, reduxJobOpeningId]
  );

  // `/jobs/edit/:id/...` is used for TWO different situations: finishing a
  // draft that was never published (Job Openings list's "Edit" action on a
  // draft), and touching up a job that's already live. Only the second one
  // should skip publishing — the job is already public, so this step's job
  // is just to save the questions and return to the (now up to date) view
  // page. The first case still needs the exact same validate-then-publish
  // call the create wizard uses below, or a draft opened via Edit could
  // never actually be published at all. `EditJobSlice.isDraft` is set by
  // JobsOpening.tsx (the stable parent for this whole edit route) from the
  // job's own `is_draft` the moment it loads, so it's reliably in place by
  // the time this, the last step, is reached.
  const isEditRoute = pathname.includes('/edit/') && Boolean(id);
  const isEditingAlreadyPublishedJob = useSelector(
    (state: RootState) => isEditRoute && !state.EditJobSlice.isDraft
  );

  const { data: roundTypes = [] } = useListInterviewRoundTypesQuery();
  const audioRoundTypeIds = useMemo(
    () => new Set(roundTypes.filter((item) => item.is_audio_round).map((item) => item.round_id)),
    [roundTypes]
  );

  // True from the moment generation is triggered until the question list
  // is observed to actually change (or the poll times out) — see the
  // GENERATION_POLL_* comment above.
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
  // Covers the whole async wait (the POST itself, plus the polling window
  // above) — used everywhere the UI needs to show "still working" through
  // generation actually finishing, not just the initial request.
  const isGenerating = isGenerateRequestPending || isGeneratingQuestions;

  const jdRounds = useMemo(
    () => (questionsData?.rounds ?? []).filter((round) => !audioRoundTypeIds.has(round.round_id)),
    [questionsData, audioRoundTypeIds]
  );

  const questions = useMemo(() => jdRounds.flatMap((round) => round.questions ?? []), [jdRounds]);
  const defaultRoundInstanceId = jdRounds[0]?.round_instance_id ?? null;
  const audioQuestions = audioData?.questions ?? [];
  // Cheap content fingerprint, not just a count — REPLACE can land with
  // fewer questions than before, so "count increased" would miss it.
  const questionsSnapshotKey = useMemo(() => questions.map((q) => q.id).join(','), [questions]);

  // Stop polling as soon as the list actually differs from what it looked
  // like right before this generation was triggered.
  useEffect(() => {
    if (!isGeneratingQuestions) return;
    if (questionSnapshotBeforeGenerateRef.current === null) return;
    if (questionsSnapshotKey === questionSnapshotBeforeGenerateRef.current) return;
    setIsGeneratingQuestions(false);
    showToast({ message: 'Questions generated', type: 'success' });
  }, [isGeneratingQuestions, questionsSnapshotKey]);

  // Safety net — stop polling even if generation never visibly finishes
  // (e.g. it failed silently server-side), rather than polling forever.
  useEffect(() => {
    if (!isGeneratingQuestions) return;
    const timeoutId = setTimeout(() => {
      setIsGeneratingQuestions(false);
      showToast({
        message: "Still generating — refresh in a moment if the questions don't appear shortly.",
        type: 'warning',
      });
    }, GENERATION_POLL_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [isGeneratingQuestions]);

  const isAllSelected = questions.length > 0 && selectedIds.length === questions.length;

  const toQuestionRequest = (question: QuestionResponse): QuestionRequest => ({
    id: question.id,
    question_text: question.question_text,
    answer_text: question.answer_text,
    interview_round_id: question.interview_round_id,
    topic_skill: question.topic_skill,
  });

  const persistQuestions = async (next: QuestionRequest[]) => {
    if (!activeJobOpeningId) return;
    await saveJobQuestions({ jobOpeningId: activeJobOpeningId, questions: next }).unwrap();
    await refetchQuestions();
  };

  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? questions.map((q) => q.id) : []);
  const handleSelectOne = (questionId: string, checked: boolean) =>
    setSelectedIds((prev) =>
      checked ? [...prev, questionId] : prev.filter((item) => item !== questionId)
    );

  const handleGenerateDefaultQuestions = async (mode: 'ADD' | 'REPLACE') => {
    if (!activeJobOpeningId) {
      showToast({ message: 'Missing Job ID', type: 'error' });
      return;
    }
    try {
      // Snapshot the list as it looks right now — the polling effect above
      // waits for it to differ from this before declaring generation done.
      questionSnapshotBeforeGenerateRef.current = questionsSnapshotKey;
      if (mode === 'REPLACE') {
        await regenerateJobQuestions({
          jobOpeningId: activeJobOpeningId,
          question_count: DEFAULT_QUESTION_COUNT,
        }).unwrap();
      } else {
        await generateJobQuestions({
          jobOpeningId: activeJobOpeningId,
          question_count: DEFAULT_QUESTION_COUNT,
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
    } catch {
      showToast({ message: 'Failed to download template', type: 'error' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeJobOpeningId) return;
    try {
      const res = await bulkImportJobQuestions({
        jobOpeningId: activeJobOpeningId,
        file,
      }).unwrap();
      setUploadedFileName(file.name);
      setImportedCount(res.imported_count || 0);
      setSkippedCount(res.skipped_duplicate_rows?.length || 0);
      setWarnings(
        (res.failed_rows ?? []).map((row) => (typeof row === 'string' ? row : JSON.stringify(row)))
      );
      showToast({ message: 'Questions uploaded successfully', type: 'success' });
      refetchQuestions();
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
    if (!trimmedInput || !activeJobOpeningId || !defaultRoundInstanceId) return;
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
          interview_round_id: defaultRoundInstanceId,
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
    if (!activeJobOpeningId) return;
    try {
      const validation = await validateForPublish(activeJobOpeningId).unwrap();
      if (!validation.is_valid) {
        showToast({
          message: `Cannot publish yet: ${describeFailedChecks(validation.failed_checks ?? [])}`,
          type: 'error',
        });
        return;
      }
      await publishJob(activeJobOpeningId).unwrap();
      showToast({ message: 'Job opening published', type: 'success' });
      navigate(isEditRoute ? `/jobs/view/${id}/details` : '/jobs');
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to publish job opening'),
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

        <UploadAndGenerateHeader
          description="Use the input box below to add your questions easily and quickly. You can either type the questions manually or simply copy and paste multiple questions at once."
          onGenerate={() => {
            if (questions.length === 0) {
              void handleGenerateDefaultQuestions('REPLACE');
            } else {
              setShowGenerateConsentModal(true);
            }
          }}
          onUpload={handleFileUpload}
          onDownloadTemplate={handleDownloadTemplate}
          uploadedFileName={uploadedFileName}
          importedCount={importedCount}
          skippedCount={skippedCount}
          warnings={warnings}
          onClearDetails={() => {
            setUploadedFileName('');
            setWarnings([]);
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
                All Questions ({questions.length})
              </Typography>
            </div>
            {(selectedIds.length > 0 || questions.length > 0) && (
              <button
                className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm font-semibold cursor-pointer"
                onClick={() => {
                  if (selectedIds.length === 0) setSelectedIds(questions.map((q) => q.id));
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
          ) : questions.length === 0 ? (
            <p className="text-gray-400 py-6 text-center italic text-sm">
              No questions. Add questions manually or import via Excel/Defaults.
            </p>
          ) : (
            <div className="space-y-3 mb-6">
              {questions.map((q, idx) => (
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
            isSubmitting={isInlineSubmitting}
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
        />
        <div className="mt-6 flex justify-center">
          <Button
            className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
            onClick={() => void handlePublishOrFinish()}
          >
            {isEditingAlreadyPublishedJob ? 'SAVE & FINISH' : '✓ PUBLISH JOB OPENING'}
          </Button>
        </div>
        <Outlet />
      </div>
    </>
  );
};

export default AiQuestionsSetup;
