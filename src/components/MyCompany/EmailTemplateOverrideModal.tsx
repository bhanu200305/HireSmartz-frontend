import React, { useEffect, useState } from 'react';
import { Button, showToast } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import PlainTextEmailBodyEditor from '../shared/ui/PlainTextEmailBodyEditor';
import PlaceholderProtectedField from '../shared/ui/PlaceholderProtectedField';
import type { TemplateOverride } from '../../api/notification-service/TemplateSettings/index';
import {
  usePreviewTemplateMutation,
  useRevertTemplateOverrideMutation,
  useSaveTemplateOverrideMutation,
} from '../../api/notification-service/TemplateSettings/index';
import TemplatePreviewModal from '../shared/ui/TemplatePreviewModal';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';

type EmailTemplateOverrideModalProps = {
  open: boolean;
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
 * Edit (or revert) one notification type's email copy —
 * `PUT/DELETE /v1/template-settings/overrides/{notification_type}`.
 *
 * There is no "preview my unsaved draft" call on this backend — `POST
 * /preview` renders what's currently SAVED for a type, not arbitrary text
 * handed to it (see notification-service's own reasoning: an endpoint that
 * rendered arbitrary HTML under the tenant's identity would defeat the whole
 * point of the test-render gate on Save). So Save doubles as validation: the
 * backend test-renders the candidate before writing and returns 422 with the
 * render failure reason if it won't compose, which is shown inline here
 * rather than a generic "failed to save".
 */
const EmailTemplateOverrideModal: React.FC<EmailTemplateOverrideModalProps> = ({
  open,
  override,
  onClose,
}) => {
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [saveOverride, { isLoading: isSaving }] = useSaveTemplateOverrideMutation();
  const [revertOverride, { isLoading: isReverting }] = useRevertTemplateOverrideMutation();
  const [previewTemplate, { data: preview, isLoading: isPreviewLoading }] =
    usePreviewTemplateMutation();

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
      // Surfaced inline rather than only as a toast — the backend's 422
      // reason (a mistyped variable, unbalanced markup, …) is the whole
      // point of the test-render gate and is easy to miss in a toast that
      // auto-dismisses while someone is mid-edit.
      setFormError(getNotifErrorMessage(err, 'This template could not be saved.'));
    }
  };

  const handleRevert = async () => {
    try {
      await revertOverride(override.notification_type).unwrap();
      showToast({ message: 'Reverted to the platform default.', type: 'success' });
      onClose();
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to revert this template.'),
        type: 'error',
      });
    }
  };

  const handlePreviewCurrent = async (channel: 'email' | 'sms' = 'email') => {
    setIsPreviewOpen(true);
    try {
      await previewTemplate({ notification_type: override.notification_type, channel }).unwrap();
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to render a preview.'),
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
        subtitle="Change the words this message sends. Layout, colors and branding come from your Email Templates pack instead; see the sections above."
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
            <PlaceholderProtectedField
              value={subject}
              onChange={setSubject}
              placeholder="e.g. {{ code }} is your sign-in code"
            />
          </div>

          <PlainTextEmailBodyEditor htmlBody={htmlBody} onChange={setHtmlBody} />
          <p className="-mt-2 text-xs text-gray-400">
            Do not include discriminatory, abusive, or hateful language.
          </p>

          {hasSms && (
            <div>
              <p className="mb-1 block text-sm font-medium text-gray-700">SMS Message</p>
              <PlaceholderProtectedField
                as="textarea"
                value={smsMessage}
                onChange={setSmsMessage}
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
                appname="preview current template"
                onClick={() => handlePreviewCurrent('email')}
                className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Preview what&apos;s live now
              </Button>
              {hasSms && (
                <Button
                  type="button"
                  appname="preview current sms"
                  onClick={() => handlePreviewCurrent('sms')}
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
                  {isReverting ? 'Reverting…' : 'Revert To Default'}
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

export default EmailTemplateOverrideModal;
