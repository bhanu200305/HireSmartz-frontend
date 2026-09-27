import React, { useEffect, useMemo, useState } from 'react';
import { Select, Tooltip } from 'antd';
import { MdDelete, MdOutlineUploadFile } from 'react-icons/md';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import IntakeQuestionsBulkImportModal from '../shared/IntakeQuestionsBulkImportModal';
import {
  useListInterviewQuestionsQuery,
  useCreateInterviewQuestionMutation,
  useUpdateInterviewQuestionMutation,
  useDeleteInterviewQuestionMutation,
  useLazyGetInterviewQuestionsTemplateQuery,
  useBulkImportInterviewQuestionsMutation,
  InterviewQuestion,
} from '../../api/organization-service/Tenants/interviewQuestions';
import { useListResumeTemplateFieldsQuery } from '../../api/organization-service/resumeTemplateFields';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

const MAX_QUESTIONS = 8;

type Draft = { text: string; fieldId: string };

/**
 * This tenant's own "Intake Questions" — its HR/interpersonal question set,
 * asked in a candidate's first-round intake call. Live-inherits the Super
 * Admin's current platform default until this tenant has none of its own —
 * the first add, edit, or delete here forks an independent copy that then
 * stops tracking further platform-side changes (see organization-service's
 * `ListJobQuestionsUseCase`/`_job_question_fork.py`). Backed by
 * `/v1/tenants/{tenant_id}/audio-questions` (POST/PATCH/DELETE) — a
 * question can be added back up to `MAX_QUESTIONS`, so trimming the set
 * below the platform default isn't a one-way trip. `bulk-import` (below)
 * REPLACES the whole set from an uploaded file instead of adding to it —
 * the one non-additive control here. Still no AI-suggestion endpoint.
 *
 * Every question is now required to carry a `field_id` — which
 * ResumeTemplateField (Introduction/Education/Experience/...) its spoken
 * answer is meant to fill in (organization-service migration 0056: NOT
 * NULL, no untagged state exists anywhere). The "Resume Field" picker below
 * is populated from the dual-scope GET /v1/masters/resume-template-fields
 * (resumeTemplateFields.ts) — the platform-only version of that endpoint
 * refuses a tenant token outright.
 */
const InterviewQuestionsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useListInterviewQuestionsQuery(tenantId);
  const { data: fieldsData, isLoading: isLoadingFields } = useListResumeTemplateFieldsQuery();
  const [createQuestion, { isLoading: isCreating }] = useCreateInterviewQuestionMutation();
  const [updateQuestion, { isLoading: isSaving }] = useUpdateInterviewQuestionMutation();
  const [deleteQuestion] = useDeleteInterviewQuestionMutation();
  const [triggerGetTemplate] = useLazyGetInterviewQuestionsTemplateQuery();
  const [bulkImportQuestions] = useBulkImportInterviewQuestionsMutation();
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  // The backend gates create/update/delete on this same tab behind one
  // permission string (`interview:write`, see routers.py's
  // `create_job_question`/`update_job_question`/`delete_job_question`) —
  // `INTERVIEW_QUESTIONS_EDIT` is the constant mapped to it.
  const canCreate = useHasAccess(Authorities.INTERVIEW_QUESTIONS_EDIT);
  const canUpdate = useHasAccess(Authorities.INTERVIEW_QUESTIONS_UPDATE);
  const canDelete = useHasAccess(Authorities.INTERVIEW_QUESTIONS_DELETE);

  const fields = useMemo(() => fieldsData?.fields ?? [], [fieldsData]);
  const fieldOptions = useMemo(
    () => fields.map((f) => ({ value: f.field_id, label: f.field_label })),
    [fields]
  );
  // Resume-field display order (Introduction, Education, Experience, ...) —
  // organization-service's own seed for `order_index` (migration 0051), not
  // re-declared here so this can never drift from what Super Admin actually
  // configures. A question whose field isn't in this map yet (fields still
  // loading, or a legacy untagged row) sorts last rather than disappearing.
  const fieldOrderById = useMemo(() => {
    const map = new Map<string, number>();
    fields.forEach((f) => map.set(f.field_id, f.order_index));
    return map;
  }, [fields]);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<InterviewQuestion | null>(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionFieldId, setNewQuestionFieldId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      setDrafts(
        Object.fromEntries(
          data.questions.map((q) => [
            q.question_id,
            // `q.field_id` can be null (a legacy question predating this
            // field) — the picker below already renders '' as "unassigned"
            // via its own `|| undefined` fallback, and Save is blocked
            // until a real one is chosen.
            { text: q.question_text, fieldId: q.field_id ?? '' },
          ])
        )
      );
    }
  }, [data]);

  const handleSave = async (question: InterviewQuestion) => {
    const draft = drafts[question.question_id];
    const text = (draft?.text ?? '').trim();
    if (!text) {
      showToast({ message: 'Question text cannot be empty.', type: 'error' });
      return;
    }
    if (!draft?.fieldId) {
      showToast({ message: 'Pick a resume field for this question.', type: 'error' });
      return;
    }
    setSavingId(question.question_id);
    try {
      await updateQuestion({
        tenantId,
        questionId: question.question_id,
        question_text: text,
        field_id: draft.fieldId,
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

  // Always shown in resume-field order (Introduction, Education, Experience,
  // ...), never insertion order — a manually added question and a bulk-
  // imported one must land in the same place on screen. `data.questions`
  // itself carries whatever order the backend returned it in (creation
  // order for manual adds, file-row order for bulk import), so this is the
  // one place that order gets normalized before anything renders.
  const questions = useMemo(() => {
    const list = data?.questions ?? [];
    const orderFor = (fieldId: string | null | undefined): number => {
      if (!fieldId) return Number.MAX_SAFE_INTEGER;
      return fieldOrderById.get(fieldId) ?? Number.MAX_SAFE_INTEGER;
    };
    return [...list].sort((a, b) => orderFor(a.field_id) - orderFor(b.field_id));
  }, [data, fieldOrderById]);
  const atCap = questions.length >= MAX_QUESTIONS;

  const handleAdd = async () => {
    const text = newQuestionText.trim();
    if (!text) return;
    if (!newQuestionFieldId) {
      showToast({ message: 'Pick a resume field for this question.', type: 'error' });
      return;
    }
    if (atCap) {
      showToast({ message: `You can only have up to ${MAX_QUESTIONS} questions.`, type: 'error' });
      return;
    }
    try {
      await createQuestion({
        tenantId,
        question_text: text,
        field_id: newQuestionFieldId,
      }).unwrap();
      showToast({ message: 'Question added.', type: 'success' });
      setNewQuestionText('');
      setNewQuestionFieldId(undefined);
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
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              atCap ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {questions.length}/{MAX_QUESTIONS}
          </span>
          {canCreate && (
            <Button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-700 rounded-full px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <MdOutlineUploadFile />
              Bulk import
            </Button>
          )}
        </div>
      </div>

      <IntakeQuestionsBulkImportModal
        open={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        currentCount={questions.length}
        targetLabel="your company"
        onDownloadTemplate={() => triggerGetTemplate(tenantId).unwrap()}
        onUpload={(file) => bulkImportQuestions({ tenantId, file }).unwrap()}
      />
      <Typography variant="body2" className="mb-6 block">
        Your HR/interpersonal question set, asked in every candidate&apos;s first-round intake call.
        Each question is tied to one Resume Field, the section of a candidate&apos;s resume its
        spoken answer is meant to fill in. Set by Careerforce Pro by default; once you add, edit, or
        remove a question here, this becomes your company&apos;s own independent set.
      </Typography>

      {questions.length === 0 ? (
        <div className="p-6 text-gray-500 text-center border border-dashed rounded-xl">
          No interview questions set up yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((question) => {
            const draft = drafts[question.question_id] ?? { text: '', fieldId: '' };
            const isDirty =
              draft.text.trim() !== question.question_text.trim() ||
              // Both sides normalized through '' — draft.fieldId is seeded
              // with `q.field_id ?? ''` above, so comparing it directly
              // against a possibly-null question.field_id would call an
              // untouched legacy (null) row "dirty" the instant it renders.
              draft.fieldId !== (question.field_id ?? '');
            return (
              <div key={question.question_id} className="flex items-center gap-2">
                <Input
                  value={draft.text}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [question.question_id]: { ...draft, text: e.target.value },
                    }))
                  }
                  className="flex-1"
                />
                <Select
                  size="middle"
                  className="w-44 shrink-0"
                  placeholder="Resume Field"
                  loading={isLoadingFields}
                  showSearch
                  optionFilterProp="label"
                  value={draft.fieldId || undefined}
                  onChange={(value) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [question.question_id]: { ...draft, fieldId: value },
                    }))
                  }
                  options={fieldOptions}
                />
                {canUpdate && (
                  <Button
                    className="rounded-full border border-gray-300 px-4 py-2 whitespace-nowrap"
                    onClick={() => handleSave(question)}
                    disabled={!isDirty || (isSaving && savingId === question.question_id)}
                  >
                    {isSaving && savingId === question.question_id ? 'Saving…' : 'Save'}
                  </Button>
                )}
                {canDelete && (
                  <Tooltip title="Remove question">
                    <button
                      type="button"
                      aria-label="Remove question"
                      className="group p-2 hover:bg-red-50 rounded-full cursor-pointer"
                      onClick={() => setQuestionToDelete(question)}
                    >
                      <MdDelete className="text-gray-600 transition-colors group-hover:text-red-600" />
                    </button>
                  </Tooltip>
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
          <Select
            size="middle"
            className="w-44 shrink-0"
            placeholder="Resume Field"
            loading={isLoadingFields}
            showSearch
            optionFilterProp="label"
            value={newQuestionFieldId}
            onChange={setNewQuestionFieldId}
            options={fieldOptions}
            disabled={atCap}
          />
          <Button
            className="rounded-full border border-gray-300 px-4 py-2 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => void handleAdd()}
            disabled={!newQuestionText.trim() || !newQuestionFieldId || atCap || isCreating}
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
