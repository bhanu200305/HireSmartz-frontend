import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Select, Tooltip } from 'antd';
import { MdCheck, MdInfoOutline } from 'react-icons/md';
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
};

type FieldOption = { value: string; label: string };

const QuestionRow: React.FC<{
  question: JobIntakeQuestion;
  canManage: boolean;
  fieldOptions: FieldOption[];
  onSave: (text: string, fieldId: string | null) => Promise<void>;
  onDelete: () => Promise<void>;
  onDismissFlag: () => Promise<void>;
  setRowDirty: (questionId: string, dirty: boolean) => void;
}> = ({ question, canManage, fieldOptions, onSave, onDelete, onDismissFlag, setRowDirty }) => {
  const [text, setText] = useState(question.question_text);
  const [fieldId, setFieldId] = useState<string | null>(question.field_id);
  const [saving, setSaving] = useState(false);
  const dirty = text.trim() !== question.question_text || fieldId !== question.field_id;
  const questionId = question.job_intake_question_id;

  useEffect(() => {
    setRowDirty(questionId, dirty);
    return () => setRowDirty(questionId, false);
  }, [dirty, questionId, setRowDirty]);
  const flagged = question.is_relevant_to_jd === false;

  return (
    <div>
      <div className="bg-white border border-[var(--border)] px-4 py-3 rounded-2xl transition-all duration-300 ease-in-out">
        <div className="grid grid-cols-[1fr_11rem_3.25rem] items-center gap-3 w-full">
          <input
            className="min-w-0 bg-transparent text-sm text-gray-800 focus:outline-none disabled:text-gray-500"
            value={text}
            disabled={!canManage}
            onChange={(e) => setText(e.target.value)}
          />
          <Select
            className="w-full"
            placeholder="Resume Field"
            allowClear
            disabled={!canManage}
            options={fieldOptions}
            value={fieldId ?? undefined}
            onChange={(value) => setFieldId(value ?? null)}
          />
          {canManage && (
            <div className="flex items-center justify-end gap-3">
              <Tooltip title="Save Changes">
                <button
                  className="text-primary hover:text-brand-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={!dirty || saving || !text.trim()}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await onSave(text.trim(), fieldId);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  aria-label="Save question"
                >
                  <MdCheck size={18} />
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
                  onClick={() => setText(question.ai_suggested_replacement_text || text)}
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
}) => {
  const [dirtyRowIds, setDirtyRowIds] = useState<string[]>([]);
  const setRowDirty = useCallback((questionId: string, dirty: boolean) => {
    setDirtyRowIds((prev) => {
      const has = prev.includes(questionId);
      if (dirty === has) return prev;
      return dirty ? [...prev, questionId] : prev.filter((id) => id !== questionId);
    });
  }, []);
  const { data, isFetching } = useGetJobIntakeQuestionsQuery(jobOpeningId, {
    skip: !jobOpeningId,
  });
  const [importQuestions, { isLoading: importing }] = useImportJobIntakeQuestionsMutation();
  const [createQuestion, { isLoading: creating }] = useCreateJobIntakeQuestionMutation();
  const [updateQuestion] = useUpdateJobIntakeQuestionMutation();
  const [dismissFlag] = useDismissJobIntakeQuestionFlagMutation();
  const [deleteQuestion] = useDeleteJobIntakeQuestionMutation();
  const [checkRelevance, { isLoading: checkingRelevance }] =
    useCheckJobIntakeQuestionsRelevanceMutation();
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionFieldId, setNewQuestionFieldId] = useState<string | null>(null);
  const { data: fieldsData } = useListResumeTemplateFieldsQuery();
  const fieldOptions: FieldOption[] = useMemo(
    () => (fieldsData?.fields ?? []).map((f) => ({ value: f.field_id, label: f.field_label })),
    [fieldsData]
  );

  const questions = data?.questions ?? [];

  const hasUnsaved = dirtyRowIds.length > 0 || newQuestionText.trim().length > 0;
  useEffect(() => {
    onUnsavedChange?.(hasUnsaved);
    return () => onUnsavedChange?.(false);
  }, [hasUnsaved, onUnsavedChange]);

  // Auto-imports once per job when there's nothing here yet.
  const hasAutoImportedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!jobOpeningId || !canManage || isFetching) return;
    if (questions.length > 0) return;
    if (hasAutoImportedRef.current === jobOpeningId) return;
    hasAutoImportedRef.current = jobOpeningId;
    importQuestions(jobOpeningId)
      .unwrap()
      .catch((err) => {
        showToast({
          message: getJobErrorMessage(err, 'Failed to import questions.'),
          type: 'error',
        });
      });
  }, [jobOpeningId, canManage, isFetching, questions.length, importQuestions]);

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
            <Tooltip title="Flags intake questions that don't fit this job's description.">
              <button
                className="ml-auto border border-primary text-primary hover:bg-gray-50 rounded-full px-4 py-1.5 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={checkingRelevance}
                onClick={handleCheckRelevance}
              >
                {checkingRelevance ? 'Checking...' : 'Check JD Relevance'}
              </button>
            </Tooltip>
          )}
        </div>
      )}

      {isFetching || importing ? (
        <Loader />
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
          <p className="m-0 text-sm font-semibold text-gray-700">No intake questions yet</p>
          <p className="m-0 mt-1 text-sm text-gray-500">
            Company questions are copied in automatically when available.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-h-[40vh] min-h-[100px] space-y-3 overflow-y-auto pr-1">
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
              className="min-w-0 rounded-xl border border-gray-200 bg-[#F6F8FD] px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary focus:outline-none"
              placeholder="Type a question..."
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
            />
            <Tooltip title="Which resume field this answer fills in (optional).">
              <Select
                className="w-full"
                placeholder="Resume Field"
                allowClear
                options={fieldOptions}
                value={newQuestionFieldId ?? undefined}
                onChange={(value) => setNewQuestionFieldId(value ?? null)}
              />
            </Tooltip>
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

  if (embedded) return body;

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
    </div>
  );
};

export default JobIntakeQuestionsSection;
