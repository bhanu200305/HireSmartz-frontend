import React from 'react';
import { Typography, CustomTable } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import { useGetPlatformTenantJobQuestionsQuery } from '../../../../api/organization-service/Platform/tenantJobQuestions';
import { useListResumeTemplateFieldsQuery } from '../../../../api/organization-service/resumeTemplateFields';

type QuestionRow = { key: string; question_text: string; fieldLabel: string };

/**
 * Read-only view of this company's AI audio-screening question set — same
 * data CompanySettings/IntakeQuestionsTab.tsx edits, just without any of
 * that tab's add/edit/delete/bulk-import controls. That tab stays the one
 * place to actually change these; this is for a viewer (cfp_support's
 * read-only grant, or any admin who just wants to see them without leaving
 * this company's own page) to see what's set without leaving here.
 */
const AudioQuestionsPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useGetPlatformTenantJobQuestionsQuery(tenantId);
  const { data: fieldsData } = useListResumeTemplateFieldsQuery();

  if (isLoading) return <Loader />;

  const fieldLabelById = new Map(
    (fieldsData?.fields ?? []).map((f) => [f.field_id, f.field_label])
  );
  const dataSource: QuestionRow[] = (data?.questions ?? []).map((q) => ({
    key: q.question_id,
    question_text: q.question_text,
    fieldLabel: (q.field_id && fieldLabelById.get(q.field_id)) || 'Unassigned',
  }));

  return (
    <div className="p-4">
      <Typography variant="h5" className="mb-1 block">
        Audio Questions
      </Typography>
      <Typography variant="body2" className="text-gray-400 mb-6">
        This company&apos;s AI audio-screening question set.
      </Typography>

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<QuestionRow>
          columns={[
            { title: 'Question', dataIndex: 'question_text', key: 'question_text' },
            { title: 'Resume field', dataIndex: 'fieldLabel', key: 'fieldLabel', minWidth: 180 },
          ]}
          dataSource={dataSource}
          emptyText="No audio questions set — this company is inheriting the platform default."
        />
      </div>
    </div>
  );
};

export default AudioQuestionsPanel;
