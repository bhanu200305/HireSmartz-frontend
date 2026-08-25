import React, { useState } from 'react';
import { Badge, Button, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import TemplatePreviewModal from '../shared/ui/TemplatePreviewModal';
import {
  PACK_PREVIEW_SAMPLE_TYPE,
  TemplateOverride,
  usePreviewTemplateMutation,
  useGetTemplatePacksQuery,
  useListTemplateOverridesQuery,
  useSelectTemplatePackMutation,
} from '../../api/notification-service/TemplateSettings/index';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';
import EmailTemplateOverrideModal from './EmailTemplateOverrideModal';
import EmailLayoutSection from './EmailLayoutSection';
import EmailBrandingTab from './EmailBrandingTab';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

const humanizeType = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

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
 * `GET /v1/template-settings/overrides` — every notification type this
 * tenant can customise, whether or not they have (the whole catalogue, per
 * the backend's own reasoning: a list of only the three things already
 * edited is a list nobody can act on).
 */
const OverridesTable: React.FC = () => {
  const { data, isLoading } = useListTemplateOverridesQuery();
  const [editingOverride, setEditingOverride] = useState<TemplateOverride | null>(null);
  const canEdit = useHasAccess(Authorities.EMAIL_TEMPLATE_EDIT);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <Typography variant="h6" className="mb-1 block">
        Notification copy
      </Typography>
      <Typography variant="caption" className="mb-4 block text-gray-500">
        Every message CareerForce Pro can send on your behalf. Edit the ones you&apos;d like in your
        own words — the rest use the platform&apos;s default copy inside your chosen pack.
      </Typography>

      <div className="divide-y overflow-hidden rounded-xl border">
        {data?.overrides.map((override) => (
          <div
            key={override.notification_type}
            className="flex items-center justify-between gap-3 p-4"
          >
            <div className="flex items-center gap-2">
              <Typography variant="body1">{humanizeType(override.notification_type)}</Typography>
              <Badge status={override.is_customised ? 'info' : 'neutral'}>
                {override.is_customised ? 'Customised' : 'Default'}
              </Badge>
            </div>
            {canEdit && (
              <Button
                type="button"
                appname="edit notification template"
                onClick={() => setEditingOverride(override)}
                className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </Button>
            )}
          </div>
        ))}
        {data && data.overrides.length === 0 && (
          <p className="p-4 text-sm text-gray-500">
            No notification templates are seeded on this environment yet.
          </p>
        )}
      </div>

      <EmailTemplateOverrideModal
        open={editingOverride !== null}
        override={editingOverride}
        onClose={() => setEditingOverride(null)}
      />
    </section>
  );
};

/**
 * Journey 6, step 4 — the tenant self-service pack picker + per-type
 * overrides + layout, replacing the `ComingSoonTab` placeholder MyCompany
 * carried while this integration was pending. Email-only: see
 * TemplateSettings/index.ts's module docstring on why there is no per-tenant
 * SMS override here.
 */
const EmailTemplatesTab: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 p-4">
      <PackPicker />
      <OverridesTable />
      <EmailLayoutSection />
      <EmailBrandingTab />
    </div>
  );
};

export default EmailTemplatesTab;
