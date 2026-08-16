import React, { useEffect, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import type { MasterTemplate } from '../../api/notification-service/PlatformTemplateSettings/index';
import {
  useListMasterTemplatesQuery,
  useSaveMasterTemplateMutation,
} from '../../api/notification-service/PlatformTemplateSettings/index';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';

const humanizeType = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const EditMasterTemplateModal: React.FC<{
  template: MasterTemplate | null;
  onClose: () => void;
}> = ({ template, onClose }) => {
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saveTemplate, { isLoading: isSaving }] = useSaveMasterTemplateMutation();

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setHtmlBody(template.html_body);
      setFormError(null);
    }
  }, [template]);

  if (!template) {
    return null;
  }

  const handleSave = async () => {
    setFormError(null);
    try {
      await saveTemplate({
        notificationType: template.notification_type,
        body: { subject, html_body: htmlBody },
      }).unwrap();
      showToast({ message: 'Platform default updated.', type: 'success' });
      onClose();
    } catch (err) {
      setFormError(getNotifErrorMessage(err, 'This template could not be saved.'));
    }
  };

  return (
    <AntdCommonModal
      open={template !== null}
      onClose={onClose}
      title={`Edit platform default — ${template.notification_type}`}
      subtitle="Changes what every tenant without their own override receives. Test-rendered before saving."
      modalProps={{ width: 720 }}
    >
      <div className="flex flex-col gap-4">
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
        <div>
          <p className="mb-1 block text-sm font-medium text-gray-700">Subject</p>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 block text-sm font-medium text-gray-700">Body (HTML)</p>
          <TextArea
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={14}
            className="font-mono text-xs"
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            appname="save platform master template"
            onClick={handleSave}
            disabled={isSaving || !subject.trim() || !htmlBody.trim()}
            className="rounded-3xl bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

/**
 * `GET/PUT /v1/platform/template-settings/master-templates(/{type})` —
 * the platform default every tenant without their own override falls back
 * to. Higher-stakes than a tenant override: a broken master breaks mail for
 * every tenant that has never customised that event.
 */
const MasterEmailTemplatesSection: React.FC = () => {
  const { data, isLoading } = useListMasterTemplatesQuery();
  const [editing, setEditing] = useState<MasterTemplate | null>(null);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <Typography variant="h6" className="mb-1 block">
        Platform default email templates
      </Typography>
      <Typography variant="caption" className="mb-4 block text-gray-500">
        What every tenant receives unless they&apos;ve set their own override.
      </Typography>

      <div className="divide-y overflow-hidden rounded-xl border">
        {data?.templates.map((template) => (
          <div
            key={template.notification_type}
            className="flex items-center justify-between gap-3 p-4"
          >
            <Typography variant="body1">{humanizeType(template.notification_type)}</Typography>
            <Button
              type="button"
              appname="edit platform master template"
              onClick={() => setEditing(template)}
              className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Button>
          </div>
        ))}
      </div>

      <EditMasterTemplateModal template={editing} onClose={() => setEditing(null)} />
    </section>
  );
};

export default MasterEmailTemplatesSection;
