import { orgApi } from '../orgApi';

// GET /v1/tenants/{tenant_id}/profile — TenantProfileView. The widest tenant
// view in the service: every field the Company Admin can see/edit on their
// own company.
// `culture_intro` is deliberately NOT a field below — it looks like a plain
// profile field but is its own separate resource on the real backend
// (`GET/PUT /v1/tenants/{tenant_id}/culture-intro`, see Tenants/cultureIntro.ts)
// with its own permission gate (`interview:read`/`interview:write`, not an
// organization permission) and its own wire field name (`intro_text`). It
// used to be listed here and sent through the PATCH below; since
// `UpdateTenantProfileRequest` is `extra="forbid"` server-side, that
// silently 422'd every save that included it — i.e. every save, since the
// old code always sent it unconditionally. Fixed by moving it to its own
// client entirely.
export type TenantProfile = {
  tenant_id: string;
  company_name: string;
  status: string;
  website_url: string | null;
  industry_id: string | null;
  admin_contact: string | null;
  logo_url: string | null;
  email_banner_url: string | null;
  colors: string[];
  description: string | null;
  company_size: number | null;
};

// PATCH /v1/tenants/{tenant_id}/profile — UpdateTenantProfileRequest. Wire
// names match the contract literally ("name"/"logo", not this service's
// internal "company_name"/"logo_url") — every field omitted, not `null`,
// means "leave unchanged". `logo` accepts either a storage key from the
// upload-url flow below OR a plain externally-scraped URL (e.g. from
// ai-service's org-scrape result) — the backend only verifies storage-key
// values against its own storage and passes through anything else as-is
// (`update_tenant_profile.py`'s `_verify_uploaded`).
export type UpdateTenantProfileRequest = {
  tenantId: string;
  name?: string;
  logo?: string;
  email_banner?: string;
  description?: string;
  website_url?: string;
  industry_id?: string;
  admin_contact?: string;
  company_size?: number;
};

export type TenantStatusResponse = {
  status: string;
};

// POST /v1/tenants/{tenant_id}/logo/upload-url — same presigned-S3-POST
// shape as RequestRosterUploadArgs/RosterUploadTarget in Tenants/imports.ts.
// No confirm endpoint: after the direct-to-S3 upload succeeds, the caller
// persists `storage_key` via updateTenantProfile's `logo` field directly.
export type RequestTenantLogoUploadArgs = {
  tenantId: string;
  filename: string;
  content_type: string;
};

// POST /v1/tenants/{tenant_id}/email-banner/upload-url — identical shape to
// the logo upload above (`TenantEmailBannerUploadView` mirrors
// `TenantLogoUploadView` on the backend); the caller persists `storage_key`
// via updateTenantProfile's `email_banner` field. Tenant self-service only —
// this route is `require_own_tenant`-guarded the same way the logo one is,
// so there is no platform-on-behalf-of-a-tenant equivalent.
export type RequestTenantEmailBannerUploadArgs = {
  tenantId: string;
  filename: string;
  content_type: string;
};

export type TenantFileUploadTarget = {
  upload_url: string;
  upload_fields: Record<string, string>;
  storage_key: string;
  expires_in: number;
};

/** @deprecated use `TenantFileUploadTarget` — kept as an alias so existing
 * call sites naming the logo-specific type don't need to change. */
export type TenantLogoUploadTarget = TenantFileUploadTarget;

/**
 * Uploads a file directly to storage using a presigned POST from either
 * `requestTenantLogoUpload` or `requestTenantEmailBannerUpload` — the bytes
 * never pass through organization-service. Same shape as `uploadRosterFile`
 * in `Tenants/imports.ts`.
 */
export const uploadTenantAssetFile = async (
  target: TenantFileUploadTarget,
  file: File
): Promise<void> => {
  const formData = new FormData();
  Object.entries(target.upload_fields).forEach(([key, value]) => formData.append(key, value));
  formData.append('file', file);

  const response = await fetch(target.upload_url, { method: 'POST', body: formData });
  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
};

/** @deprecated use `uploadTenantAssetFile` — kept so existing logo-upload
 * call sites don't need to change. */
export const uploadTenantLogoFile = uploadTenantAssetFile;

export type ActivityLogEntry = {
  id: string;
  actor_id: string;
  // Open-ended catalog on the backend — never gate rendering on a fixed
  // union of known values (docs/frontend_guide.txt: "will keep growing over
  // time, so don't build anything that breaks on seeing a new one").
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string | null;
};

export type EntitlementsView = {
  is_culture_intro_enabled: boolean;
  is_config_score_enabled: boolean;
  is_candidate_intro_enabled: boolean;
  is_candidate_inquiries_enabled: boolean;
  is_location_manage_allowed: boolean;
  is_hierarchy_enabled: boolean;
  locked_flags: string[];
};

// GET /v1/tenants/{tenant_id}/dashboard — TenantDashboardSummaryView.
export type TenantDashboardSummary = {
  team_size: number;
  pending_invite_count: number;
  entitlements: EntitlementsView;
  recent_activity: ActivityLogEntry[];
  /** `null` means job-service didn't answer — render "not available", never 0. */
  open_job_count: number | null;
};

export type ListTenantActivityArgs = {
  tenantId: string;
  limit?: number;
  offset?: number;
};

export type ListTenantActivityResponse = {
  events: ActivityLogEntry[];
  total: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getTenantProfile: build.query<TenantProfile, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/profile`,
      providesTags: (_result, _error, tenantId) => [{ type: 'Tenant', id: tenantId }],
    }),
    updateTenantProfile: build.mutation<TenantStatusResponse, UpdateTenantProfileRequest>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/profile`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [{ type: 'Tenant', id: tenantId }],
    }),
    requestTenantLogoUpload: build.mutation<TenantFileUploadTarget, RequestTenantLogoUploadArgs>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/logo/upload-url`,
        method: 'POST',
        body,
      }),
    }),
    requestTenantEmailBannerUpload: build.mutation<
      TenantFileUploadTarget,
      RequestTenantEmailBannerUploadArgs
    >({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/email-banner/upload-url`,
        method: 'POST',
        body,
      }),
    }),
    getTenantDashboard: build.query<TenantDashboardSummary, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/dashboard`,
      providesTags: (_result, _error, tenantId) => [{ type: 'Tenant', id: tenantId }],
    }),
    listTenantActivity: build.query<ListTenantActivityResponse, ListTenantActivityArgs>({
      query: ({ tenantId, limit = 20, offset = 0 }) => ({
        url: `/v1/tenants/${tenantId}/activity`,
        params: { limit, offset },
      }),
      providesTags: (_result, _error, { tenantId }) => [{ type: 'TenantActivity', id: tenantId }],
    }),
  }),
});

export const {
  useGetTenantProfileQuery,
  useUpdateTenantProfileMutation,
  useRequestTenantLogoUploadMutation,
  useRequestTenantEmailBannerUploadMutation,
  useGetTenantDashboardQuery,
  useListTenantActivityQuery,
} = extendedApi;
