import React, { useEffect, useState } from 'react';
import { Badge, Typography, Button, showToast } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import EmailThemeColorFields from '../../../shared/ui/EmailThemeColorFields';
import EmailLivePreviewPanel from '../../../shared/ui/EmailLivePreviewPanel';
import {
  useListPlatformTenantOverridesQuery,
  useGetTenantLayoutQuery,
  useSaveTenantLayoutAsPlatformMutation,
  usePreviewTenantTemplateAsPlatformMutation,
} from '../../../../api/notification-service/PlatformTemplateSettings/index';
import type { TemplateOverride } from '../../../../api/notification-service/TemplateSettings/index';
import {
  EmailThemeColors,
  THEME_COLOR_KEYS,
  THEME_PREVIEW_SAMPLE_TYPE,
} from '../../../../shared/utils/notifications/emailTheme';
import { getNotifErrorMessage } from '../../../../shared/utils/auth/notifError.helpers';
import PlatformEmailTemplateOverrideModal from './PlatformEmailTemplateOverrideModal';

// Same values `jinja_renderer.py`'s `_PACK_THEME_DEFAULTS[PackKey.CORPORATE]`
// resolves to for any field this tenant hasn't set.
const CORPORATE_DEFAULTS: Required<EmailThemeColors> = {
  primary_color: '#1F3A5F',
  secondary_color: '#D9E2EC',
  background_color: '#EEF1F5',
  text_color: '#344054',
  title_color: '#101828',
  greeting_color: '#101828',
  button_background: '#1F3A5F',
  button_text: '#FFFFFF',
  button_border_color: '#1F3A5F',
  highlight_background: '#FFFFFF',
  highlight_text: '#667085',
  footer_background: '#F7F8FA',
  footer_text: '#98A2B3',
  action_button_text: '#FFFFFF',
  action_button_background: '#1F3A5F',
  action_button_border_color: '#1F3A5F',
};

/**
 * Super Admin editing a SPECIFIC tenant's 16 brand colours on their behalf —
 * `GET/PUT /v1/platform/template-settings/tenants/{tenant_id}/layout`.
 * Colours only: uploading a banner FILE is tenant self-service only (the
 * organization-service upload route is `require_own_tenant`-guarded, same
 * as the company logo upload it mirrors) — a Super Admin can restyle a
 * tenant's colours here, not swap their banner image for them.
 */
const TenantThemeSection: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useGetTenantLayoutQuery(tenantId);
  const [saveLayout, { isLoading: isSaving }] = useSaveTenantLayoutAsPlatformMutation();
  const [fetchPreview, { data: preview, isLoading: isPreviewLoading }] =
    usePreviewTenantTemplateAsPlatformMutation();
  const [theme, setTheme] = useState<EmailThemeColors>({});

  const refreshPreview = () => {
    void fetchPreview({ tenantId, body: { notification_type: THEME_PREVIEW_SAMPLE_TYPE } });
  };

  useEffect(() => {
    if (!data) return;
    const loaded: EmailThemeColors = {};
    THEME_COLOR_KEYS.forEach((key) => {
      loaded[key] = data[key] ?? null;
    });
    setTheme(loaded);
    refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading) {
    return <Loader />;
  }

  const handleChange = (key: keyof EmailThemeColors, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await saveLayout({ tenantId, body: theme }).unwrap();
      showToast({ message: "This company's theme was updated.", type: 'success' });
      refreshPreview();
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to save this theme.'),
        type: 'error',
      });
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Typography variant="h6" className="mb-1 block">
            Brand colours
          </Typography>
          <Typography variant="caption" className="block text-gray-500">
            Applies to this company's candidate-facing mail only — never their invite email, which
            always carries CareerForce Pro's own branding.
          </Typography>
        </div>
        <Button
          type="button"
          appname="save tenant theme"
          onClick={handleSave}
          disabled={isSaving}
          className="shrink-0 rounded-3xl bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <EmailThemeColorFields
            theme={theme}
            fallback={CORPORATE_DEFAULTS}
            onChange={handleChange}
            disabled={isSaving}
          />
        </div>
        <EmailLivePreviewPanel
          isLoading={isPreviewLoading}
          preview={preview}
          onRefresh={refreshPreview}
        />
      </div>
    </section>
  );
};

const humanizeType = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/**
 * Super Admin's per-company Email Templates tab. Two sections stacked:
 *
 *   1. TenantThemeSection — this company's 16 brand colors, against the
 *      real notification-service `tenants/{id}/layout` route (no banner
 *      upload here: that route is tenant-self-service-only).
 *   2. The "notification copy" section below — this tenant's overrides for
 *      notification-service's security/onboarding/lifecycle messages,
 *      editable on their behalf. No pack picker here: only
 *      the per-tenant override endpoints have a confirmed platform-mounted
 *      equivalent (GET/PUT/DELETE .../platform/template-settings/tenants/{id}/overrides).
 *      Same section card styling as CompanySettings/TenantOverrideSection.tsx.
 *
 * Used to also stack the legacy `EmailBrandingEditor` here — banner + 16
 * colors against a `tenant-service` backend that predates the
 * organization-service split and no longer exists anywhere in CFPro2.0.
 * Retired in favor of `TenantThemeSection` above, which does the real
 * colors on a backend that actually exists locally.
 */
const EmailTemplatesPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useListPlatformTenantOverridesQuery(tenantId);
  const [editingOverride, setEditingOverride] = useState<TemplateOverride | null>(null);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="p-4 flex flex-col gap-6">
      <TenantThemeSection tenantId={tenantId} />

      <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <Typography variant="h6" className="mb-1 block">
          Notification copy
        </Typography>
        <Typography variant="caption" className="mb-4 block text-gray-500">
          Every message CareerForce Pro can send on this company&apos;s behalf. Edit the ones that
          need this tenant&apos;s own words — the rest use the platform&apos;s default copy.
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
              <Button
                type="button"
                appname="edit notification template"
                onClick={() => setEditingOverride(override)}
                className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </Button>
            </div>
          ))}
          {data && data.overrides.length === 0 && (
            <p className="p-4 text-sm text-gray-500">
              No notification templates are seeded on this environment yet.
            </p>
          )}
        </div>
      </section>

      <PlatformEmailTemplateOverrideModal
        open={editingOverride !== null}
        tenantId={tenantId}
        override={editingOverride}
        onClose={() => setEditingOverride(null)}
      />
    </div>
  );
};

export default EmailTemplatesPanel;
