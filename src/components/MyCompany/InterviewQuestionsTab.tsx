import React, { useEffect, useState } from 'react';
import { MdDelete } from 'react-icons/md';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import {
  useListInterviewQuestionsQuery,
  useUpdateInterviewQuestionMutation,
  useDeleteInterviewQuestionMutation,
  InterviewQuestion,
} from '../../api/organization-service/Tenants/interviewQuestions';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

/**
 * This tenant's own "Intake Questions" — its HR/interpersonal question set,
 * asked in a candidate's first-round intake call. Live-inherits the Super
 * Admin's current platform default until this tenant has none of its own —
 * the first edit or delete here forks an independent copy that then stops
 * tracking further platform-side changes (see organization-service's
 * `ListJobQuestionsUseCase`/`_job_question_fork.py`). Backed by
 * `/v1/tenants/{tenant_id}/audio-questions`, which only supports editing or
 * removing an existing question, one at a time (PATCH/DELETE); there is no
 * endpoint to add a brand new one from here — per the confirmed design, the
 * SET of questions is decided by the Super Admin (CompanySettings/
 * IntakeQuestionsTab.tsx) — and no AI-suggestion endpoint either, so
 * neither control is offered.
 */
const InterviewQuestionsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useListInterviewQuestionsQuery(tenantId);
  const [updateQuestion, { isLoading: isSaving }] = useUpdateInterviewQuestionMutation();
  const [deleteQuestion] = useDeleteInterviewQuestionMutation();
  const canUpdate = useHasAccess(Authorities.INTERVIEW_QUESTIONS_UPDATE);
  const canDelete = useHasAccess(Authorities.INTERVIEW_QUESTIONS_DELETE);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<InterviewQuestion | null>(null);

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

  if (isLoading) return <Loader />;

  const questions = data?.questions ?? [];

  return (
    <div className="p-4">
      <Typography variant="h5" className="mb-1 block">
        Intake Questions
      </Typography>
      <Typography variant="body2" className="mb-6 block">
        Your HR/interpersonal question set, asked in every candidate&apos;s first-round intake
        call. Edit the wording below — changes to one question save independently. Set by
        CareerForcePro by default; once you edit or remove a question here, this becomes your
        company&apos;s own independent set.
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
