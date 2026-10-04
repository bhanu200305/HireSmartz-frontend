import React from 'react';
import { Spin } from 'antd';
import AntdCommonModal from './AntdCommonModal';
import type { TemplatePreview } from '../../../api/notification-service/TemplateSettings/index';
import { disableLinksInEmailPreview } from '../../../shared/utils/notifications/disableLinksInEmailPreview';

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
      // Not `maskClosable: true` — unlike the read-only list modals that
      // opt into real backdrop-close (nothing there to lose), this stays on
      // AntdCommonModal's default: an outside click flashes the X instead
      // of closing, so a stray click while reading a preview can't dismiss
      // it by accident.
      modalProps={{ width: 640 }}
    >
      {/* Height computed from the SAME --app-header-height/--app-footer-height
          vars index.css uses for `.ant-modal-content`'s own max-height budget
          (`calc(100vh - header - footer - 48px)`), minus extra room for this
          modal's title/subtitle block and padding — not a guessed vh
          percentage. A flat guess (60vh, 65vh, ...) can still exceed the
          modal's real available space once title+subtitle+padding are
          counted, which leaves `.modal-content`'s own scroll fallback
          engaged ALONGSIDE the iframe's own — this ties the box to the exact
          budget so that never happens, and the iframe is the only thing that
          ever scrolls. */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          height:
            'calc(100vh - var(--app-header-height, 64px) - var(--app-footer-height, 84px) - 208px)',
        }}
      >
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spin />
          </div>
        ) : preview?.body_html ? (
          <iframe
            title="Notification Preview"
            sandbox=""
            srcDoc={disableLinksInEmailPreview(preview.body_html)}
            className="w-full flex-1 min-h-0 rounded-lg border border-gray-200"
          />
        ) : (
          <pre className="flex-1 min-h-0 overflow-auto whitespace-pre-wrap text-sm text-gray-700">
            {preview?.body_text}
          </pre>
        )}
      </div>
    </AntdCommonModal>
  );
};

export default TemplatePreviewModal;
