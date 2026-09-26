import React, { useEffect, useState } from 'react';
import { MdEmail, MdEdit } from 'react-icons/md';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import PlainTextEmailBodyEditor from '../shared/ui/PlainTextEmailBodyEditor';
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
      title={`Edit platform default: ${humanizeType(template.notification_type)}`}
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
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. {{ code }} is your sign-in code"
          />
        </div>
        <PlainTextEmailBodyEditor htmlBody={htmlBody} onChange={setHtmlBody} />
        <p className="-mt-2 text-xs text-gray-400">
          Do not include discriminatory, abusive, or hateful language.
        </p>
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
 * `GET/PUT /v1/notification-platform/template-settings/master-templates(/{type})` —
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Typography variant="h6" className="mb-1 block">
            Platform default email templates
          </Typography>
          <Typography variant="caption" className="block text-gray-500">
            What every tenant receives unless they&apos;ve set their own override.
          </Typography>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
          {data?.templates.length ?? 0} types
        </span>
      </div>

      <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {data?.templates.map((template) => (
          <button
            key={template.notification_type}
            type="button"
            onClick={() => setEditing(template)}
            className="group flex cursor-pointer flex-col items-start gap-2.5 rounded-xl border border-[var(--border)] bg-gray-50/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:bg-white hover:shadow-md"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-sm">
              <MdEmail size={15} />
            </span>
            <Typography variant="body2" className="font-medium text-gray-800">
              {humanizeType(template.notification_type)}
            </Typography>
            <span className="mt-auto flex items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
              <MdEdit size={13} /> Edit
            </span>
          </button>
        ))}
      </div>

      <EditMasterTemplateModal template={editing} onClose={() => setEditing(null)} />
    </section>
  );
};

export default MasterEmailTemplatesSection;
