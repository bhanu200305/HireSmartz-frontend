import React, { useEffect, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
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
    .join(' ');

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
      title={`Edit platform default SMS — ${template.notification_type}`}
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
 * `GET/PUT /v1/platform/template-settings/master-sms-templates(/{type})` —
 * the platform-wide SMS default. There is no per-tenant SMS override on this
 * backend (see TemplateSettings/index.ts's module docstring), so this is
 * the only SMS copy that exists anywhere for a given notification type.
 */
const MasterSmsTemplatesSection: React.FC = () => {
  const { data, isLoading } = useListMasterSmsTemplatesQuery();
  const [editing, setEditing] = useState<MasterSmsTemplate | null>(null);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <Typography variant="h6" className="mb-1 block">
        Platform default SMS templates
      </Typography>
      <Typography variant="caption" className="mb-4 block text-gray-500">
        The only SMS copy that exists for these types — there is no per-organisation override.
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
              appname="edit platform master sms template"
              onClick={() => setEditing(template)}
              className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Button>
          </div>
        ))}
        {data && data.templates.length === 0 && (
          <p className="p-4 text-sm text-gray-500">No SMS-capable notification types are seeded.</p>
        )}
      </div>

      <EditMasterSmsTemplateModal template={editing} onClose={() => setEditing(null)} />
    </section>
  );
};

export default MasterSmsTemplatesSection;
