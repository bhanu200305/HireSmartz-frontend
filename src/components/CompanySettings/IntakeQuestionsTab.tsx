import React, { useEffect, useMemo, useState } from 'react';
import { Select, Tooltip } from 'antd';
import { MdDelete, MdOutlineAdd, MdOutlineQuestionAnswer } from 'react-icons/md';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { Badge, Button, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import {
  useListPlatformInterviewQuestionsQuery,
  useCreatePlatformInterviewQuestionMutation,
  useUpdatePlatformInterviewQuestionMutation,
  useDeletePlatformInterviewQuestionMutation,
} from '../../api/organization-service/Platform/interviewQuestions';
import {
  useGetPlatformTenantJobQuestionsQuery,
  useCreatePlatformTenantJobQuestionMutation,
  useUpdatePlatformTenantJobQuestionMutation,
  useDeletePlatformTenantJobQuestionMutation,
} from '../../api/organization-service/Platform/tenantJobQuestions';
import { useListResumeTemplateFieldsQuery } from '../../api/organization-service/resumeTemplateFields';
import type { InterviewQuestion } from '../../api/organization-service/Tenants/interviewQuestions';
import { useGetCompaniesDropdownQuery } from '../../api/tenant-service/Company/companiesDropdown';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

const MAX_QUESTIONS = 8;

type Draft = { text: string; fieldId: string };

// Grows a question's textarea to fit its full text, no scrollbar, instead
// of clipping longer questions to a fixed one-line box. Called on mount
// (via the ref callback, so an already-long value is sized correctly right
// away) and on every keystroke.
const autoGrowTextarea = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

/**
 * Super Admin's "Intake Questions" tab — GET/POST/PUT/DELETE
 * /v1/platform/interview-questions (the platform default, up to 8) and
 * GET/POST/PATCH/DELETE /v1/platform/tenants/{tenant_id}/audio-questions
 * (one company's own set, picked from the dropdown below).
 *
 * A company with no customization of its own live-inherits the platform
 * default — editing it here shows up immediately for every company that
 * hasn't diverged. The moment a question is added, edited, or removed for
 * one specific company (from here, or from that company's own Company
 * Admin settings — MyCompany/InterviewQuestionsTab.tsx), that company
 * forks its own independent copy and stops tracking further platform
 * edits. Both the platform default and a specific company's own copy can
 * be added to (up to `MAX_QUESTIONS`), edited, or trimmed — a company that
 * removed a question can refill the slot from either screen.
 *
 * Every question (platform or company-owned) is now required to carry a
 * `field_id` — which ResumeTemplateField its spoken answer is meant to
 * fill in (organization-service migration 0056: NOT NULL, no untagged
 * state exists anywhere).
 */
const IntakeQuestionsTab: React.FC = () => {
  // null = editing the platform-wide default; a tenant id = that one
  // company's own set.
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const isPlatformDefault = selectedTenantId === null;

  const { data: companies, isLoading: isCompaniesLoading } = useGetCompaniesDropdownQuery();
  const { data: fieldsData, isLoading: isLoadingFields } = useListResumeTemplateFieldsQuery();
  const fields = useMemo(() => fieldsData?.fields ?? [], [fieldsData]);
  const fieldOptions = useMemo(
    () => fields.map((f) => ({ value: f.field_id, label: f.field_label })),
    [fields]
  );

  const { data: platformData, isLoading: isPlatformLoading } =
    useListPlatformInterviewQuestionsQuery(undefined, { skip: !isPlatformDefault });
  const { data: tenantData, isLoading: isTenantLoading } = useGetPlatformTenantJobQuestionsQuery(
    selectedTenantId as string,
    { skip: isPlatformDefault }
  );

  const [createPlatformQuestion, { isLoading: isCreatingPlatform }] =
    useCreatePlatformInterviewQuestionMutation();
  const [updatePlatformQuestion] = useUpdatePlatformInterviewQuestionMutation();
  const [deletePlatformQuestion] = useDeletePlatformInterviewQuestionMutation();
  const [createTenantQuestion, { isLoading: isCreatingTenant }] =
    useCreatePlatformTenantJobQuestionMutation();
  const [updateTenantQuestion] = useUpdatePlatformTenantJobQuestionMutation();
  const [deleteTenantQuestion] = useDeletePlatformTenantJobQuestionMutation();
  const isCreating = isPlatformDefault ? isCreatingPlatform : isCreatingTenant;

  const data = isPlatformDefault ? platformData : tenantData;
  const isLoading = isPlatformDefault ? isPlatformLoading : isTenantLoading;
  const questions = useMemo(() => data?.questions ?? [], [data]);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<InterviewQuestion | null>(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionFieldId, setNewQuestionFieldId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        questions.map((q) => [
          q.question_id,
          // `q.field_id` can be null (a legacy question predating this
          // field) — the picker below already renders '' as "unassigned"
          // via its own `|| undefined` fallback, and Save is blocked until
          // a real one is chosen.
          { text: q.question_text, fieldId: q.field_id ?? '' },
        ])
      )
    );
  }, [questions]);

  const companyOptions = useMemo(
    () => [
      { value: 'platform', label: 'Platform Default (all companies)' },
      ...(companies ?? []).map((company) => ({ value: company.id, label: company.companyName })),
    ],
    [companies]
  );

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
      if (isPlatformDefault) {
        await updatePlatformQuestion({
          questionId: question.question_id,
          question_text: text,
          field_id: draft.fieldId,
        }).unwrap();
      } else {
        await updateTenantQuestion({
          tenantId: selectedTenantId as string,
          questionId: question.question_id,
          question_text: text,
          field_id: draft.fieldId,
        }).unwrap();
      }
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
      if (isPlatformDefault) {
        await deletePlatformQuestion(questionToDelete.question_id).unwrap();
      } else {
        await deleteTenantQuestion({
          tenantId: selectedTenantId as string,
          questionId: questionToDelete.question_id,
        }).unwrap();
      }
      showToast({ message: 'Question removed.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to remove question.'), type: 'error' });
    } finally {
      setQuestionToDelete(null);
    }
  };

  const handleAdd = async () => {
    const text = newQuestionText.trim();
    if (!text) return;
    if (!newQuestionFieldId) {
      showToast({ message: 'Pick a resume field for this question.', type: 'error' });
      return;
    }
    if (questions.length >= MAX_QUESTIONS) {
      showToast({ message: `You can only have up to ${MAX_QUESTIONS} questions.`, type: 'error' });
      return;
    }
    try {
      if (isPlatformDefault) {
        await createPlatformQuestion({
          question_text: text,
          field_id: newQuestionFieldId,
        }).unwrap();
      } else {
        await createTenantQuestion({
          tenantId: selectedTenantId as string,
          question_text: text,
          field_id: newQuestionFieldId,
        }).unwrap();
      }
      showToast({ message: 'Question added.', type: 'success' });
      setNewQuestionText('');
      setNewQuestionFieldId(undefined);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to add question.'), type: 'error' });
    }
  };

  const atCap = questions.length >= MAX_QUESTIONS;
  const selectedCompanyLabel = isPlatformDefault
    ? null
    : (companies ?? []).find((c) => c.id === selectedTenantId)?.companyName;

  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-1.5 rounded-full flex items-center justify-center shrink-0">
          <MdOutlineQuestionAnswer size={14} />
        </span>
        <h2 className="text-lg font-semibold text-gray-800 m-0">Intake Questions</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4 max-w-3xl">
        Up to {MAX_QUESTIONS} HR/interpersonal questions asked in every candidate&apos;s first-round
        intake call, each tied to one Resume Field. Pick a company below to view or override its own
        set.
      </p>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select
          id="intakeQuestionsCompany"
          size="middle"
          className="w-full sm:w-[240px]"
          popupClassName="intakeQuestionsCompanySelectDropdown"
          loading={isCompaniesLoading}
          showSearch
          value={isPlatformDefault ? 'platform' : selectedTenantId}
          onChange={(value) => setSelectedTenantId(value === 'platform' ? null : value)}
          options={companyOptions}
          filterOption={(input, option) =>
            String(option?.label ?? '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        />
        <Badge status={isPlatformDefault ? 'info' : 'neutral'} dot={false}>
          {isPlatformDefault ? 'Platform default' : (selectedCompanyLabel ?? 'Company')}
        </Badge>
        {!isLoading && (
          <Badge status={atCap ? 'warning' : 'neutral'} dot={false}>
            {questions.length}/{MAX_QUESTIONS}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="max-w-3xl">
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-8 text-center border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
              <HiOutlineChatBubbleLeftRight
                className="text-neutral-300"
                size={26}
                strokeWidth={0.5}
              />
              <p className="text-sm font-medium text-gray-600 m-0">No intake questions yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 mb-3">
              {questions.map((question, index) => {
                const draft = drafts[question.question_id] ?? { text: '', fieldId: '' };
                const isDirty =
                  draft.text.trim() !== question.question_text.trim() ||
                  // Both sides normalized through '' — draft.fieldId is
                  // seeded with `q.field_id ?? ''` above, so comparing it
                  // directly against a possibly-null question.field_id
                  // would call an untouched legacy (null) row "dirty" the
                  // instant it renders.
                  draft.fieldId !== (question.field_id ?? '');
                const isSaving = savingId === question.question_id;
                return (
                  <div
                    key={question.question_id}
                    className={`flex items-start gap-2 px-2.5 py-1.5 rounded-xl border bg-white transition-colors ${
                      isDirty ? 'border-primary-300 bg-primary-50/30' : 'border-neutral-200'
                    }`}
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary-50 text-primary-600 text-[11px] font-bold flex items-center justify-center mt-1">
                      {index + 1}
                    </span>
                    <textarea
                      ref={autoGrowTextarea}
                      value={draft.text}
                      onChange={(e) => {
                        setDrafts((prev) => ({
                          ...prev,
                          [question.question_id]: { ...draft, text: e.target.value },
                        }));
                        autoGrowTextarea(e.target);
                      }}
                      rows={1}
                      className="flex-1 min-w-0 resize-none overflow-hidden border border-transparent rounded-lg px-1.5 py-1 text-sm text-gray-800 leading-snug bg-transparent focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-100 focus:bg-white"
                    />
                    <Select
                      size="small"
                      className="w-40 shrink-0 mt-0.5"
                      placeholder="Resume Field"
                      loading={isLoadingFields}
                      value={draft.fieldId || undefined}
                      onChange={(value) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [question.question_id]: { ...draft, fieldId: value },
                        }))
                      }
                      options={fieldOptions}
                    />
                    {(isDirty || isSaving) && (
                      <Button
                        className="shrink-0 rounded-full bg-primary-600 text-white px-3 py-1 text-xs whitespace-nowrap disabled:opacity-50 mt-0.5"
                        onClick={() => handleSave(question)}
                        disabled={isSaving}
                      >
                        {isSaving ? '…' : 'Save'}
                      </Button>
                    )}
                    <Tooltip title="Remove">
                      <button
                        type="button"
                        aria-label="Remove question"
                        className="shrink-0 p-1 mt-0.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        onClick={() => setQuestionToDelete(question)}
                      >
                        <MdDelete size={15} />
                      </button>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add works for both the platform default and a specific
              company's own copy — each capped at MAX_QUESTIONS. */}
          <div
            className={`flex items-start gap-2 px-2.5 py-1.5 rounded-xl border border-dashed transition-colors ${
              atCap ? 'border-neutral-200' : 'border-primary-200'
            }`}
          >
            <span
              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-1 ${
                atCap ? 'text-neutral-300' : 'text-primary-500'
              }`}
            >
              <MdOutlineAdd size={14} />
            </span>
            <textarea
              ref={autoGrowTextarea}
              value={newQuestionText}
              onChange={(e) => {
                setNewQuestionText(e.target.value);
                autoGrowTextarea(e.target);
              }}
              placeholder={atCap ? `Maximum of ${MAX_QUESTIONS} reached` : 'Add a question…'}
              disabled={atCap}
              rows={1}
              className="flex-1 min-w-0 resize-none overflow-hidden border border-transparent rounded-lg px-1.5 py-1 text-sm text-gray-800 leading-snug bg-transparent focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-100 focus:bg-white disabled:bg-transparent"
            />
            <Select
              size="small"
              className="w-40 shrink-0 mt-0.5"
              placeholder="Resume Field"
              loading={isLoadingFields}
              value={newQuestionFieldId}
              onChange={setNewQuestionFieldId}
              options={fieldOptions}
              disabled={atCap}
            />
            <Button
              className="shrink-0 mt-0.5 rounded-full bg-primary-600 text-white px-3 py-1 text-xs whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => void handleAdd()}
              disabled={!newQuestionText.trim() || !newQuestionFieldId || atCap || isCreating}
            >
              {isCreating ? '…' : 'Add'}
            </Button>
          </div>
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

export default IntakeQuestionsTab;
