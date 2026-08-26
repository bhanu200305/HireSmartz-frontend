import React from 'react';
import { Spin } from 'antd';
import { Button } from '../index';
import type { TemplatePreview } from '../../../api/notification-service/TemplateSettings/index';

interface EmailLivePreviewPanelProps {
  isLoading: boolean;
  preview?: TemplatePreview | null;
  onRefresh: () => void;
}

/**
 * A real, sticky "Live Preview" panel — renders `POST
 * /template-settings/preview`'s actual `body_html` in a sandboxed iframe.
 * "Live" means "reflects what's currently SAVED", not every unsaved
 * keystroke: this backend has no "preview my unsaved draft" call (the
 * old legacy screen's per-keystroke preview was a client-side
 * reconstruction that could and did drift from the real render — see
 * `EmailBrandingEditor`'s removal). Callers refresh this after a
 * successful save, so the gap between "I clicked Save" and "the preview
 * updated" is one request, not a lie about what will actually send.
 */
const EmailLivePreviewPanel: React.FC<EmailLivePreviewPanelProps> = ({
  isLoading,
  preview,
  onRefresh,
}) => {
  const handleFullScreen = () => {
    if (!preview?.body_html) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(preview.body_html);
      win.document.close();
    }
  };

  return (
    <div className="w-full flex-shrink-0 lg:w-[360px]">
      <div className="sticky top-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
          <span className="text-sm font-semibold text-gray-700">Live Preview</span>
          <button
            type="button"
            onClick={onRefresh}
            className="cursor-pointer text-xs font-medium text-primary-600 hover:underline"
          >
            Refresh
          </button>
        </div>

        <div className="relative h-[500px]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
              <Spin size="large" />
            </div>
          )}
          {preview?.body_html ? (
            <iframe
              title="Live email preview"
              sandbox=""
              srcDoc={preview.body_html}
              className="h-full w-full border-0"
            />
          ) : (
            !isLoading && (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-400">
                Save your changes to see them here.
              </div>
            )
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 p-3">
          <Button
            className="flex h-10 w-full items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleFullScreen}
            disabled={!preview?.body_html}
          >
            FULL SCREEN PREVIEW
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmailLivePreviewPanel;
