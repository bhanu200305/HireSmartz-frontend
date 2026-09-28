import React, { useMemo, useState } from 'react';
import { Select } from 'antd';
import { MdCheck } from 'react-icons/md';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
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
  isOpen: boolean;
  onToggle: () => void;
};

type FieldOption = { value: string; label: string };

const QuestionRow: React.FC<{
  question: JobIntakeQuestion;
  canManage: boolean;
  fieldOptions: FieldOption[];
  onSave: (text: string, fieldId: string | null) => Promise<void>;
  onDelete: () => Promise<void>;
  onDismissFlag: () => Promise<void>;
}> = ({ question, canManage, fieldOptions, onSave, onDelete, onDismissFlag }) => {
  const [text, setText] = useState(question.question_text);
  const [fieldId, setFieldId] = useState<string | null>(question.field_id);
  const [saving, setSaving] = useState(false);
  const dirty = text.trim() !== question.question_text || fieldId !== question.field_id;
  const flagged = question.is_relevant_to_jd === false;

  return (
    <div>
      <div className="bg-white border border-[var(--border)] px-6 py-3 rounded-full transition-all duration-300 ease-in-out">
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
              <button
                className="text-red-500 hover:text-red-700 cursor-pointer"
                onClick={() => void onDelete()}
                aria-label="Remove question"
              >
                <HiOutlineTrash size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
      {flagged && (
        <div className="mt-2 ml-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="font-medium">Unrelated to this job's JD</div>
          {question.ai_suggested_replacement_text && (
            <div className="mt-1">
              Suggested replacement: "{question.ai_suggested_replacement_text}"
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
                Dismiss flag
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
  isOpen,
  onToggle,
}) => {
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

  const handleImport = async () => {
    try {
      await importQuestions(jobOpeningId).unwrap();
      showToast({ message: 'Company questions imported.', type: 'success' });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to import questions.'),
        type: 'error',
      });
    }
  };

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
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to add question.'),
        type: 'error',
      });
    }
  };

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
            Asked during the candidate's intake call.
          </Typography>
        </div>
        <CollapseToggle open={isOpen} />
      </button>

      {isOpen && (
        <div className="px-6 pb-6">
          {questions.length > 0 && canManage && (
            <div className="flex justify-end mb-4">
              <button
                className="text-primary hover:text-brand-600 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={checkingRelevance}
                onClick={handleCheckRelevance}
              >
                {checkingRelevance ? 'Checking...' : 'Check relevance to JD'}
              </button>
            </div>
          )}

          {isFetching ? (
            <Loader />
          ) : questions.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-gray-400 italic text-sm">
                No intake questions set up for this job yet.
              </p>
              {canManage && (
                <Button
                  className="text-white bg-button rounded-3xl px-6 py-2 mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={importing}
                  onClick={handleImport}
                >
                  {importing ? 'Importing...' : 'Import from Company Questions'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => (
            <QuestionRow
              key={q.job_intake_question_id}
              question={q}
              canManage={canManage}
              fieldOptions={fieldOptions}
              onSave={async (text, fieldId) => {
                try {
                  await updateQuestion({
                    jobOpeningId,
                    questionId: q.job_intake_question_id,
                    question_text: text,
                    field_id: fieldId,
                  }).unwrap();
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

          {canManage && questions.length < 8 && (
            <div className="bg-white border border-dashed border-[var(--border)] px-6 py-3 rounded-full">
              <div className="grid grid-cols-[1fr_11rem_3.25rem] items-center gap-3 w-full">
                <input
                  className="min-w-0 bg-transparent text-sm text-gray-800 focus:outline-none placeholder:text-gray-400"
                  placeholder="Add a question..."
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                />
                <Select
                  className="w-full"
                  placeholder="Resume Field"
                  allowClear
                  options={fieldOptions}
                  value={newQuestionFieldId ?? undefined}
                  onChange={(value) => setNewQuestionFieldId(value ?? null)}
                />
                <div className="flex items-center justify-end">
                  <button
                    className="text-primary hover:text-brand-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={creating || !newQuestionText.trim()}
                    onClick={handleAdd}
                    aria-label="Add question"
                  >
                    <HiOutlinePlus size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobIntakeQuestionsSection;
