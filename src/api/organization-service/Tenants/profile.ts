import { orgApi } from '../orgApi';

// GET /v1/tenants/{tenant_id}/profile — TenantProfileView. The widest tenant
// view in the service: every field the Company Admin can see/edit on their
// own company. No `culture_intro` here — that's a genuinely separate
// resource (GET/PUT /tenants/{tenant_id}/culture-intro, see
// Tenants/cultureIntro.ts), never part of this one.
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
// means "leave unchanged". `extra="forbid"` on the backend — sending a
// field this type doesn't declare 422s the WHOLE request, not just that
// field (culture_intro used to be listed here despite never being a real
// field on the backend request model, which broke every save on this form).
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

// POST /v1/tenants/{tenant_id}/logo/upload — server-mediated: the file is
// POSTed to organization-service directly as multipart/form-data
// (RequestTenantLogoUploadUseCase writes it to S3 from there), never a
// browser-direct-to-S3 presigned upload — the shared bucket has no CORS
// config, so that shape silently fails in the browser. Same reasoning as
// Tenants/imports.ts's uploadRosterFile. No confirm endpoint: the caller
// persists the returned `storage_key` via updateTenantProfile's `logo`
// field directly.
export type UploadTenantLogoArgs = {
  tenantId: string;
  file: File;
};

// POST /v1/tenants/{tenant_id}/email-banner/upload — identical server-mediated
// shape to the logo upload above (`TenantEmailBannerUploadView` mirrors
// `TenantLogoUploadView` on the backend); the caller persists `storage_key`
// via updateTenantProfile's `email_banner` field. Tenant self-service only —
// this route is `require_own_tenant`-guarded the same way the logo one is,
// so there is no platform-on-behalf-of-a-tenant equivalent.
export type UploadTenantEmailBannerArgs = {
  tenantId: string;
  file: File;
};

export type TenantFileUploadResult = {
  storage_key: string;
};

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
    uploadTenantLogo: build.mutation<TenantFileUploadResult, UploadTenantLogoArgs>({
      query: ({ tenantId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/v1/tenants/${tenantId}/logo/upload`,
          method: 'POST',
          body: formData,
        };
      },
    }),
    uploadTenantEmailBanner: build.mutation<TenantFileUploadResult, UploadTenantEmailBannerArgs>({
      query: ({ tenantId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/v1/tenants/${tenantId}/email-banner/upload`,
          method: 'POST',
          body: formData,
        };
      },
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
  useUploadTenantLogoMutation,
  useUploadTenantEmailBannerMutation,
  useGetTenantDashboardQuery,
  useListTenantActivityQuery,
} = extendedApi;
