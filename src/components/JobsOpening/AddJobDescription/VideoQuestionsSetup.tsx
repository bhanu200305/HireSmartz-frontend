import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { Select } from 'antd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button, showToast, Typography } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { RootState } from '../../../redux/provider/store';
import {
  useGetAiInterviewQuestionsByRoundQuery,
  useDeleteAiInterviewQuestionMutation,
  useEditAiInterviewQuestionMutation,
  useReorderVideoInterviewQuestionsMutation,
  useGenerateVideoInterviewQuestionsMutation,
  usePasteVideoInterviewQuestionsMutation,
  useUploadVideoInterviewQuestionsExcelMutation,
  useDeleteAllVideoInterviewQuestionsMutation,
  useDownloadVideoInterviewQuestionsTemplateMutation,
} from '../../../api/interview-service/VideoInterviewQuestions/VideoInterviewQuestion';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { asJobId } from '../../../api/job-service/jobId';
import { stopStream } from '../../../redux/slices/streamSlice';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import { get } from 'lodash-es';
import QuestionFormModal from './QuestionFormModal';

import UploadAndGenerateHeader from './UploadAndGenerateHeader';
import CategoryQuestionBlock from './CategoryQuestionBlock';
import { GenerateQuestionsConsentModal } from './GenerateQuestionsConsentModal';

const { Option } = Select;

