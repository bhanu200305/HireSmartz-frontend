import { notifApi } from '../notifApi';
import type { EmailThemeColors } from '../../../shared/utils/notifications/emailTheme';

/**
 * Tenant self-service template settings — `/v1/template-settings/*`,
 * `tenant:read`/`tenant:write` gated. Matches
 * app/modules/templates/api/{responses,requests}.py field-for-field.
 *
 * This is EMAIL-only. There is no per-tenant SMS override endpoint on this
 * router — SMS copy is a platform-wide default only (see
 * `PlatformTemplateSettings`) — so there is nothing here to build an
 * "SMS Templates" tab against; MyCompany's SMS tab stays a placeholder for
 * that reason, not an oversight.
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
}

export interface SaveOverrideRequest {
  subject: string;
  html_body: string;
  organization_layout_id?: string | null;
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
