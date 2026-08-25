import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { stopStream } from '../../../redux/slices/streamSlice';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Loader } from '../../shared/ui/loader';
import { Button, showToast, Typography } from '../../shared';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import QuestionFormModal from './QuestionFormModal';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import { get } from 'lodash-es';
import {
  useGetAllAiGeneralQuestionsByJobIdQuery,
  useDeleteAiGeneralQuestionMutation,
  useEditAiGeneralQuestionMutation,
  useReorderAiGeneralQuestionMutation,
  useGenerateAiGeneralQuestionsMutation,
  usePasteAiGeneralQuestionsMutation,
  useUploadAiGeneralQuestionsExcelMutation,
  useDeleteAllAiGeneralQuestionsMutation,
  useDownloadAiGeneralQuestionsTemplateMutation,
} from '../../../api/ai-service/AiQuestion/GeneralQuestions';

import UploadAndGenerateHeader from './UploadAndGenerateHeader';
import InlineQuestionInput from './InlineQuestionInput';
import QuestionRowItem from './QuestionRowItem';
import { GenerateQuestionsConsentModal } from './GenerateQuestionsConsentModal';

// System-fixed, view-only Sound Wave Round question set. Unlike JD Questions
// below, this isn't scoped to a job or backed by an endpoint — no such
// endpoint exists (see plan doc) — it's the same fixed script Iris asks on
// every Sound Wave round, hardcoded here.
const SOUND_WAVE_ROUND_QUESTIONS = [
  "What's your current notice period or earliest available start date?",
  'Can you walk me through your resume at a high level?',
  'What are your salary expectations for this role?',
  'Why are you interested in this position?',
  'Are you authorized to work in the country where this role is based?',
  "What's driving you to look for a new opportunity right now?",
  'Do you have any scheduling constraints for interviews?',
];

