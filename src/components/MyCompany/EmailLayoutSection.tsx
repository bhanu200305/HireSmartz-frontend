import React, { useEffect, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { Button, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useGetTemplateLayoutQuery,
  useRevertTemplateLayoutMutation,
  useSaveTemplateLayoutMutation,
} from '../../api/notification-service/TemplateSettings/index';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';

/**
 * A tenant's own header/footer/CSS chrome, wrapped around every notification
 * — `GET/PUT/DELETE /v1/template-settings/layout`. Independent of the
 * per-type overrides above: a tenant can rebrand the chrome while keeping
 * every type's copy on the platform default, or the reverse.
 */
const EmailLayoutSection: React.FC = () => {
  const { data, isLoading } = useGetTemplateLayoutQuery();
  const [saveLayout, { isLoading: isSaving }] = useSaveTemplateLayoutMutation();
  const [revertLayout, { isLoading: isReverting }] = useRevertTemplateLayoutMutation();

  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [css, setCss] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setHeaderHtml(data.header_html || '');
      setFooterHtml(data.footer_html || '');
      setCss(data.css || '');
    }
  }, [data]);

  if (isLoading) {
    return <Loader />;
  }

  const handleSave = async () => {
    setFormError(null);
    try {
      await saveLayout({
        header_html: headerHtml || null,
        footer_html: footerHtml || null,
        css: css || null,
      }).unwrap();
      showToast({ message: 'Layout updated.', type: 'success' });
    } catch (err) {
      setFormError(getNotifErrorMessage(err, 'This layout could not be saved.'));
    }
  };

  const handleRevert = async () => {
    try {
      await revertLayout().unwrap();
      setHeaderHtml('');
      setFooterHtml('');
      setCss('');
      showToast({ message: 'Reverted to the platform default chrome.', type: 'success' });
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to revert your layout.'),
        type: 'error',
      });
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <Typography variant="h6" className="mb-1 block">
        Your own header, footer &amp; CSS
      </Typography>
      <Typography variant="caption" className="mb-4 block text-gray-500">
        Wrapped around every notification, independent of the per-type copy below. Leave a field
        blank to keep the platform&apos;s. CSS is progressive enhancement only — some mail clients
        strip it, so nothing should depend on it to be legible.
      </Typography>

      {formError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1 block text-sm font-medium text-gray-700">Header HTML</p>
          <TextArea
            value={headerHtml}
            onChange={(e) => setHeaderHtml(e.target.value)}
            rows={4}
            className="font-mono text-xs"
            placeholder="Leave blank to use the platform's header"
          />
        </div>
        <div>
          <p className="mb-1 block text-sm font-medium text-gray-700">Footer HTML</p>
          <TextArea
            value={footerHtml}
            onChange={(e) => setFooterHtml(e.target.value)}
            rows={4}
            className="font-mono text-xs"
            placeholder="Leave blank to use the platform's footer"
          />
        </div>
        <div>
          <p className="mb-1 block text-sm font-medium text-gray-700">CSS</p>
          <TextArea
            value={css}
            onChange={(e) => setCss(e.target.value)}
            rows={4}
            className="font-mono text-xs"
            placeholder="Inlined into a <style> block"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          {data?.has_layout && (
            <Button
              type="button"
              appname="revert layout to default"
              onClick={handleRevert}
              disabled={isReverting || isSaving}
              className="rounded-3xl border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isReverting ? 'Reverting…' : 'Revert to default'}
            </Button>
          )}
          <Button
            type="button"
            appname="save layout"
            onClick={handleSave}
            disabled={isSaving || isReverting}
            className="rounded-3xl bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save layout'}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default EmailLayoutSection;
