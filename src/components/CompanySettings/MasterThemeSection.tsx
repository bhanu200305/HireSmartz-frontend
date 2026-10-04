import React, { useEffect, useState } from 'react';
import { MdPalette } from 'react-icons/md';
import { Button, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import EmailThemeColorFields from '../shared/ui/EmailThemeColorFields';
import EmailLivePreviewPanel from '../shared/ui/EmailLivePreviewPanel';
import {
  useGetMasterLayoutQuery,
  useSaveMasterLayoutMutation,
  usePreviewMasterTemplateMutation,
} from '../../api/notification-service/PlatformTemplateSettings/index';
import {
  EmailThemeColors,
  THEME_COLOR_KEYS,
  THEME_PREVIEW_SAMPLE_TYPE,
} from '../../shared/utils/notifications/emailTheme';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';

// `layout_name` (what master-layout GET/PUT key on, capitalized — "Corporate")
// vs `PackKey` (what /preview's `pack_key` needs, lowercase — "corporate").
// Two different wire vocabularies for the same three packs; this screen's
// own `PACKS[].key` follows the layout_name one since that's what the rest
// of it already calls, so /preview needs the one translation.
const toPackKey = (layoutName: string): string => layoutName.toLowerCase();

// `TemplatePack.layout_name` — a fixed, closed set (see migration
// 0015_email_theme_colors's docstring); not a list this screen can add to.
const PACKS: { key: string; label: string; defaults: Required<EmailThemeColors> }[] = [
  {
    key: 'Corporate',
    label: 'Corporate',
    defaults: {
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
    },
  },
  {
    key: 'Modern',
    label: 'Modern',
    defaults: {
      primary_color: '#4F46E5',
      secondary_color: '#EEF0FF',
      background_color: '#F5F6FF',
      text_color: '#344054',
      title_color: '#101828',
      greeting_color: '#101828',
      button_background: '#4F46E5',
      button_text: '#FFFFFF',
      button_border_color: '#4F46E5',
      highlight_background: '#FFFFFF',
      highlight_text: '#667085',
      footer_background: '#FFFFFF',
      footer_text: '#98A2B3',
      action_button_text: '#FFFFFF',
      action_button_background: '#4F46E5',
      action_button_border_color: '#4F46E5',
    },
  },
  {
    key: 'Minimal',
    label: 'Minimal',
    defaults: {
      primary_color: '#111827',
      secondary_color: '#F3F4F6',
      background_color: '#FFFFFF',
      text_color: '#344054',
      title_color: '#101828',
      greeting_color: '#101828',
      button_background: '#111827',
      button_text: '#FFFFFF',
      button_border_color: '#111827',
      highlight_background: '#FFFFFF',
      highlight_text: '#667085',
      footer_background: '#FFFFFF',
      footer_text: '#9CA3AF',
      action_button_text: '#FFFFFF',
      action_button_background: '#111827',
      action_button_border_color: '#111827',
    },
  },
];

/**
 * Platform defaults for the three theme packs —
 * `GET/PUT /v1/notification-platform/template-settings/master-layout/{layout_name}`.
 * Editing one changes what EVERY tenant on that pack sees, unless they've
 * saved their own theme (`organization_email_layout` wins when set — see
 * `doc_template_resolution.py`). Chrome (header/footer/CSS) isn't exposed
 * here deliberately: it's shared markup a color mistake can't easily break,
 * but a raw-HTML edit could, and this screen's job is the 16 colors.
 */
const MasterThemeSection: React.FC = () => {
  const [activePack, setActivePack] = useState<string>(PACKS[0].key);
  const pack = PACKS.find((p) => p.key === activePack) ?? PACKS[0];

  const { data, isLoading } = useGetMasterLayoutQuery(activePack);
  const [saveLayout, { isLoading: isSaving }] = useSaveMasterLayoutMutation();
  const [fetchPreview, { data: preview, isLoading: isPreviewLoading }] =
    usePreviewMasterTemplateMutation();
  const [theme, setTheme] = useState<EmailThemeColors>({});

  const refreshPreview = (layoutName: string) => {
    void fetchPreview({
      notificationType: THEME_PREVIEW_SAMPLE_TYPE,
      packKey: toPackKey(layoutName),
    });
  };

  useEffect(() => {
    if (!data) return;
    const loaded: EmailThemeColors = {};
    THEME_COLOR_KEYS.forEach((key) => {
      loaded[key] = data[key] ?? null;
    });
    setTheme(loaded);
    refreshPreview(activePack);
  }, [data]);

  const handleChange = (key: keyof EmailThemeColors, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!data) return;
    try {
      await saveLayout({
        layoutName: activePack,
        body: {
          header_html: data.header_html ?? null,
          footer_html: data.footer_html ?? null,
          css: data.css ?? null,
          ...theme,
        },
      }).unwrap();
      showToast({ message: `${pack.label}'s default theme was updated.`, type: 'success' });
      refreshPreview(activePack);
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to save this pack.'),
        type: 'error',
      });
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-sm">
            <MdPalette size={16} />
          </span>
          <div>
            <Typography variant="h6" className="mb-0.5 block">
              Platform Default Theme
            </Typography>
            <Typography variant="caption" className="block text-gray-500">
              What every tenant on this pack receives unless they&apos;ve set their own colors.
            </Typography>
          </div>
        </div>

        <div className="inline-flex gap-1 rounded-2xl border border-[var(--border)] bg-gray-50 p-1">
          {PACKS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setActivePack(p.key)}
              className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all ${
                p.key === activePack
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <EmailThemeColorFields
              theme={theme}
              fallback={pack.defaults}
              onChange={handleChange}
              disabled={isSaving}
            />
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                appname="save master theme"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-3xl bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : `Save ${pack.label} defaults`}
              </Button>
            </div>
          </div>
          <EmailLivePreviewPanel
            isLoading={isPreviewLoading}
            preview={preview}
            onRefresh={() => refreshPreview(activePack)}
          />
        </div>
      )}
    </section>
  );
};

export default MasterThemeSection;
