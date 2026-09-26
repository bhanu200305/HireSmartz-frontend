import React, { useEffect, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { Button, Input, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import PlainTextEmailBodyEditor from '../../../shared/ui/PlainTextEmailBodyEditor';
import TemplatePreviewModal from '../../../shared/ui/TemplatePreviewModal';
import type { TemplateOverride } from '../../../../api/notification-service/TemplateSettings/index';
import {
  usePreviewTenantTemplateAsPlatformMutation,
  useSaveTenantOverrideAsPlatformMutation,
  useRevertTenantOverrideAsPlatformMutation,
} from '../../../../api/notification-service/PlatformTemplateSettings/index';
import { getNotifErrorMessage } from '../../../../shared/utils/auth/notifError.helpers';

type PlatformEmailTemplateOverrideModalProps = {
  open: boolean;
  tenantId: string;
  override: TemplateOverride | null;
  onClose: () => void;
};

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

/**
 * Super Admin's mirror of MyCompany/EmailTemplateOverrideModal.tsx — edits a
 * SPECIFIC tenant's override on their behalf
 * (PUT/DELETE /v1/notification-platform/template-settings/tenants/{tenant_id}/overrides/{type}),
 * same test-render-on-save contract, plus the platform-scoped preview
 * (`POST .../tenants/{tenant_id}/preview`) `TenantThemeSection` in this same
 * folder already relies on for the theme tab.
 */
const PlatformEmailTemplateOverrideModal: React.FC<PlatformEmailTemplateOverrideModalProps> = ({
  open,
  tenantId,
  override,
  onClose,
}) => {
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [saveOverride, { isLoading: isSaving }] = useSaveTenantOverrideAsPlatformMutation();
  const [revertOverride, { isLoading: isReverting }] = useRevertTenantOverrideAsPlatformMutation();
  const [fetchPreview, { data: preview, isLoading: isPreviewLoading }] =
    usePreviewTenantTemplateAsPlatformMutation();

  const hasSms = override?.sms_message != null;

  useEffect(() => {
    if (override) {
      setSubject(override.subject);
      setHtmlBody(override.html_body);
      setSmsMessage(override.sms_message ?? '');
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
        body: {
          subject,
          html_body: htmlBody,
          ...(hasSms ? { sms_message: smsMessage } : {}),
        },
      }).unwrap();
      showToast({ message: 'Template updated.', type: 'success' });
      onClose();
    } catch (err) {
      setFormError(getNotifErrorMessage(err, 'This template could not be saved.'));
    }
  };

  const handlePreview = async (channel: 'email' | 'sms' = 'email') => {
    setIsPreviewOpen(true);
    try {
      await fetchPreview({
        tenantId,
        body: { notification_type: override.notification_type, channel },
      }).unwrap();
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to render a preview.'),
        type: 'error',
      });
    }
  };

  const handleRevert = async () => {
    try {
      await revertOverride({ tenantId, notificationType: override.notification_type }).unwrap();
      showToast({ message: 'Reverted to the platform default.', type: 'success' });
      onClose();
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to revert this template.'),
        type: 'error',
      });
    }
  };

  return (
    <>
      <AntdCommonModal
        open={open}
        onClose={onClose}
        title={`Edit template: ${humanizeType(override.notification_type)}`}
        subtitle="Change the words this message sends on this company's behalf. Layout, colors and branding come from this tenant's Email Templates layout instead."
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

          {hasSms && (
            <div>
              <p className="mb-1 block text-sm font-medium text-gray-700">SMS message</p>
              <TextArea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-400">
                Do not include discriminatory, abusive, or hateful language.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                appname="preview template on tenant behalf"
                onClick={() => handlePreview('email')}
                className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Preview
              </Button>
              {hasSms && (
                <Button
                  type="button"
                  appname="preview sms on tenant behalf"
                  onClick={() => handlePreview('sms')}
                  className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Preview SMS
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {override.is_customised && (
                <Button
                  type="button"
                  appname="revert template to default"
                  onClick={handleRevert}
                  disabled={isReverting || isSaving}
                  className="rounded-3xl border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isReverting ? 'Reverting…' : 'Revert to default'}
                </Button>
              )}
              <Button
                type="button"
                appname="save template override"
                onClick={handleSave}
                disabled={isSaving || isReverting || !subject.trim() || !htmlBody.trim()}
                className="rounded-3xl bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </AntdCommonModal>

      <TemplatePreviewModal
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        isLoading={isPreviewLoading}
        preview={preview}
      />
    </>
  );
};

export default PlatformEmailTemplateOverrideModal;
