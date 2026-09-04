import React, { useEffect, useRef, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { AiOutlineCloudUpload } from 'react-icons/ai';
import { useSelector } from 'react-redux';
import { Button, Typography, showToast } from '../shared';
import CollapsibleSection from '../shared/ui/CollapsibleSection';
import { Loader } from '../shared/ui/loader';
import EmailThemeColorFields from '../shared/ui/EmailThemeColorFields';
import EmailLivePreviewPanel from '../shared/ui/EmailLivePreviewPanel';
import {
  useGetTemplateLayoutQuery,
  useRevertTemplateLayoutMutation,
  useSaveTemplateLayoutMutation,
  usePreviewTemplateMutation,
  SaveLayoutRequest,
} from '../../api/notification-service/TemplateSettings/index';
import {
  useGetTenantProfileQuery,
  useUploadTenantEmailBannerMutation,
  useUpdateTenantProfileMutation,
} from '../../api/organization-service/Tenants/profile';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';
import { RootState } from '../../redux/provider/store';
import {
  EmailThemeColors,
  THEME_COLOR_KEYS,
  THEME_PREVIEW_SAMPLE_TYPE,
} from '../../shared/utils/notifications/emailTheme';

// Every field defaults to this pack's look when the tenant hasn't set it —
// same values `jinja_renderer.py`'s `_PACK_THEME_DEFAULTS[PackKey.CORPORATE]`
// falls back to, so an untouched picker matches what a real send renders.
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
 * A tenant's own header/footer/CSS chrome AND 16 brand colours AND banner —
 * everything `PUT /v1/template-settings/layout` accepts together (migration
 * `0015_email_theme_colors`). Independent of the per-type overrides above: a
 * tenant can rebrand the chrome while keeping every type's copy on the
 * platform default, or the reverse.
 *
 * The banner itself is NOT a notification-service field — uploading a file
 * goes through organization-service's existing presigned-S3 pipeline (the
 * same one the company logo already uses), and only the resulting storage
 * key is persisted, via `PATCH /tenants/{id}/profile`'s `email_banner`
 * field. notification-service reads it back from there at send time
 * (`get_tenant_branding`), the same way it already reads `logo_url`.
 *
 * The Live Preview panel calls the REAL `POST /template-settings/preview`
 * (fixed to render through the same doc-template path real sends use — see
 * that endpoint's own docstring) with a representative candidate-facing
 * type, so what's shown here is what actually gets mailed, not a
 * client-reconstructed guess. It reflects the last SAVE, not unsaved
 * keystrokes — refreshed automatically right after a successful save.
 *
 * The banner preview shown here loads from `TenantProfile.email_banner_url`
 * (now resolved on `GET /tenants/{id}/profile`, the same way `logo_url`
 * already is) — so a banner uploaded in a PREVIOUS session shows correctly
 * on reload, not just the one just picked this session.
 */
const EmailLayoutSection: React.FC = () => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const { data, isLoading } = useGetTemplateLayoutQuery();
  const { data: profile } = useGetTenantProfileQuery(tenantId ?? '', { skip: !tenantId });
  const [saveLayout, { isLoading: isSaving }] = useSaveTemplateLayoutMutation();
  const [revertLayout, { isLoading: isReverting }] = useRevertTemplateLayoutMutation();
  const [uploadBanner, { isLoading: isUploadingBanner }] = useUploadTenantEmailBannerMutation();
  const [updateProfile, { isLoading: isSavingBanner }] = useUpdateTenantProfileMutation();
  const [fetchPreview, { data: preview, isLoading: isPreviewLoading }] =
    usePreviewTemplateMutation();

  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [css, setCss] = useState('');
  const [theme, setTheme] = useState<EmailThemeColors>({});
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshPreview = () => {
    void fetchPreview({ notification_type: THEME_PREVIEW_SAMPLE_TYPE });
  };

  useEffect(() => {
    if (data) {
      setHeaderHtml(data.header_html || '');
      setFooterHtml(data.footer_html || '');
      setCss(data.css || '');
      const loaded: EmailThemeColors = {};
      THEME_COLOR_KEYS.forEach((key) => {
        loaded[key] = data[key] ?? null;
      });
      setTheme(loaded);
      refreshPreview();
    }
  }, [data]);

  useEffect(() => {
    // Only from the server, and only while nothing picked THIS session
    // stands in front of it — `handleBannerPick` is the only other writer
    // of `bannerUrl`, and a freshly-chosen file must never be clobbered by
    // a slower profile refetch landing after it.
    if (profile?.email_banner_url && !bannerFile) {
      setBannerUrl(profile.email_banner_url);
    }
  }, [profile?.email_banner_url]);

  const isBusy = isSaving || isReverting || isUploadingBanner || isSavingBanner;

  if (isLoading) {
    return <Loader />;
  }

  const handleColorChange = (key: keyof EmailThemeColors, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const handleBannerPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast({ message: 'File size must be less than 5 MB', type: 'error' });
      return;
    }
    setBannerFile(file);
    setBannerUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setFormError(null);
    try {
      const body: SaveLayoutRequest = {
        header_html: headerHtml || null,
        footer_html: footerHtml || null,
        css: css || null,
        ...theme,
      };
      await saveLayout(body).unwrap();

      if (bannerFile) {
        const { storage_key } = await uploadBanner({ tenantId, file: bannerFile }).unwrap();
        await updateProfile({ tenantId, email_banner: storage_key }).unwrap();
        setBannerFile(null);
      }

      showToast({ message: 'Layout updated.', type: 'success' });
      refreshPreview();
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
      setTheme({});
      setBannerUrl(null);
      setBannerFile(null);
      showToast({ message: 'Reverted to the platform default chrome.', type: 'success' });
      refreshPreview();
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
        Brand colours &amp; banner
      </Typography>
      <Typography variant="caption" className="mb-4 block text-gray-500">
        Applies to candidate-facing mail only — your company logo already shows there. This never
        changes the Company-Admin invite or sign-in emails, which always carry CareerForce
        Pro&apos;s own branding.
      </Typography>

      {formError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Side by side: fields on the left, Live Preview sticky on the
          right — the three edit sections below are collapsible (closed by
          default, Brand colours starts open since that's the most common
          edit) instead of all standing open and stacked at once, which is
          what made this column run so much taller than the preview beside
          it. See EmailLivePreviewPanel's own comment for why the preview
          itself grew from 500px to 640px tall (that box being too short for
          a typical rendered email was the real "not fully visible" bug). */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col divide-y divide-gray-100">
            <CollapsibleSection title="Banner image">
              <Typography variant="caption" className="mb-3 block text-gray-400">
                Shown at the top of every candidate-facing email. Recommended: under 5 MB, roughly
                1200×500px.
              </Typography>
              <div
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-8 hover:border-brand-400 hover:bg-brand-50/20"
                onClick={() => fileInputRef.current?.click()}
              >
                {bannerUrl ? (
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="max-h-20 max-w-full rounded object-contain"
                  />
                ) : (
                  <AiOutlineCloudUpload className="text-4xl text-gray-400" />
                )}
                <p className="text-sm text-gray-500">
                  {bannerFile ? bannerFile.name : 'Upload a banner image'}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleBannerPick}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Brand colours" defaultOpen>
              <EmailThemeColorFields
                theme={theme}
                fallback={CORPORATE_DEFAULTS}
                onChange={handleColorChange}
                disabled={isBusy}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Advanced: raw header / footer / CSS">
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
              </div>
            </CollapsibleSection>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            {data?.has_layout && (
              <Button
                type="button"
                appname="revert layout to default"
                onClick={handleRevert}
                disabled={isBusy}
                className="rounded-3xl border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReverting ? 'Reverting…' : 'Revert to default'}
              </Button>
            )}
            <Button
              type="button"
              appname="save layout"
              onClick={handleSave}
              disabled={isBusy}
              className="rounded-3xl bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving || isUploadingBanner || isSavingBanner ? 'Saving…' : 'Save layout'}
            </Button>
          </div>
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

export default EmailLayoutSection;
