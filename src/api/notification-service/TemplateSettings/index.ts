import { notifApi } from '../notifApi';
import type { EmailThemeColors } from '../../../shared/utils/notifications/emailTheme';

/**
 * Tenant self-service template settings — `/v1/template-settings/*`,
 * `tenant:read`/`tenant:write` gated. Matches
 * app/modules/templates/api/{responses,requests}.py field-for-field.
 *
 * Mostly email, but eight notification types also carry SMS wording
 * (`TemplateOverride.sms_message`, `null` for every type without an SMS
 * variant) — a tenant may override that text the same way they override
 * `subject`/`html_body`, via the same PUT. There is still no separate
 * per-tenant SMS "pack" or theme: SMS text has no chrome, so the only thing
 * to customise is the message itself.
 */
export interface TemplatePack {
  key: string;
  name: string;
  description: string;
  accent_colour: string;
  is_selected: boolean;
}

export interface TemplatePackListView {
  packs: TemplatePack[];
}

export interface TemplatePreview {
  subject: string | null;
  body_html: string | null;
  body_text: string;
}

export interface TemplateOverride {
  notification_type: string;
  is_customised: boolean;
  subject: string;
  html_body: string;
  organization_layout_id?: string | null;
  /** `null` means this notification type has no SMS variant at all — don't
   * show an SMS field for it. Any other value is the SMS wording that will
   * actually send: this tenant's own if customised, the platform's default
   * otherwise (see `is_customised`, which only reflects copy, not chrome). */
  sms_message?: string | null;
}

export interface TemplateOverrideListView {
  overrides: TemplateOverride[];
}

export interface TemplateLayout extends EmailThemeColors {
  has_layout: boolean;
  header_html?: string | null;
  footer_html?: string | null;
  css?: string | null;
}

export interface SelectPackRequest {
  pack_key: string;
}

export interface PreviewTemplateRequest {
  notification_type: string;
  /** Omit to preview the tenant's currently-selected pack. */
  pack_key?: string;
  /** Defaults to email. Set to `'sms'` to preview a type's SMS wording
   * instead — rendering the email half tells you nothing about whether the
   * SMS text will actually fit or render. */
  channel?: 'email' | 'sms';
}

export interface SaveOverrideRequest {
  subject: string;
  html_body: string;
  organization_layout_id?: string | null;
  /** Omit to leave this type's SMS wording untouched; `null` reverts an
   * existing SMS override back to the platform's default text. Ignored by
   * the backend for a type with no SMS variant at all. */
  sms_message?: string | null;
}

export interface SaveLayoutRequest extends EmailThemeColors {
  header_html?: string | null;
  footer_html?: string | null;
  css?: string | null;
}

/**
 * A real, seeded notification type used purely to render a representative
 * sample when previewing a PACK (theme) rather than one specific type's
 * copy — same choice notification-service's own doc_override_shared.py and
 * the demo script in docs/NOTIFICATION_EVENT_FLOW.md make (`tenant_user_invited`
 * is "any real, seeded notification type — it only labels error messages and
 * supplies a sample body/subject").
 */
export const PACK_PREVIEW_SAMPLE_TYPE = 'tenant_user_invited';

const templateSettingsApi = notifApi.injectEndpoints({
  endpoints: (build) => ({
    getTemplatePacks: build.query<TemplatePackListView, void>({
      query: () => ({ url: '/v1/template-settings/packs', method: 'GET' }),
      providesTags: ['TemplatePacks'],
    }),
    selectTemplatePack: build.mutation<void, SelectPackRequest>({
      query: (body) => ({ url: '/v1/template-settings', method: 'PUT', body }),
      invalidatesTags: ['TemplatePacks', 'TemplateOverrides'],
    }),
    previewTemplate: build.mutation<TemplatePreview, PreviewTemplateRequest>({
      query: (body) => ({ url: '/v1/template-settings/preview', method: 'POST', body }),
    }),
    listTemplateOverrides: build.query<TemplateOverrideListView, void>({
      query: () => ({ url: '/v1/template-settings/overrides', method: 'GET' }),
      providesTags: ['TemplateOverrides'],
    }),
    saveTemplateOverride: build.mutation<
      TemplateOverride,
      { notificationType: string; body: SaveOverrideRequest }
    >({
      query: ({ notificationType, body }) => ({
        url: `/v1/template-settings/overrides/${notificationType}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['TemplateOverrides'],
    }),
    revertTemplateOverride: build.mutation<void, string>({
      query: (notificationType) => ({
        url: `/v1/template-settings/overrides/${notificationType}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TemplateOverrides'],
    }),
    getTemplateLayout: build.query<TemplateLayout, void>({
      query: () => ({ url: '/v1/template-settings/layout', method: 'GET' }),
      providesTags: ['TemplateLayout'],
    }),
    saveTemplateLayout: build.mutation<TemplateLayout, SaveLayoutRequest>({
      query: (body) => ({ url: '/v1/template-settings/layout', method: 'PUT', body }),
      invalidatesTags: ['TemplateLayout'],
    }),
    revertTemplateLayout: build.mutation<void, void>({
      query: () => ({ url: '/v1/template-settings/layout', method: 'DELETE' }),
      invalidatesTags: ['TemplateLayout'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTemplatePacksQuery,
  useSelectTemplatePackMutation,
  usePreviewTemplateMutation,
  useListTemplateOverridesQuery,
  useSaveTemplateOverrideMutation,
  useRevertTemplateOverrideMutation,
  useGetTemplateLayoutQuery,
  useSaveTemplateLayoutMutation,
  useRevertTemplateLayoutMutation,
} = templateSettingsApi;
