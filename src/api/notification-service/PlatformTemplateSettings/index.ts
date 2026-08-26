import { notifApi } from '../notifApi';
import type {
  TemplateOverride,
  TemplateLayout,
  SaveLayoutRequest,
  TemplatePreview,
  PreviewTemplateRequest,
} from '../TemplateSettings/index';

/**
 * Super Admin's template management — `/v1/platform/template-settings/*`,
 * `platform:read`/`platform:update` gated. Matches
 * app/modules/templates/api/{requests,responses}.py's
 * MasterTemplateView/MasterSmsTemplateView/DocOverrideView field-for-field.
 *
 * Two things a tenant's own `/v1/template-settings/*` cannot do:
 *   1. Edit the PLATFORM DEFAULT content every tenant without an override
 *      falls back to (master email + SMS templates).
 *   2. Edit a SPECIFIC tenant's override on that tenant's behalf — support
 *      acting for a tenant, not a tenant acting for itself.
 */
export interface MasterTemplate {
  notification_type: string;
  subject: string;
  html_body: string;
}

export interface MasterTemplateListView {
  templates: MasterTemplate[];
}

export interface MasterSmsTemplate {
  notification_type: string;
  message: string;
}

export interface MasterSmsTemplateListView {
  templates: MasterSmsTemplate[];
}

export interface SaveMasterTemplateRequest {
  subject: string;
  html_body: string;
}

export interface ImpactedTenant {
  tenant_id: string;
  tenant_name: string;
}

export interface PushResult {
  total_affected: number;
  notification_types: string[];
}

export interface PushTemplatesToTenantsView {
  requires_confirmation: boolean;
  impacted_tenants: ImpactedTenant[];
  push_result: PushResult | null;
}

export interface PushTemplatesToTenantsArgs {
  tenantIds: string[];
  performChanges: boolean;
  confirmed: boolean;
}

export interface SaveMasterSmsTemplateRequest {
  message: string;
}

