import React, { useEffect, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { Button, Input, showToast } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import type { TemplateOverride } from '../../api/notification-service/TemplateSettings/index';
import {
  useRevertTenantOverrideAsPlatformMutation,
  useSaveTenantOverrideAsPlatformMutation,
} from '../../api/notification-service/PlatformTemplateSettings/index';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';

type TenantOverridePlatformModalProps = {
  tenantId: string;
  override: TemplateOverride | null;
  onClose: () => void;
};

/**
 * Edit or revert ONE tenant's override on their behalf —
 * `PUT/DELETE /v1/platform/template-settings/tenants/{tenant_id}/overrides/{type}`.
 * Same support/impersonation capability organization-service's old flat-table
 * CRUD used to have, rebuilt against the schema that's actually live.
 */
const TenantOverridePlatformModal: React.FC<TenantOverridePlatformModalProps> = ({
  tenantId,
  override,
  onClose,
}) => {
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [saveOverride, { isLoading: isSaving }] = useSaveTenantOverrideAsPlatformMutation();
  const [revertOverride, { isLoading: isReverting }] = useRevertTenantOverrideAsPlatformMutation();

  useEffect(() => {
    if (override) {
      setSubject(override.subject);
      setHtmlBody(override.html_body);
      setFormError(null);
    }
  }, [override]);

  if (!override) {
    return null;
  }

  const handleSave = async () => {
    setFormError(null);
    try {
      await saveOverride({
        tenantId,
        notificationType: override.notification_type,
        body: { subject, html_body: htmlBody },
      }).unwrap();
      showToast({ message: "This tenant's template was updated.", type: 'success' });
      onClose();
    } catch (err) {
      setFormError(getNotifErrorMessage(err, 'This template could not be saved.'));
    }
  };

  const handleRevert = async () => {
    try {
      await revertOverride({ tenantId, notificationType: override.notification_type }).unwrap();
      showToast({
        message: "Reverted this tenant's template to the platform default.",
        type: 'success',
      });
      onClose();
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to revert this template.'),
        type: 'error',
      });
    }
  };

  return (
    <AntdCommonModal
      open={override !== null}
      onClose={onClose}
      title={`Edit on this tenant's behalf — ${override.notification_type}`}
      subtitle="Support/override action. The tenant sees this as their own customisation."
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
        <div className="flex items-center justify-between gap-2">
          {override.is_customised && (
            <Button
              type="button"
              appname="revert tenant template as platform"
              onClick={handleRevert}
              disabled={isReverting || isSaving}
              className="rounded-3xl border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isReverting ? 'Reverting…' : 'Revert to platform default'}
            </Button>
          )}
          <Button
            type="button"
            appname="save tenant template as platform"
            onClick={handleSave}
            disabled={isSaving || isReverting || !subject.trim() || !htmlBody.trim()}
            className="ml-auto rounded-3xl bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default TenantOverridePlatformModal;
