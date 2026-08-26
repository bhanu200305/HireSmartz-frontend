import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { MdOutlineSearch } from 'react-icons/md';
import { Button, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import EmailThemeColorFields from '../shared/ui/EmailThemeColorFields';
import EmailLivePreviewPanel from '../shared/ui/EmailLivePreviewPanel';
import { useListPlatformTenantsQuery } from '../../api/organization-service/Platform/tenants';
import {
  useGetTenantLayoutQuery,
  useSaveTenantLayoutAsPlatformMutation,
  usePreviewTenantTemplateAsPlatformMutation,
} from '../../api/notification-service/PlatformTemplateSettings/index';
import {
  EmailThemeColors,
  THEME_COLOR_KEYS,
  THEME_PREVIEW_SAMPLE_TYPE,
} from '../../shared/utils/notifications/emailTheme';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';

// Same values `jinja_renderer.py`'s `_PACK_THEME_DEFAULTS[PackKey.CORPORATE]`
// resolves to for any field a company hasn't set.
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
 * Search for one company and edit its 16 brand colors on their behalf —
 * `GET/PUT /v1/platform/template-settings/tenants/{tenant_id}/layout`.
 * Same picker pattern as `TenantOverrideSection` (this tab's copy
 * equivalent). Colors only: uploading a banner FILE is tenant
 * self-service only (organization-service's upload route is
 * `require_own_tenant`-guarded) — this is also reachable from
 * Companies → (a company) → Email Templates, which additionally shows
 * that company's own banner alongside these same colors.
 */
const CompanyThemeSection: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [theme, setTheme] = useState<EmailThemeColors>({});

  // No `skip` here, deliberately: an empty search still lists the first
  // page of companies (organization-service's `q` filter is optional), so
  // the dropdown is browsable by scrolling as well as by typing — not
  // search-only.
  const { data: tenantResults, isFetching: isSearching } = useListPlatformTenantsQuery({
    q: search.trim() || undefined,
    limit: 50,
  });
  const { data, isLoading } = useGetTenantLayoutQuery(selectedTenantId ?? '', {
    skip: !selectedTenantId,
  });
  const [saveLayout, { isLoading: isSaving }] = useSaveTenantLayoutAsPlatformMutation();
  const [fetchPreview, { data: preview, isLoading: isPreviewLoading }] =
    usePreviewTenantTemplateAsPlatformMutation();

  const refreshPreview = () => {
    if (!selectedTenantId) return;
    void fetchPreview({
      tenantId: selectedTenantId,
      body: { notification_type: THEME_PREVIEW_SAMPLE_TYPE },
    });
  };

  useEffect(() => {
    if (!data) return;
    const loaded: EmailThemeColors = {};
    THEME_COLOR_KEYS.forEach((key) => {
      loaded[key] = data[key] ?? null;
    });
    setTheme(loaded);
    refreshPreview();
  }, [data]);

  const handleChange = (key: keyof EmailThemeColors, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!selectedTenantId) return;
    try {
      await saveLayout({ tenantId: selectedTenantId, body: theme }).unwrap();
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
      <Typography variant="h6" className="mb-1 block">
        Edit a company&apos;s brand colours on their behalf
      </Typography>
      <Typography variant="caption" className="mb-4 block text-gray-500">
        Search for a company, then edit the colours that theme their candidate-facing mail — never
        their invite email, which always carries CareerForce Pro&apos;s own branding.
      </Typography>

      <div className="relative max-w-[420px]">
        <MdOutlineSearch
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
        />
        <Select
          showSearch
          allowClear
          placeholder="Search companies by name…"
          filterOption={false}
          loading={isSearching}
          value={selectedTenantId}
          onSearch={setSearch}
          onChange={(value) => setSelectedTenantId(value ?? null)}
          onClear={() => setSelectedTenantId(null)}
          options={tenantResults?.tenants.map((tenant) => ({
            value: tenant.tenant_id,
            label: tenant.company_name,
          }))}
          className="w-full [&_.ant-select-selector]:!rounded-full [&_.ant-select-selector]:!pl-8"
        />
      </div>

      {selectedTenantId && (
        <div className="mt-6">
          {isLoading ? (
            <Loader />
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <EmailThemeColorFields
                  theme={theme}
                  fallback={CORPORATE_DEFAULTS}
                  onChange={handleChange}
                  disabled={isSaving}
                />
                <div className="mt-6 flex justify-end">
                  <Button
                    type="button"
                    appname="save company theme"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="rounded-3xl bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
              <EmailLivePreviewPanel
                isLoading={isPreviewLoading}
                preview={preview}
                onRefresh={refreshPreview}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default CompanyThemeSection;