const VideoQuestionsSetup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { id } = useParams<{ id: string }>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [isDeleteInProgress, setIsDeleteInProgress] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeDeleteCategoryId, setActiveDeleteCategoryId] = useState<number | null>(null);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editedQuestionText, setEditedQuestionText] = useState('');
  const [editedCategoryId, setEditedCategoryId] = useState<string | number | undefined>();
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Inline inputs state per category
  const [inlineTexts, setInlineTexts] = useState<Record<number, string>>({ 3: '', 2: '', 1: '' });
  const [isInlineSubmitting, setIsInlineSubmitting] = useState(false);

  // Excel upload feedback states
  const [warnings, setWarnings] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const [showGenerateConsentModal, setShowGenerateConsentModal] = useState(false);

  const reduxJobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  const streamInterviewRoundId = useSelector(
    (state: RootState) => state.streamSlice.interviewRoundId
  );
  const streamLastEvent = useSelector((state: RootState) => state.streamSlice.lastEvent);
  const interviewRounds = useSelector((state: RootState) => state.JobSlice.interviewRounds);

  const [deleteAiInterviewQuestion] = useDeleteAiInterviewQuestionMutation();
  const [editAiInterviewQuestion] = useEditAiInterviewQuestionMutation();
  const [reorderVideoQuestions] = useReorderVideoInterviewQuestionsMutation();
  const [generateVideoQuestions, { isLoading: isGenerating }] =
    useGenerateVideoInterviewQuestionsMutation();
  const [pasteQuestions] = usePasteVideoInterviewQuestionsMutation();
  const [uploadExcel, { isLoading: isUploadingExcel }] =
    useUploadVideoInterviewQuestionsExcelMutation();
  const [deleteAllQuestions] = useDeleteAllVideoInterviewQuestionsMutation();
  const [downloadTemplate, { isLoading: isDownloadingTemplate }] =
    useDownloadVideoInterviewQuestionsTemplateMutation();

  const { jobOpeningDropdown: categoryOptions, loading: categoryLoading } = useJobOpeningDropdown(
    'AI_QUESTION_CATEGORIES',
    'create'
  );
  const reduxAiJobDescriptionId = useSelector(
    (state: RootState) => state.JobSlice.aiJobDescriptionId
  );

  const activeJobOpeningId = useMemo(
    () => asJobId(id) || asJobId(reduxJobOpeningId),
    [id, reduxJobOpeningId]
  );

  const { data: jobData } = useGetJobOpeningByIdQuery(
    { jobOpeningId: activeJobOpeningId },
    { skip: !activeJobOpeningId }
  );

  const aiJobDescriptionId = useMemo(() => {
    return jobData?.data?.aiJobDescription?.id || reduxAiJobDescriptionId;
  }, [reduxAiJobDescriptionId, jobData]);

  const { data: roundsData, isLoading: isLoadingRounds } = useGetInterviewRoundsByJobIdQuery(
    activeJobOpeningId,
    { skip: !activeJobOpeningId }
  );

  const videoRounds = useMemo(
    () => (roundsData ?? []).filter((r) => r.roundType === 'VIDEO'),
    [roundsData]
  );
  const defaultRoundId = useMemo(
    () =>
      streamInterviewRoundId ||
      videoRounds[0]?.id ||
      interviewRounds.find((r) => r.roundType === 'VIDEO')?.id ||
      null,
    [streamInterviewRoundId, videoRounds, interviewRounds]
  );
  const [selectedRoundId, setSelectedRoundId] = useState<string | number | null>(null);

  useEffect(() => {
    if (defaultRoundId !== null && selectedRoundId === null) setSelectedRoundId(defaultRoundId);
  }, [defaultRoundId, selectedRoundId]);
  const activeInterviewRoundId = selectedRoundId ?? defaultRoundId;
  const activeRoundName = useMemo(
    () => videoRounds.find((r) => r.id === activeInterviewRoundId)?.uniqueRoundIdentifier ?? 'N/A',
    [videoRounds, activeInterviewRoundId]
  );

  const {
    data: videoQuestionsData,
    isLoading: isLoadingVideoQuestions,
    isFetching: isFetchingVideoQuestions,
    refetch: refetchVideoQuestions,
  } = useGetAiInterviewQuestionsByRoundQuery(
    { interviewRoundId: activeInterviewRoundId ?? 0, jobOpeningId: activeJobOpeningId || 0 },
    { skip: !activeInterviewRoundId || !activeJobOpeningId }
  );

  useEffect(() => {
    if (
      (streamLastEvent === 'VIDEO_QUESTIONS_READY' || activeJobOpeningId) &&
      activeJobOpeningId &&
      activeInterviewRoundId
    ) {
      refetchVideoQuestions();
    }
  }, [streamLastEvent, activeJobOpeningId, activeInterviewRoundId, refetchVideoQuestions]);

  const categoriesMap = useMemo(
    () => videoQuestionsData?.categories || (videoQuestionsData as any)?.categorizedQuestions || {},
    [videoQuestionsData]
  );
  const categoryBlocks = useMemo(
    () => [
      {
        id: 3,
        title: 'Competency-Based Questions',
        questions: categoriesMap['Competency-Based Questions'] || [],
      },
      {
        id: 2,
        title: 'Open-Ended Questions',
        questions: categoriesMap['Open-Ended Questions'] || [],
      },
      {
        id: 1,
        title: 'Pass/Fail Questions',
        questions: categoriesMap['Pass/Fail Questions'] || [],
      },
    ],
    [categoriesMap]
  );

  const handleGenerateDefaultQuestions = async (mode: 'ADD' | 'REPLACE') => {
    if (!activeJobOpeningId || !activeInterviewRoundId)
      return showToast({ message: 'Missing parameters', type: 'error' });
    try {
      const res = await generateVideoQuestions({
        jobOpeningId: Number(activeJobOpeningId),
        interviewRoundId: Number(activeInterviewRoundId),
        aiJobDescriptionId: aiJobDescriptionId ? Number(aiJobDescriptionId) : undefined,
        mode: mode,
      }).unwrap();
      if (res?.status || res?.success) {
        showToast({ message: res?.message || 'Questions generated successfully', type: 'success' });
        refetchVideoQuestions();
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
      a.download = 'video_questions_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      showToast({ message: 'Failed to download template', type: 'error' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeJobOpeningId || !activeInterviewRoundId) return;
    try {
      const res = await uploadExcel({
        file,
        jobOpeningId: Number(activeJobOpeningId),
        interviewRoundId: Number(activeInterviewRoundId),
      }).unwrap();
      if (res?.success) {
        setUploadedFileName(file.name);
        setImportedCount(res.data?.importedCount || 0);
        setSkippedCount(res.data?.skippedRows || 0);
        setWarnings(res.data?.warnings || []);
        showToast({ message: 'Uploaded successfully', type: 'success' });
        refetchVideoQuestions();
      }
    } catch (err) {
      showToast({ message: get(err, 'data.message', 'Error uploading file'), type: 'error' });
    }
    e.target.value = '';
  };

  const handleInlineSubmit = async (categoryId: number) => {
    const text = inlineTexts[categoryId]?.trim();
    if (!text || !activeJobOpeningId || !activeInterviewRoundId) return;
    setIsInlineSubmitting(true);
    try {
      const res = await pasteQuestions({
        jobOpeningId: Number(activeJobOpeningId),
        interviewRoundId: Number(activeInterviewRoundId),
        categoryId,
        text,
      }).unwrap();
      if (res?.success) {
        showToast({ message: 'Questions added successfully', type: 'success' });
        setInlineTexts((prev) => ({ ...prev, [categoryId]: '' }));
        refetchVideoQuestions();
      }
    } catch (err) {
      showToast({ message: get(err, 'data.message', 'Error saving'), type: 'error' });
    }
    setIsInlineSubmitting(false);
  };

  const confirmDelete = () => {
    if (isDeleteInProgress) return;
    setIsDeleteInProgress(true);
    if (activeDeleteCategoryId !== null) {
      const catQuestions =
        categoryBlocks.find((b) => b.id === activeDeleteCategoryId)?.questions || [];
      const catCheckedIds = catQuestions
        .map((q: any) => q.id)
        .filter((id: number) => selectedIds.includes(id));
      const isDeletingAll =
        catCheckedIds.length === 0 || catCheckedIds.length === catQuestions.length;

      const deletePromise = isDeletingAll
        ? deleteAllQuestions({
            jobOpeningId: Number(activeJobOpeningId),
            interviewRoundId: Number(activeInterviewRoundId),
            categoryId: activeDeleteCategoryId,
          }).unwrap()
        : Promise.all(
            catCheckedIds.map((qId: number) =>
              deleteAiInterviewQuestion({
                questionID: qId,
                interviewRoundId: Number(activeInterviewRoundId),
              }).unwrap()
            )
          );

      deletePromise
        .then(() => {
          showToast({ message: 'Deleted successfully', type: 'success' });
          setSelectedIds((prev: number[]) =>
            isDeletingAll
              ? prev.filter((id: number) => !catQuestions.map((q: any) => q.id).includes(id))
              : prev.filter((id: number) => !catCheckedIds.includes(id))
          );
          refetchVideoQuestions();
        })
        .catch((err) =>
          showToast({ message: get(err, 'data.message', 'Error deleting'), type: 'error' })
        )
        .finally(() => {
          setIsDeleteInProgress(false);
          setShowDeleteModal(false);
          setActiveDeleteCategoryId(null);
        });
    } else if (selectedQuestionId !== null) {
      deleteAiInterviewQuestion({
        questionID: selectedQuestionId,
        interviewRoundId: Number(activeInterviewRoundId),
      })
        .unwrap()
        .then(() => {
          showToast({ message: 'Deleted successfully', type: 'success' });
          refetchVideoQuestions();
        })
        .catch((err) =>
          showToast({ message: get(err, 'data.message', 'Error deleting'), type: 'error' })
        )
        .finally(() => {
          setShowDeleteModal(false);
          setSelectedQuestionId(null);
          setIsDeleteInProgress(false);
        });
    }
  };

  const handleDrop = (categoryId: number, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const catQuestions = [...(categoryBlocks.find((b) => b.id === categoryId)?.questions || [])];
    const [movedItem] = catQuestions.splice(fromIndex, 1);
    catQuestions.splice(toIndex, 0, movedItem);
    reorderVideoQuestions({
      jobOpeningId: Number(activeJobOpeningId),
      interviewRoundId: Number(activeInterviewRoundId),
      categoryId,
      items: catQuestions.map((item, idx) => ({ id: item.id, order: idx + 1 })),
    })
      .unwrap()
      .then(() => refetchVideoQuestions());
  };

  const handleSelectCategory = (catQuestions: any[], checked: boolean) => {
    const questionIds = catQuestions.map((q: any) => q.id);
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...questionIds])]);
    } else {
      setSelectedIds((prev) => prev.filter((id: number) => !questionIds.includes(id)));
    }
  };

  const handleDeleteClick = (questionId: number) => {
    setSelectedQuestionId(questionId);
    setShowDeleteModal(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingQuestion(null);
    setEditedQuestionText('');
    setEditedCategoryId(undefined);
  };

  const handleEditSave = async () => {
    if (!editingQuestion || isEditSubmitting) return;

    const normalizedQuestion = editedQuestionText.trim();
    if (!normalizedQuestion) {
      showToast({ message: 'Question is required.', type: 'error' });
      return;
    }

    if (!editedCategoryId) {
      showToast({ message: 'Category is required.', type: 'error' });
      return;
    }

    setIsEditSubmitting(true);
    try {
      const response = await editAiInterviewQuestion({
        questionID: editingQuestion.id,
        interviewRoundId: Number(activeInterviewRoundId),
        categoryId: editedCategoryId,
        question: normalizedQuestion,
      }).unwrap();

      if (response?.status) {
        showToast({
          message: get(response, 'message', 'Question updated successfully'),
          type: 'success',
        });
        closeEditModal();
        refetchVideoQuestions();
      } else {
        showToast({
          message: get(response, 'message', 'Failed to update question'),
          type: 'error',
        });
      }
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Something went wrong while updating'),
        type: 'error',
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col gap-6 py-4">
        {(isLoadingVideoQuestions ||
          isFetchingVideoQuestions ||
          isLoadingRounds ||
          isGenerating ||
          isUploadingExcel ||
          isDownloadingTemplate ||
          isDeleteInProgress ||
          isEditSubmitting ||
          isInlineSubmitting) && <Loader />}

        <div className="flex justify-between items-center bg-[#E7E4E4] border border-[var(--border)] px-6 py-4 rounded-full">
          <div className="flex items-center gap-4">
            <Typography variant="h5" className="text-gray-800 m-0">
              Video Questions
            </Typography>
            {videoRounds.length > 0 && (
              <div className="border border-[var(--border)] px-4 py-0.5 w-60 shrink-0 rounded-3xl bg-white">
                <Select
                  value={activeInterviewRoundId ?? undefined}
                  onChange={(val) => {
                    setSelectedRoundId(val);
                    setSelectedIds([]);
                  }}
                  className="w-full custom-select placeholder-style border-none shadow-none"
                  placeholder="Select AI Video Interview"
                >
                  {videoRounds.map((r) => (
                    <Option key={r.id} value={r.id}>
                      {r.uniqueRoundIdentifier}
                    </Option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>

        <UploadAndGenerateHeader
          description="Use the controls below to import questions via Excel, auto-generate default questions, or manually add questions scoped to their specific categories."
          onGenerate={() => {
            const hasNoQuestions = categoryBlocks.every((block) => block.questions.length === 0);
            if (hasNoQuestions) {
              void handleGenerateDefaultQuestions('REPLACE');
            } else {
              setShowGenerateConsentModal(true);
            }
          }}
          onUpload={handleFileUpload}
          onDownloadTemplate={handleDownloadTemplate}
          uploadedFileName={uploadedFileName}
          importedCount={importedCount}
          failedCount={skippedCount}
          warnings={warnings.map((reason) => ({ type: 'error' as const, reason }))}
          onClearDetails={() => {
            setUploadedFileName('');
            setWarnings([]);
          }}
          isGenerating={isGenerating}
          isUploading={isUploadingExcel}
          isDownloading={isDownloadingTemplate}
        />

        <div className="flex flex-col gap-6">
          {categoryBlocks.map((block) => (
            <CategoryQuestionBlock
              key={block.id}
              categoryId={block.id}
              title={block.title}
              questions={block.questions}
              selectedIds={selectedIds}
              onSelectCategory={(checked) => handleSelectCategory(block.questions, checked)}
              onSelectOne={(qId, checked) =>
                setSelectedIds((prev) =>
                  checked ? [...prev, qId] : prev.filter((item) => item !== qId)
                )
              }
              onDrop={(fromIdx, toIdx) => handleDrop(block.id, fromIdx, toIdx)}
              onDeleteCategory={() => {
                setActiveDeleteCategoryId(block.id);
                setShowDeleteModal(true);
              }}
              onEdit={(q) => {
                setEditingQuestion(q);
                setEditedQuestionText(q.question);
                setEditedCategoryId(q.categoryId);
                setIsEditModalOpen(true);
              }}
              onDelete={handleDeleteClick}
              inlineText={inlineTexts[block.id] || ''}
              onInlineChange={(val) => setInlineTexts((prev) => ({ ...prev, [block.id]: val }))}
              onInlineSubmit={() => handleInlineSubmit(block.id)}
              isInlineSubmitting={isInlineSubmitting}
              isLoading={isLoadingVideoQuestions || isFetchingVideoQuestions}
            />
          ))}
        </div>

        {showDeleteModal && (
          <ConfirmationModal
            onClose={() => {
              if (!isDeleteInProgress) {
                setShowDeleteModal(false);
                setSelectedQuestionId(null);
                setActiveDeleteCategoryId(null);
              }
            }}
            title={activeDeleteCategoryId !== null ? 'Delete questions?' : 'Delete question?'}
            onConfirm={confirmDelete}
            confirmText="Delete"
            isLoading={isDeleteInProgress}
          />
        )}
        <QuestionFormModal
          open={isEditModalOpen}
          title="Update Question"
          roundName={activeRoundName}
          categoryId={editedCategoryId}
          questionText={editedQuestionText}
          submitLabel="Save"
          isSubmitting={isEditSubmitting}
          isCategoryLoading={categoryLoading}
          categoryOptions={categoryOptions}
          onCategoryChange={setEditedCategoryId}
          onQuestionChange={setEditedQuestionText}
          onSubmit={handleEditSave}
          onClose={closeEditModal}
          disableSubmit={!editedQuestionText.trim() || !editedCategoryId}
          placeholder="Enter question"
          showCount
        />
        <GenerateQuestionsConsentModal
          open={showGenerateConsentModal}
          onClose={() => setShowGenerateConsentModal(false)}
          onConfirm={handleGenerateDefaultQuestions}
          isLoading={isGenerating}
          showQuestionCount={false}
        />
        <div className="mt-6 flex justify-center">
          <Button
            className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
            onClick={() => {
              navigate(
                pathname.includes('/edit/') && id
                  ? `/jobs/edit/${id}/scoring-criteria`
                  : `/scoring-criteria`
              );
              dispatch(stopStream());
            }}
          >
            Save & Next
          </Button>
        </div>
        <Outlet />
      </div>
    </DndProvider>
  );
};

export default VideoQuestionsSetup;