const AiQuestionsSetup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { id } = useParams<{ id?: string }>();
  const reduxJobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  const streamJobOpeningId = useSelector((state: RootState) => state.streamSlice.jobOpeningId);
  const streamLastEvent = useSelector((state: RootState) => state.streamSlice.lastEvent);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [isDeleteInProgress, setIsDeleteInProgress] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editedQuestionText, setEditedQuestionText] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Inline add state
  const [inlineInputText, setInlineInputText] = useState('');
  const [isInlineSubmitting, setIsInlineSubmitting] = useState(false);

  // Excel upload feedback states
  const [warnings, setWarnings] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const [showGenerateConsentModal, setShowGenerateConsentModal] = useState(false);

  const activeJobOpeningId = useMemo(
    () => (id ? Number(id) : streamJobOpeningId || reduxJobOpeningId),
    [id, streamJobOpeningId, reduxJobOpeningId]
  );

  const [deleteAiQuestion] = useDeleteAiGeneralQuestionMutation();
  const [editAiQuestion] = useEditAiGeneralQuestionMutation();
  const [reorderAiGeneralQuestion] = useReorderAiGeneralQuestionMutation();
  const [generateAiQuestions, { isLoading: isGenerating }] =
    useGenerateAiGeneralQuestionsMutation();
  const [pasteQuestions] = usePasteAiGeneralQuestionsMutation();
  const [uploadExcel, { isLoading: isUploadingExcel }] = useUploadAiGeneralQuestionsExcelMutation();
  const [deleteAllQuestions] = useDeleteAllAiGeneralQuestionsMutation();
  const [downloadTemplate, { isLoading: isDownloadingTemplate }] =
    useDownloadAiGeneralQuestionsTemplateMutation();

  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
    refetch: refetchQuestions,
  } = useGetAllAiGeneralQuestionsByJobIdQuery(
    { jobOpeningId: Number(activeJobOpeningId) },
    { skip: !activeJobOpeningId }
  );

  const { data: roundsData } = useGetInterviewRoundsByJobIdQuery(activeJobOpeningId, {
    skip: !activeJobOpeningId,
  });
  const aiRoundId = useMemo(
    () => roundsData?.find((round) => round.roundType === 'AI')?.id ?? null,
    [roundsData]
  );

  useEffect(() => {
    if (
      (streamLastEvent === 'GENERAL_QUESTIONS_READY' || activeJobOpeningId) &&
      activeJobOpeningId
    ) {
      refetchQuestions();
    }
  }, [streamLastEvent, activeJobOpeningId, refetchQuestions]);

  const questions = useMemo(() => questionsData?.data ?? [], [questionsData]);
  const isAllSelected = questions.length > 0 && selectedIds.length === questions.length;

  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? questions.map((q) => q.id) : []);
  const handleSelectOne = (id: number, checked: boolean) =>
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));

  const handleGenerateDefaultQuestions = async (mode: 'ADD' | 'REPLACE') => {
    if (!activeJobOpeningId || !aiRoundId)
      return showToast({ message: 'Missing Job ID or Round ID', type: 'error' });
    try {
      const res = await generateAiQuestions({
        jobOpeningId: Number(activeJobOpeningId),
        interviewRoundId: aiRoundId,
        mode: mode,
      }).unwrap();
      if (res?.status || res?.success) {
        showToast({ message: res?.message || 'Questions generated successfully', type: 'success' });
        refetchQuestions();
        setShowGenerateConsentModal(false);
      }
    } catch (err) {
      showToast({ message: get(err, 'data.message', 'Error generating questions'), type: 'error' });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadTemplate().unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai_general_questions_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast({ message: 'Template downloaded successfully', type: 'success' });
    } catch {
      showToast({ message: 'Failed to download template', type: 'error' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeJobOpeningId || !aiRoundId) return;
    try {
      const res = await uploadExcel({
        file,
        jobOpeningId: Number(activeJobOpeningId),
        interviewRoundId: aiRoundId,
      }).unwrap();
      if (res?.success) {
        setUploadedFileName(file.name);
        setImportedCount(res.data?.importedCount || 0);
        setSkippedCount(res.data?.skippedRows || 0);
        setWarnings(res.data?.warnings || []);
        showToast({ message: res?.message || 'Questions uploaded successfully', type: 'success' });
        refetchQuestions();
      }
    } catch (err) {
      showToast({ message: get(err, 'data.message', 'Error uploading file'), type: 'error' });
    }
    e.target.value = '';
  };

  const handleInlineSubmit = async () => {
    const trimmedInput = inlineInputText.trim();
    if (!trimmedInput || !activeJobOpeningId || !aiRoundId) return;
    setIsInlineSubmitting(true);
    try {
      const res = await pasteQuestions({
        jobOpeningId: Number(activeJobOpeningId),
        interviewRoundId: aiRoundId,
        text: trimmedInput,
      }).unwrap();
      if (res?.success) {
        showToast({ message: res?.message || 'Questions added successfully', type: 'success' });
        setInlineInputText('');
        refetchQuestions();
      }
    } catch (err) {
      showToast({ message: get(err, 'data.message', 'Error saving questions'), type: 'error' });
    }
    setIsInlineSubmitting(false);
  };

  const confirmDelete = () => {
    if (isDeleteInProgress) return;
    setIsDeleteInProgress(true);
    const allSelected = selectedIds.length === questions.length;
    const deletePromise =
      selectedIds.length > 0
        ? allSelected
          ? deleteAllQuestions({
              jobOpeningId: Number(activeJobOpeningId),
              interviewRoundId: aiRoundId,
            }).unwrap()
          : Promise.all(
              selectedIds.map((qId) =>
                deleteAiQuestion({ questionID: qId, interviewRoundId: aiRoundId }).unwrap()
              )
            )
        : deleteAiQuestion({
            questionID: Number(selectedQuestionId),
            interviewRoundId: aiRoundId,
          }).unwrap();

    deletePromise
      .then(() => {
        showToast({ message: 'Deleted successfully', type: 'success' });
        setSelectedIds([]);
        refetchQuestions();
      })
      .catch((err) =>
        showToast({ message: get(err, 'data.message', 'Error deleting'), type: 'error' })
      )
      .finally(() => {
        setIsDeleteInProgress(false);
        setShowDeleteModal(false);
        setSelectedQuestionId(null);
      });
  };

  const handleDrop = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newItems = [...questions];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    reorderAiGeneralQuestion({
      jobOpeningId: Number(activeJobOpeningId),
      interviewRoundId: aiRoundId,
      items: newItems.map((item, idx) => ({ id: item.id, order: idx + 1 })),
    })
      .unwrap()
      .then(() => refetchQuestions());
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

    const resolvedRoundId = editingQuestion.interviewRoundId || aiRoundId;
    if (!resolvedRoundId) {
      showToast({ message: 'Interview round is missing', type: 'error' });
      return;
    }

    setIsEditSubmitting(true);
    editAiQuestion({
      questionID: editingQuestion.id,
      question: normalizedQuestion,
      interviewRoundId: Number(resolvedRoundId),
    })
      .unwrap()
      .then((res) => {
        if (res?.status) {
          showToast({
            message: get(res, 'message', 'Question updated successfully'),
            type: 'success',
          });
          refetchQuestions();
          closeEditModal();
        } else {
          showToast({ message: get(res, 'message', 'Failed to update question'), type: 'error' });
        }
      })
      .catch((err) => {
        showToast({ message: get(err, 'data.message', 'Error updating question'), type: 'error' });
      })
      .finally(() => {
        setIsEditSubmitting(false);
      });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col gap-6 py-4">
        {(isLoadingQuestions ||
          isGenerating ||
          isUploadingExcel ||
          isDownloadingTemplate ||
          isDeleteInProgress ||
          isEditSubmitting ||
          isInlineSubmitting) && <Loader />}

        <div className="flex justify-between items-center bg-[#E7E4E4] border border-[var(--border)] px-6 py-4 rounded-full">
          <Typography variant="h5" className="text-gray-800 m-0">
            Questions
          </Typography>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <Typography variant="subtitle1" className="font-bold text-gray-800 m-0">
              Sound Wave Round
            </Typography>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-3 py-1">
              View only
            </span>
          </div>
          <div className="space-y-3">
            {SOUND_WAVE_ROUND_QUESTIONS.map((question, idx) => (
              <div
                key={idx}
                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700"
              >
                {question}
              </div>
            ))}
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
                className="text-red-500 hover:text-red-700 text-sm font-semibold hover:underline"
                onClick={() => {
                  if (selectedIds.length === 0) setSelectedIds(questions.map((q) => q.id));
                  setShowDeleteModal(true);
                }}
              >
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
                  question={q}
                  index={idx}
                  onDrop={handleDrop}
                  checked={selectedIds.includes(q.id)}
                  onCheckChange={(checked) => handleSelectOne(q.id, checked)}
                  onEdit={() => {
                    setEditingQuestion(q);
                    setEditedQuestionText(q.question);
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
          isLoading={isGenerating}
        />
        <div className="mt-6 flex justify-center">
          <Button
            className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
            onClick={() => {
              // Questions is now the wizard's last step (Video Questions is
              // retired from the nav — see JobDetailsLayout.tsx).
              dispatch(stopStream());
              navigate(pathname.includes('/edit/') && id ? `/jobs/view/${id}/details` : '/jobs');
            }}
          >
            {pathname.includes('/edit/') ? 'SAVE & FINISH' : '✓ PUBLISH JOB OPENING'}
          </Button>
        </div>
        <Outlet />
      </div>
    </DndProvider>
  );
};

export default AiQuestionsSetup;
