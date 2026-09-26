import React, { useEffect, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { MdSms, MdEdit } from 'react-icons/md';
import { Button, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import type { MasterSmsTemplate } from '../../api/notification-service/PlatformTemplateSettings/index';
import {
  useListMasterSmsTemplatesQuery,
  useSaveMasterSmsTemplateMutation,
} from '../../api/notification-service/PlatformTemplateSettings/index';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';

const humanizeType = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    // Display-only: the backend's `notification_type` enum (still sent as-is
    // on save) spells these four `..._invited` — this reads "Invitation"
    // instead, matching `invitation_accepted`'s own noun form rather than
    // the odd-one-out adjective.
    .replace(/\bInvited\b/, 'Invitation');

const EditMasterSmsTemplateModal: React.FC<{
  template: MasterSmsTemplate | null;
  onClose: () => void;
}> = ({ template, onClose }) => {
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saveTemplate, { isLoading: isSaving }] = useSaveMasterSmsTemplateMutation();

  useEffect(() => {
    if (template) {
      setMessage(template.message);
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
        body: { message },
      }).unwrap();
      showToast({ message: 'Platform default SMS updated.', type: 'success' });
      onClose();
    } catch (err) {
      setFormError(getNotifErrorMessage(err, 'This SMS template could not be saved.'));
    }
  };

  return (
    <AntdCommonModal
      open={template !== null}
      onClose={onClose}
      title={`Edit platform default SMS: ${template.notification_type}`}
      modalProps={{ width: 560 }}
    >
      <div className="flex flex-col gap-4">
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
        <div>
          <p className="mb-1 block text-sm font-medium text-gray-700">Message</p>
          <TextArea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
          <p className="mt-1 text-xs text-gray-400">
            Do not include discriminatory, abusive, or hateful language.
          </p>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            appname="save platform master sms template"
            onClick={handleSave}
            disabled={isSaving || !message.trim()}
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
 * `GET/PUT /v1/notification-platform/template-settings/master-sms-templates(/{type})` —
 * the platform-wide SMS default every tenant falls back to. A tenant may
 * still override an individual type's SMS wording for themselves (see
 * `TenantOverrideSection`'s edit modal, or MyCompany's own "Notification
 * copy" editor) — this section only edits the shared baseline underneath
 * those overrides.
 */
const MasterSmsTemplatesSection: React.FC = () => {
  const { data, isLoading } = useListMasterSmsTemplatesQuery();
  const [editing, setEditing] = useState<MasterSmsTemplate | null>(null);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Typography variant="h6" className="mb-1 block">
            Platform default SMS templates
          </Typography>
          <Typography variant="caption" className="block text-gray-500">
            The only SMS copy that exists for these types; there is no per-organization override.
          </Typography>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
          {data?.templates.length ?? 0} types
        </span>
      </div>

      {data && data.templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-gray-500">
          No SMS-capable notification types are seeded.
        </p>
      ) : (
        <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {data?.templates.map((template) => (
            <button
              key={template.notification_type}
              type="button"
              onClick={() => setEditing(template)}
              className="group flex cursor-pointer flex-col items-start gap-2.5 rounded-xl border border-[var(--border)] bg-gray-50/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:bg-white hover:shadow-md"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-sm">
                <MdSms size={15} />
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
      )}

      <EditMasterSmsTemplateModal template={editing} onClose={() => setEditing(null)} />
    </section>
  );
};

export default MasterSmsTemplatesSection;