const platformTemplateSettingsApi = notifApi.injectEndpoints({
  endpoints: (build) => ({
    listMasterTemplates: build.query<MasterTemplateListView, void>({
      query: () => ({ url: '/v1/platform/template-settings/master-templates', method: 'GET' }),
      providesTags: ['PlatformMasterTemplates'],
    }),
    saveMasterTemplate: build.mutation<
      MasterTemplate,
      { notificationType: string; body: SaveMasterTemplateRequest }
    >({
      query: ({ notificationType, body }) => ({
        url: `/v1/platform/template-settings/master-templates/${notificationType}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformMasterTemplates'],
    }),
    listMasterSmsTemplates: build.query<MasterSmsTemplateListView, void>({
      query: () => ({
        url: '/v1/platform/template-settings/master-sms-templates',
        method: 'GET',
      }),
      providesTags: ['PlatformMasterSmsTemplates'],
    }),
    saveMasterSmsTemplate: build.mutation<
      MasterSmsTemplate,
      { notificationType: string; body: SaveMasterSmsTemplateRequest }
    >({
      query: ({ notificationType, body }) => ({
        url: `/v1/platform/template-settings/master-sms-templates/${notificationType}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformMasterSmsTemplates'],
    }),
    listTenantOverrides: build.query<{ overrides: TemplateOverride[] }, string>({
      query: (tenantId) => ({
        url: `/v1/platform/template-settings/tenants/${tenantId}/overrides`,
        method: 'GET',
      }),
      providesTags: ['PlatformTenantOverrides'],
    }),
    saveTenantOverrideAsPlatform: build.mutation<
      TemplateOverride,
      {
        tenantId: string;
        notificationType: string;
        body: {
          subject: string;
          html_body: string;
          organization_layout_id?: string | null;
          /** Omit to leave SMS wording untouched; `null` reverts it to the
           * platform default. Ignored for a type with no SMS variant. */
          sms_message?: string | null;
        };
      }
    >({
      query: ({ tenantId, notificationType, body }) => ({
        url: `/v1/platform/template-settings/tenants/${tenantId}/overrides/${notificationType}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformTenantOverrides'],
    }),
    revertTenantOverrideAsPlatform: build.mutation<
      void,
      { tenantId: string; notificationType: string }
    >({
      query: ({ tenantId, notificationType }) => ({
        url: `/v1/platform/template-settings/tenants/${tenantId}/overrides/${notificationType}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformTenantOverrides'],
    }),

    // -- a pack's platform-default chrome + 16 brand colours ----------------
    // `GET/PUT /v1/platform/template-settings/master-layout/{layout_name}` —
    // `layout_name` is one of the three fixed packs ("Corporate", "Modern",
    // "Minimal"; see TemplatePack.layout_name). Editing this changes what
    // every tenant on that pack sees UNLESS they've saved their own theme.
    getMasterLayout: build.query<TemplateLayout, string>({
      query: (layoutName) => ({
        url: `/v1/platform/template-settings/master-layout/${layoutName}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, layoutName) => [
        { type: 'PlatformMasterLayout', id: layoutName },
      ],
    }),
    saveMasterLayout: build.mutation<TemplateLayout, { layoutName: string; body: SaveLayoutRequest }>({
      query: ({ layoutName, body }) => ({
        url: `/v1/platform/template-settings/master-layout/${layoutName}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { layoutName }) => [
        { type: 'PlatformMasterLayout', id: layoutName },
      ],
    }),

    // -- one specific tenant's own chrome + 16 brand colours, edited on
    // their behalf -----------------------------------------------------------
    // `GET/PUT /v1/platform/template-settings/tenants/{tenant_id}/layout` —
    // no banner upload here: uploading a file to storage is still tenant
    // self-service only (`POST /{tenant_id}/email-banner/upload-url` on
    // organization-service requires `require_own_tenant`, same as the logo
    // upload it mirrors) — a Super Admin can restyle a tenant's colors here,
    // not swap their banner image.
    getTenantLayout: build.query<TemplateLayout, string>({
      query: (tenantId) => ({
        url: `/v1/platform/template-settings/tenants/${tenantId}/layout`,
        method: 'GET',
      }),
      providesTags: (_result, _error, tenantId) => [{ type: 'PlatformTenantLayout', id: tenantId }],
    }),
    saveTenantLayoutAsPlatform: build.mutation<
      TemplateLayout,
      { tenantId: string; body: SaveLayoutRequest }
    >({
      query: ({ tenantId, body }) => ({
        url: `/v1/platform/template-settings/tenants/${tenantId}/layout`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'PlatformTenantLayout', id: tenantId },
      ],
    }),

    // `POST /v1/platform/template-settings/preview` — the third point on the
    // same preview axis: no tenant at all, just a pack's platform-default
    // theme. `pack_key` is required here (unlike the tenant-scoped siblings)
    // since there's no tenant's "current pack" to fall back to.
    previewMasterTemplate: build.mutation<
      TemplatePreview,
      { notificationType: string; packKey: string; channel?: 'email' | 'sms' }
    >({
      query: ({ notificationType, packKey, channel }) => ({
        url: '/v1/platform/template-settings/preview',
        method: 'POST',
        body: { notification_type: notificationType, pack_key: packKey, channel },
      }),
    }),

    // `POST /v1/platform/template-settings/tenants/push` — bulk-revert every
    // tenant-editable email type for several tenants at once, back to the
    // platform default. Two-step: call with performChanges=false first to
    // find out which tenants hold customisations that would be lost, then
    // again with performChanges=true (and confirmed=true if any were found).
    pushTemplatesToTenants: build.mutation<PushTemplatesToTenantsView, PushTemplatesToTenantsArgs>({
      query: ({ tenantIds, performChanges, confirmed }) => ({
        url: '/v1/platform/template-settings/tenants/push',
        method: 'POST',
        body: {
          tenant_ids: tenantIds,
          perform_changes: performChanges,
          confirmed,
        },
      }),
      invalidatesTags: ['PlatformTenantOverrides'],
    }),

    // `POST /v1/platform/template-settings/tenants/{tenant_id}/preview` —
    // sibling to the tenant's own `/template-settings/preview`, binding the
    // tenant explicitly from the path since a platform operator has none of
    // their own. Same doc-template-first rendering, so this reflects that
    // company's real saved copy, colors and banner.
    previewTenantTemplateAsPlatform: build.mutation<
      TemplatePreview,
      { tenantId: string; body: PreviewTemplateRequest }
    >({
      query: ({ tenantId, body }) => ({
        url: `/v1/platform/template-settings/tenants/${tenantId}/preview`,
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useListMasterTemplatesQuery,
  useSaveMasterTemplateMutation,
  useListMasterSmsTemplatesQuery,
  useSaveMasterSmsTemplateMutation,
  useListTenantOverridesQuery: useListPlatformTenantOverridesQuery,
  useSaveTenantOverrideAsPlatformMutation,
  useRevertTenantOverrideAsPlatformMutation,
  useGetMasterLayoutQuery,
  useSaveMasterLayoutMutation,
  useGetTenantLayoutQuery,
  useSaveTenantLayoutAsPlatformMutation,
  usePreviewTenantTemplateAsPlatformMutation,
  usePushTemplatesToTenantsMutation,
  usePreviewMasterTemplateMutation,
} = platformTemplateSettingsApi;
