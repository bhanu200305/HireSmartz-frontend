import React from 'react';
import { Spin } from 'antd';
import AntdCommonModal from './AntdCommonModal';
import type { TemplatePreview } from '../../../api/notification-service/TemplateSettings/index';

type TemplatePreviewModalProps = {
  open: boolean;
  onClose: () => void;
  isLoading: boolean;
  preview?: TemplatePreview | null;
};

/**
 * Renders a notification-service template preview (`POST
 * /template-settings/preview`) — SAMPLE data only, never a real recipient's
 * (see the backend's own docs on why: a preview that pulled a live record
 * would leak one user's details to whoever is editing templates).
 *
 * `body_html` is rendered in a sandboxed iframe via `srcDoc` rather than
 * `dangerouslySetInnerHTML` in the page itself — this is a full HTML
 * document (head/style/body from the tenant's chosen layout), and the
 * sandbox keeps any script/link it contains from touching the admin
 * console's own DOM or cookies.
 */
const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  open,
  onClose,
  isLoading,
  preview,
}) => {
  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Preview"
      subtitle={preview?.subject || undefined}
      modalProps={{ width: 640 }}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spin />
        </div>
      ) : preview?.body_html ? (
        <iframe
          title="Notification preview"
          sandbox=""
          srcDoc={preview.body_html}
          className="h-[60vh] w-full rounded-lg border border-gray-200"
        />
      ) : (
        <pre className="whitespace-pre-wrap text-sm text-gray-700">{preview?.body_text}</pre>
      )}
    </AntdCommonModal>
  );
};

export default TemplatePreviewModal;
