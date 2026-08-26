import React, { useState } from 'react';
import { Badge, Button, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import TemplatePreviewModal from '../shared/ui/TemplatePreviewModal';
import {
  PACK_PREVIEW_SAMPLE_TYPE,
  usePreviewTemplateMutation,
  useGetTemplatePacksQuery,
  useSelectTemplatePackMutation,
} from '../../api/notification-service/TemplateSettings/index';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';
import EmailLayoutSection from './EmailLayoutSection';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

/**
 * `GET /v1/template-settings/packs` — the three prebuilt themes and which
 * one this tenant currently uses. Selecting one restyles every future
 * notification at once; already-sent messages are untouched (their bodies
 * were rendered and persisted at send time).
 */
const PackPicker: React.FC = () => {
  const { data, isLoading } = useGetTemplatePacksQuery();
  const [selectPack, { isLoading: isSelecting }] = useSelectTemplatePackMutation();
  const [previewTemplate, { data: preview, isLoading: isPreviewLoading }] =
    usePreviewTemplateMutation();
  const [previewingPack, setPreviewingPack] = useState<string | null>(null);
  const canEdit = useHasAccess(Authorities.EMAIL_TEMPLATE_EDIT);

  if (isLoading) {
    return <Loader />;
  }

  const handleSelect = async (packKey: string) => {
    try {
      await selectPack({ pack_key: packKey }).unwrap();
      showToast({ message: 'Template pack updated.', type: 'success' });
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to update your template pack.'),
        type: 'error',
      });
    }
  };

  const handlePreview = async (packKey: string) => {
    setPreviewingPack(packKey);
    try {
      await previewTemplate({
        notification_type: PACK_PREVIEW_SAMPLE_TYPE,
        pack_key: packKey,
      }).unwrap();
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to render a preview.'),
        type: 'error',
      });
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <Typography variant="h6" className="mb-1 block">
        Template pack
      </Typography>
      <Typography variant="caption" className="mb-4 block text-gray-500">
        A pack is a theme — choosing one restyles every notification you send at once. Sample
        rendered with a sample invitation; already-sent mail is never affected.
      </Typography>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {data?.packs.map((pack) => (
          <div
            key={pack.key}
            className={`flex flex-col gap-3 rounded-2xl border p-4 ${
              pack.is_selected ? 'border-primary ring-1 ring-primary' : 'border-[var(--border)]'
            }`}
          >
            <div
              className="h-8 w-full rounded-lg"
              style={{ backgroundColor: pack.accent_colour }}
            />
            <div>
              <div className="flex items-center gap-2">
                <Typography variant="body1">{pack.name}</Typography>
                {pack.is_selected && <Badge status="success">In use</Badge>}
              </div>
              <Typography variant="caption" className="text-gray-500">
                {pack.description}
              </Typography>
            </div>
            <div className="mt-auto flex items-center gap-2">
              <Button
                type="button"
                appname="preview template pack"
                onClick={() => handlePreview(pack.key)}
                className="flex-1 rounded-3xl border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Preview
              </Button>
              {!pack.is_selected && canEdit && (
                <Button
                  type="button"
                  appname="select template pack"
                  onClick={() => handleSelect(pack.key)}
                  disabled={isSelecting}
                  className="flex-1 rounded-3xl bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use this pack
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <TemplatePreviewModal
        open={previewingPack !== null}
        onClose={() => setPreviewingPack(null)}
        isLoading={isPreviewLoading}
        preview={preview}
      />
    </section>
  );
};

/**
 * Journey 6, step 4 — the tenant self-service pack picker + layout,
 * replacing the `ComingSoonTab` placeholder MyCompany carried while this
 * integration was pending. Email-only: see TemplateSettings/index.ts's
 * module docstring on why there is no per-tenant SMS override here.
 *
 * Per-type notification copy overrides used to be stacked here too — split
 * out to its own "Notification copy" tab (see NotificationCopyTab.tsx),
 * beside this one, since editing individual message copy is a different job
 * from picking a pack/layout even though both hang off the same
 * notification-service settings.
 *
 * Used to also stack a legacy `EmailBrandingTab` here — banner + 16 colors
 * against a `tenant-service` backend that predates the organization-service
 * split and no longer exists anywhere in CFPro2.0. Retired: `EmailLayoutSection`
 * above already covers banner + colors for real, against a backend that
 * actually exists locally.
 */
const EmailTemplatesTab: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 p-4">
      <PackPicker />
      <EmailLayoutSection />
    </div>
  );
};

export default EmailTemplatesTab;
