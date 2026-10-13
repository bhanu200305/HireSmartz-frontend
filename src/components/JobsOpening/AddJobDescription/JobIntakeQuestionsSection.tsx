import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Select, Tooltip } from 'antd';
import { MdCheck, MdClose, MdEdit, MdInfoOutline, MdOutlineFlag } from 'react-icons/md';
import { HiOutlineTrash } from 'react-icons/hi';
import { Button, Typography, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import CollapseToggle from '../../shared/ui/CollapseToggle';
import {
  useGetJobIntakeQuestionsQuery,
  useImportJobIntakeQuestionsMutation,
  useCreateJobIntakeQuestionMutation,
  useUpdateJobIntakeQuestionMutation,
  useDismissJobIntakeQuestionFlagMutation,
  useDeleteJobIntakeQuestionMutation,
  useCheckJobIntakeQuestionsRelevanceMutation,
  type JobIntakeQuestion,
} from '../../../api/job-service/JobOpening/jobQuestions';
import { useListResumeTemplateFieldsQuery } from '../../../api/organization-service/resumeTemplateFields';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';

type Props = {
  jobOpeningId: string;
  canManage: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  /** Renders just the body (no card/accordion header) for a host that supplies its own. */
  embedded?: boolean;
  /** Reports whether an edit or a typed question is still waiting to be saved. */
  onUnsavedChange?: (hasUnsaved: boolean) => void;
  /** The company has no intake questions in its settings, so there was nothing to copy. */
  companyHasNoQuestions?: boolean;
};

type FieldOption = { value: string; label: string };

const JdFlagsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  flaggedQuestions: JobIntakeQuestion[];
  canManage: boolean;
  onUseSuggestion: (questionId: string, suggestionText: string) => Promise<void>;
  onDismissFlag: (questionId: string) => Promise<void>;
}> = ({ open, onClose, flaggedQuestions, canManage, onUseSuggestion, onDismissFlag }) => {
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || flaggedQuestions.length > 0) return;
    const timer = setTimeout(onClose, 1500);
    return () => clearTimeout(timer);
  }, [open, flaggedQuestions.length, onClose]);

  if (!open) return null;

  const setbusy = (id: string, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });

  const handleUseSuggestion = async (q: JobIntakeQuestion) => {
    if (!q.ai_suggested_replacement_text) return;
    setbusy(q.job_intake_question_id, true);
    try {
      await onUseSuggestion(q.job_intake_question_id, q.ai_suggested_replacement_text);
    } finally {
      setbusy(q.job_intake_question_id, false);
    }
  };

  const handleDismiss = async (q: JobIntakeQuestion) => {
    setbusy(q.job_intake_question_id, true);
    try {
      await onDismissFlag(q.job_intake_question_id);
    } finally {
      setbusy(q.job_intake_question_id, false);
    }
  };

  return (
    <div
      className="app-modal-overlay fixed inset-0 flex items-center justify-center bg-black/60 z-[2000] p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#FAFAFA] rounded-3xl shadow-2xl max-w-2xl w-full relative border border-gray-200 overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <Typography variant="h5" className="text-gray-800 m-0 font-semibold font-sora">
                Flagged Questions
              </Typography>
              {flaggedQuestions.length > 0 && (
                <Typography variant="body2" className="text-gray-500 m-0 mt-0.5">
                  {flaggedQuestions.length === 1
                    ? `1 question is unrelated to this job’s JD`
                    : `${flaggedQuestions.length} questions are unrelated to this job’s JD`}
                </Typography>
              )}
            </div>
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 cursor-pointer transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              onClick={onClose}
              aria-label="Close"
            >
              <MdClose size={22} />
            </button>
          </div>

          {/* Flagged question list */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {flaggedQuestions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-700 font-medium m-0">
                  All flags have been resolved.
                </p>
                <p className="text-xs text-gray-400 m-0 mt-1">Closing automatically…</p>
              </div>
            ) : (
              flaggedQuestions.map((q) => {
                const isBusy = busyIds.has(q.job_intake_question_id);
                return (
                  <div
                    key={q.job_intake_question_id}
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  >
                    <p className="font-semibold text-gray-800 m-0 mb-1">{q.question_text}</p>
                    <p className="m-0 text-amber-700 font-medium text-xs mb-1">
                      Unrelated to this job&apos;s JD
                    </p>
                    {q.ai_suggested_replacement_text && (
                      <p className="m-0 text-amber-800 text-xs">
                        Suggested replacement: &quot;{q.ai_suggested_replacement_text}&quot;
                      </p>
                    )}
                    {canManage && (
                      <div className="mt-2 flex gap-4 items-center">
                        {q.ai_suggested_replacement_text && (
                          <button
                            type="button"
                            disabled={isBusy}
                            className="text-primary hover:text-brand-600 text-sm font-medium cursor-pointer disabled:opacity-50"
                            onClick={() => void handleUseSuggestion(q)}
                          >
                            {isBusy ? 'Saving...' : 'Use suggestion'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isBusy}
                          className="text-neutral-600 hover:text-neutral-800 text-sm cursor-pointer disabled:opacity-50"
                          onClick={() => void handleDismiss(q)}
                        >
                          {isBusy ? 'Dismissing...' : 'Dismiss Flag'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-5">
            <Button
              type="button"
              onClick={onClose}
              className="min-h-10 border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 py-2 px-6 rounded-3xl cursor-pointer text-sm font-semibold transition"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuestionRow: React.FC<{
  question: JobIntakeQuestion;
  canManage: boolean;
  fieldOptions: FieldOption[];
  onSave: (text: string, fieldId: string | null) => Promise<void>;
  onDelete: () => Promise<void>;
  onDismissFlag: () => Promise<void>;
  setRowDirty: (questionId: string, dirty: boolean) => void;
}> = ({ question, canManage, fieldOptions, onSave, onDelete, onDismissFlag, setRowDirty }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(question.question_text);
  const [fieldId, setFieldId] = useState<string | null>(question.field_id);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Tracks whether Escape was pressed so the subsequent blur doesn't save.
  const escapedRef = useRef(false);
  const questionId = question.job_intake_question_id;
  const dirty = text.trim() !== question.question_text || fieldId !== question.field_id;
  const flagged = question.is_relevant_to_jd === false;

  useEffect(() => {
    setRowDirty(questionId, isEditing && dirty);
    return () => setRowDirty(questionId, false);
  }, [isEditing, dirty, questionId, setRowDirty]);

  const startEdit = () => {
    setText(question.question_text);
    setFieldId(question.field_id);
    escapedRef.current = false;
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cancelEdit = () => {
    setText(question.question_text);
    setFieldId(question.field_id);
    setIsEditing(false);
  };

  const saveText = async (value: string) => {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(value.trim(), fieldId);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = async (value: string | undefined) => {
    const newFieldId = value ?? null;
    setFieldId(newFieldId);
    setSaving(true);
    try {
      await onSave(question.question_text, newFieldId);
    } finally {
      setSaving(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (escapedRef.current) {
      escapedRef.current = false;
      return;
    }
    const related = e.relatedTarget as HTMLElement | null;
    // If focus moved to delete, cancel instead of saving.
    if (related?.getAttribute('aria-label') === 'Remove question') {
      cancelEdit();
      return;
    }
    const trimmed = text.trim();
    const textChanged = trimmed !== question.question_text;
    const fieldChanged = fieldId !== question.field_id;
    if (trimmed && (textChanged || fieldChanged)) {
      void saveText(trimmed);
    } else {
      cancelEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      escapedRef.current = true;
      cancelEdit();
    }
  };

  return (
    <div>
      <div className="bg-white border border-[var(--border)] px-4 py-2 rounded-2xl transition-all duration-200">
        {isEditing ? (
          <div className="grid grid-cols-[1fr_11rem_auto] items-center gap-3 w-full">
            <input
              ref={inputRef}
              className="min-w-0 rounded-lg border border-primary-200 bg-[#fff7f0] px-3 py-1 text-sm text-gray-800 focus:border-primary focus:outline-none disabled:opacity-60"
              value={text}
              disabled={saving}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
            <Select
              className="w-full"
              placeholder="Resume Field"
              allowClear
              disabled={saving}
              options={fieldOptions}
              value={fieldId ?? undefined}
              onChange={(value) => setFieldId(value ?? null)}
            />
            <div className="flex shrink-0 items-center gap-2">
              <Tooltip title="Save (Enter)">
                <button
                  type="button"
                  aria-label="Save edit"
                  className="cursor-pointer text-primary hover:text-brand-600 disabled:opacity-40"
                  disabled={saving}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const trimmed = text.trim();
                    const textChanged = trimmed !== question.question_text;
                    const fieldChanged = fieldId !== question.field_id;
                    if (trimmed && (textChanged || fieldChanged)) {
                      void saveText(trimmed);
                    } else {
                      cancelEdit();
                    }
                  }}
                >
                  <MdCheck size={18} />
                </button>
              </Tooltip>
              <Tooltip title="Discard (Esc)">
                <button
                  type="button"
                  aria-label="Discard edit"
                  className="cursor-pointer text-gray-400 hover:text-red-500 disabled:opacity-40"
                  disabled={saving}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={cancelEdit}
                >
                  <MdClose size={18} />
                </button>
              </Tooltip>
              <Tooltip title="Remove Question">
                <button
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                  onClick={() => void onDelete()}
                  aria-label="Remove question"
                >
                  <HiOutlineTrash size={18} />
                </button>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_11rem_auto] items-center gap-3 w-full">
            <span
              className="min-w-0 text-sm text-gray-800 leading-normal cursor-pointer hover:text-primary"
              onClick={canManage ? startEdit : undefined}
            >
              {question.question_text}
            </span>
            <Select
              className="w-full"
              placeholder="Resume Field"
              allowClear
              disabled={!canManage || saving}
              options={fieldOptions}
              value={fieldId ?? undefined}
              onChange={handleFieldChange}
            />
            {canManage && (
              <div className="flex shrink-0 items-center gap-2">
                <Tooltip title="Edit Question">
                  <button
                    className="text-primary hover:text-brand-600 cursor-pointer"
                    onClick={startEdit}
                    aria-label="Edit question"
                  >
                    <MdEdit size={18} />
                  </button>
                </Tooltip>
                <Tooltip title="Remove Question">
                  <button
                    className="text-red-500 hover:text-red-700 cursor-pointer"
                    onClick={() => void onDelete()}
                    aria-label="Remove question"
                  >
                    <HiOutlineTrash size={18} />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>
      {flagged && (
        <div className="mt-2 ml-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="font-medium">Unrelated to this job&apos;s JD</div>
          {question.ai_suggested_replacement_text && (
            <div className="mt-1">
              Suggested replacement: &quot;{question.ai_suggested_replacement_text}&quot;
            </div>
          )}
          {canManage && (
            <div className="mt-2 flex gap-4">
              {question.ai_suggested_replacement_text && (
                <button
                  type="button"
                  className="text-primary hover:text-brand-600 text-sm font-medium cursor-pointer"
                  onClick={() => {
                    setText(question.ai_suggested_replacement_text || text);
                    setIsEditing(true);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                >
                  Use suggestion (then Save)
                </button>
              )}
              <button
                type="button"
                className="text-neutral-600 hover:text-neutral-800 text-sm cursor-pointer"
                onClick={() => void onDismissFlag()}
              >
                Dismiss Flag
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const JobIntakeQuestionsSection: React.FC<Props> = ({
  jobOpeningId,
  canManage,
  isOpen = true,
  onToggle,
  embedded = false,
  onUnsavedChange,
  companyHasNoQuestions = false,
}) => {
  const [dirtyRowIds, setDirtyRowIds] = useState<string[]>([]);
  const [viewFlagsOpen, setViewFlagsOpen] = useState(false);
  const setRowDirty = useCallback((questionId: string, dirty: boolean) => {
    setDirtyRowIds((prev) => {
      const has = prev.includes(questionId);
      if (dirty === has) return prev;
      return dirty ? [...prev, questionId] : prev.filter((id) => id !== questionId);
    });
  }, []);
  const { data, isFetching, isError, refetch } = useGetJobIntakeQuestionsQuery(jobOpeningId, {
    skip: !jobOpeningId,
  });
  const [, { isLoading: importing }] = useImportJobIntakeQuestionsMutation();
  const [createQuestion, { isLoading: creating }] = useCreateJobIntakeQuestionMutation();
  const [updateQuestion] = useUpdateJobIntakeQuestionMutation();
  const [dismissFlag] = useDismissJobIntakeQuestionFlagMutation();
  const [deleteQuestion] = useDeleteJobIntakeQuestionMutation();
  const [checkRelevance, { isLoading: checkingRelevance }] =
    useCheckJobIntakeQuestionsRelevanceMutation();
  const [copiedNothing] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionFieldId, setNewQuestionFieldId] = useState<string | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const prevQuestionsLengthRef = useRef(0);
  const { data: fieldsData } = useListResumeTemplateFieldsQuery();
  const fieldOptions: FieldOption[] = useMemo(
    () => (fieldsData?.fields ?? []).map((f) => ({ value: f.field_id, label: f.field_label })),
    [fieldsData]
  );

  const questions = useMemo(() => data?.questions ?? [], [data?.questions]);
  const flaggedQuestions = useMemo(
    () => questions.filter((q) => q.is_relevant_to_jd === false),
    [questions]
  );

  useEffect(() => {
    if (questions.length > prevQuestionsLengthRef.current && listContainerRef.current) {
      listContainerRef.current.scrollTop = listContainerRef.current.scrollHeight;
    }
    prevQuestionsLengthRef.current = questions.length;
  }, [questions.length]);

  const hasUnsaved = dirtyRowIds.length > 0 || newQuestionText.trim().length > 0;
  useEffect(() => {
    onUnsavedChange?.(hasUnsaved);
    return () => onUnsavedChange?.(false);
  }, [hasUnsaved, onUnsavedChange]);

  // const handleImport = async () => {
  //   try {
  //     const result = await importQuestions(jobOpeningId).unwrap();
  //     setCopiedNothing(result.questions.length === 0);
  //   } catch (err) {
  //     showToast({
  //       message: getJobErrorMessage(err, 'Failed to import intake questions.'),
  //       type: 'error',
  //     });
  //   }
  // };

  const handleCheckRelevance = async () => {
    try {
      await checkRelevance(jobOpeningId).unwrap();
      showToast({ message: 'Relevance check complete.', type: 'success' });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Relevance check failed - try again.'),
        type: 'error',
      });
    }
  };

  const handleAdd = async () => {
    const text = newQuestionText.trim();
    if (!text) return;
    try {
      await createQuestion({
        jobOpeningId,
        question_text: text,
        field_id: newQuestionFieldId,
      }).unwrap();
      setNewQuestionText('');
      setNewQuestionFieldId(null);
      showToast({ message: 'Intake question added', type: 'success' });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to add question.'),
        type: 'error',
      });
    }
  };

  const body = (
    <div className={embedded ? '' : 'px-6 pb-6'}>
      {(embedded || (questions.length > 0 && canManage)) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {embedded && (
            <>
              <Typography variant="subtitle1" className="m-0 font-bold text-gray-900">
                Intake Call Questions
              </Typography>
              <Tooltip title="Asked during the candidate's intake call, before any interview round.">
                <MdInfoOutline className="text-gray-400" size={15} />
              </Tooltip>
            </>
          )}
          {questions.length > 0 && canManage && (
            <div className="ml-auto flex items-center gap-2">
              <Tooltip title="Flags intake questions that don't fit this job's description.">
                <button
                  className="border border-primary text-primary hover:bg-gray-50 rounded-full px-4 py-1.5 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={checkingRelevance}
                  onClick={handleCheckRelevance}
                >
                  {checkingRelevance ? 'Checking...' : 'Check JD Relevance'}
                </button>
              </Tooltip>
              {flaggedQuestions.length > 0 && (
                <Tooltip title="View questions flagged as unrelated to this job's JD.">
                  <button
                    className="flex items-center gap-1.5 border border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-full px-4 py-1.5 text-sm font-semibold cursor-pointer"
                    onClick={() => setViewFlagsOpen(true)}
                  >
                    <MdOutlineFlag size={15} />
                    View ({flaggedQuestions.length})
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      )}

      {isFetching || importing ? (
        <Loader />
      ) : isError && questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-8 text-center">
          <p className="m-0 text-sm font-semibold text-red-700">Could not load intake questions</p>
          <button
            type="button"
            className="mt-3 rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-gray-50 cursor-pointer"
            onClick={() => void refetch()}
          >
            Try again
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
          <p className="m-0 text-sm font-semibold text-gray-700">No intake questions yet</p>
          <p className="m-0 mt-1 text-sm text-gray-500">
            {canManage
              ? companyHasNoQuestions || copiedNothing
                ? 'Your company has no intake questions in settings yet.'
                : 'Copy your company questions in, or add your own below.'
              : 'No questions have been added for this job.'}
          </p>
          {/* {canManage && (
            <button
              type="button"
              className="mt-3 rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-gray-50 cursor-pointer"
              onClick={() => void handleImport()}
            >
              Copy company questions here
            </button>
          )} */}
        </div>
      ) : (
        <div className="space-y-4">
          <div
            ref={listContainerRef}
            className="max-h-[40vh] min-h-[100px] space-y-3 overflow-y-auto pr-1"
          >
            {questions.map((q) => (
              <QuestionRow
                key={q.job_intake_question_id}
                question={q}
                canManage={canManage}
                fieldOptions={fieldOptions}
                setRowDirty={setRowDirty}
                onSave={async (text, fieldId) => {
                  try {
                    await updateQuestion({
                      jobOpeningId,
                      questionId: q.job_intake_question_id,
                      question_text: text,
                      field_id: fieldId,
                    }).unwrap();
                    showToast({ message: 'Intake question saved', type: 'success' });
                  } catch (err) {
                    showToast({
                      message: getJobErrorMessage(err, 'Failed to save question.'),
                      type: 'error',
                    });
                  }
                }}
                onDelete={async () => {
                  try {
                    await deleteQuestion({
                      jobOpeningId,
                      questionId: q.job_intake_question_id,
                    }).unwrap();
                    showToast({ message: 'Intake question removed', type: 'success' });
                  } catch (err) {
                    showToast({
                      message: getJobErrorMessage(err, 'Failed to remove question.'),
                      type: 'error',
                    });
                  }
                }}
                onDismissFlag={async () => {
                  try {
                    await dismissFlag({
                      jobOpeningId,
                      questionId: q.job_intake_question_id,
                    }).unwrap();
                  } catch (err) {
                    showToast({
                      message: getJobErrorMessage(err, 'Failed to dismiss flag.'),
                      type: 'error',
                    });
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {canManage && questions.length < 8 && !isFetching && !importing && (
        <div className="mt-4 rounded-2xl border border-primary-200 bg-white px-4 py-3 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-gray-800">Add An Intake Question</div>
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_11rem_auto]">
            <input
              className="min-w-0 rounded-xl border border-gray-200 bg-[#fff7f0] px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary focus:outline-none"
              placeholder="Type a question..."
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Select
              className="w-full"
              placeholder="Resume Field"
              allowClear
              options={fieldOptions}
              value={newQuestionFieldId ?? undefined}
              onChange={(value) => setNewQuestionFieldId(value ?? null)}
            />
            <Button
              type="button"
              className="rounded-full bg-button px-5 py-1.5 text-sm font-semibold text-white"
              disabled={creating || !newQuestionText.trim()}
              onClick={handleAdd}
            >
              Add
            </Button>
          </div>
          <p className="m-0 mt-2 text-xs text-gray-400">{questions.length} of 8 intake questions</p>
        </div>
      )}
    </div>
  );

  const flagsModal = (
    <JdFlagsModal
      open={viewFlagsOpen}
      onClose={() => setViewFlagsOpen(false)}
      flaggedQuestions={flaggedQuestions}
      canManage={canManage}
      onUseSuggestion={async (questionId, suggestionText) => {
        try {
          await updateQuestion({
            jobOpeningId,
            questionId,
            question_text: suggestionText,
            field_id:
              questions.find((q) => q.job_intake_question_id === questionId)?.field_id ?? null,
          }).unwrap();
          showToast({ message: 'Question updated with suggestion', type: 'success' });
        } catch (err) {
          showToast({
            message: getJobErrorMessage(err, 'Failed to update question.'),
            type: 'error',
          });
        }
      }}
      onDismissFlag={async (questionId) => {
        try {
          await dismissFlag({ jobOpeningId, questionId }).unwrap();
        } catch (err) {
          showToast({
            message: getJobErrorMessage(err, 'Failed to dismiss flag.'),
            type: 'error',
          });
        }
      }}
    />
  );

  if (embedded)
    return (
      <>
        {body}
        {flagsModal}
      </>
    );

  return (
    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer"
        aria-expanded={isOpen}
      >
        <div>
          <Typography variant="subtitle1" className="font-bold text-gray-800 m-0">
            Intake Call Questions
          </Typography>
          <Typography variant="body2" className="text-gray-500 m-0">
            Asked during the candidate&apos;s intake call.
          </Typography>
        </div>
        <CollapseToggle open={isOpen} />
      </button>
      {isOpen && body}
      {flagsModal}
    </div>
  );
};

export default JobIntakeQuestionsSection;
