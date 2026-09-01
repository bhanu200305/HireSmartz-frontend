import React, { useEffect, useMemo, useState } from 'react';
import { MdDelete } from 'react-icons/md';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import {
  useListInterviewQuestionsQuery,
  useCreateInterviewQuestionMutation,
  useUpdateInterviewQuestionMutation,
  useDeleteInterviewQuestionMutation,
  InterviewQuestion,
} from '../../api/organization-service/Tenants/interviewQuestions';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

const MAX_QUESTIONS = 8;

/**
 * This tenant's own "Intake Questions" — its HR/interpersonal question set,
 * asked in a candidate's first-round intake call. Live-inherits the Super
 * Admin's current platform default until this tenant has none of its own —
 * the first add, edit, or delete here forks an independent copy that then
 * stops tracking further platform-side changes (see organization-service's
 * `ListJobQuestionsUseCase`/`_job_question_fork.py`). Backed by
 * `/v1/tenants/{tenant_id}/audio-questions` (POST/PATCH/DELETE) — a
 * question can be added back up to `MAX_QUESTIONS`, so trimming the set
 * below the platform default isn't a one-way trip. Still no bulk replace
 * and no AI-suggestion endpoint, so neither control is offered — the SET's
 * starting composition is still the Super Admin's call
 * (CompanySettings/IntakeQuestionsTab.tsx), this just lets a Company Admin
 * refill their own copy after trimming it.
 */
const InterviewQuestionsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useListInterviewQuestionsQuery(tenantId);
  const [createQuestion, { isLoading: isCreating }] = useCreateInterviewQuestionMutation();
  const [updateQuestion, { isLoading: isSaving }] = useUpdateInterviewQuestionMutation();
  const [deleteQuestion] = useDeleteInterviewQuestionMutation();
  // The backend gates create/update/delete on this same tab behind one
  // permission string (`interview:write`, see routers.py's
  // `create_job_question`/`update_job_question`/`delete_job_question`) —
  // `INTERVIEW_QUESTIONS_EDIT` is the constant mapped to it.
  const canCreate = useHasAccess(Authorities.INTERVIEW_QUESTIONS_EDIT);
  const canUpdate = useHasAccess(Authorities.INTERVIEW_QUESTIONS_UPDATE);
  const canDelete = useHasAccess(Authorities.INTERVIEW_QUESTIONS_DELETE);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<InterviewQuestion | null>(null);
  const [newQuestionText, setNewQuestionText] = useState('');

  useEffect(() => {
    if (data) {
      setDrafts(Object.fromEntries(data.questions.map((q) => [q.question_id, q.question_text])));
    }
  }, [data]);

  const handleSave = async (question: InterviewQuestion) => {
    const text = (drafts[question.question_id] ?? '').trim();
    if (!text) {
      showToast({ message: 'Question text cannot be empty.', type: 'error' });
      return;
    }
    setSavingId(question.question_id);
    try {
      await updateQuestion({
        tenantId,
        questionId: question.question_id,
        question_text: text,
      }).unwrap();
      showToast({ message: 'Question updated.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to update question.'), type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!questionToDelete) return;
    try {
      await deleteQuestion({ tenantId, questionId: questionToDelete.question_id }).unwrap();
      showToast({ message: 'Question removed.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to remove question.'), type: 'error' });
    } finally {
      setQuestionToDelete(null);
    }
  };

  const questions = useMemo(() => data?.questions ?? [], [data]);
  const atCap = questions.length >= MAX_QUESTIONS;

  const handleAdd = async () => {
    const text = newQuestionText.trim();
    if (!text) return;
    if (atCap) {
      showToast({ message: `You can only have up to ${MAX_QUESTIONS} questions.`, type: 'error' });
      return;
    }
    try {
      await createQuestion({ tenantId, question_text: text }).unwrap();
      showToast({ message: 'Question added.', type: 'success' });
      setNewQuestionText('');
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to add question.'), type: 'error' });
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <Typography variant="h5" className="m-0">
          Intake Questions
        </Typography>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            atCap ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {questions.length}/{MAX_QUESTIONS}
        </span>
      </div>
      <Typography variant="body2" className="mb-6 block">
        Your HR/interpersonal question set, asked in every candidate&apos;s first-round intake call.
        Edit the wording below — changes to one question save independently. Set by CareerForcePro
        by default; once you add, edit, or remove a question here, this becomes your company&apos;s
        own independent set.
      </Typography>

      {questions.length === 0 ? (
        <div className="p-6 text-gray-500 text-center border border-dashed rounded-xl">
          No interview questions set up yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((question) => {
            const draft = drafts[question.question_id] ?? '';
            const isDirty = draft.trim() !== question.question_text.trim();
            return (
              <div key={question.question_id} className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [question.question_id]: e.target.value }))
                  }
                  className="flex-1"
                />
                {canUpdate && (
                  <Button
                    className="rounded-full border border-gray-300 px-4 py-1.5 whitespace-nowrap"
                    onClick={() => handleSave(question)}
                    disabled={!isDirty || (isSaving && savingId === question.question_id)}
                  >
                    {isSaving && savingId === question.question_id ? 'Saving…' : 'Save'}
                  </Button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    aria-label="Remove question"
                    className="p-2 hover:bg-gray-100 rounded-full"
                    onClick={() => setQuestionToDelete(question)}
                  >
                    <MdDelete className="text-red-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canCreate && (
        <div className="flex items-center gap-2 mt-3">
          <Input
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            placeholder={atCap ? `Maximum of ${MAX_QUESTIONS} reached` : 'Add a question…'}
            disabled={atCap}
            className="flex-1"
          />
          <Button
            className="rounded-full border border-gray-300 px-4 py-1.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => void handleAdd()}
            disabled={!newQuestionText.trim() || atCap || isCreating}
          >
            {isCreating ? 'Adding…' : 'Add'}
          </Button>
        </div>
      )}

      {questionToDelete && (
        <ConfirmationModal
          title={`Remove "${questionToDelete.question_text}"?`}
          confirmText="REMOVE"
          onConfirm={handleDelete}
          onClose={() => setQuestionToDelete(null)}
        />
      )}
    </div>
  );
};

export default InterviewQuestionsTab;
