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
  /** The industry's name, resolved by the server from `industry_id`. */
  industry_name?: string | null;
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
// `logo` accepts either a storage key from the upload-url flow below OR a
// plain externally-scraped URL (e.g. from ai-service's org-scrape result) —
// the backend only verifies storage-key values against its own storage and
// passes through anything else as-is (`update_tenant_profile.py`'s
// `_verify_uploaded`).
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

// POST /v1/tenants/{tenant_id}/logo/upload — server-mediated: the browser
// POSTs the file straight to organization-service as normal multipart form
// data, and this service writes it to S3 itself. Previously a presigned-POST
// the browser sent directly to S3 (same shape as the old roster-import
// upload — see Tenants/imports.ts's own note on why that broke locally and
// was changed for the same CORS reason). No confirm endpoint: after this
// upload succeeds, the caller persists the returned `storage_key` via
// updateTenantProfile's `logo` field directly.
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

export type TenantAssetUploadResponse = {
  storage_key: string;
};

export type ActivityLogEntry = {
  id: string;
  actor_id: string;
  // Resolved server-side from `actor_id` — a tenant user, or (for a
  // platform account acting on this tenant's behalf) a platform staff
  // member. `null` when neither resolves; render `actor_id` as the
  // fallback in that case, never leave the "By" column blank.
  actor_name: string | null;
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

// GET /v1/tenants/{tenant_id}/dashboard — TenantDashboardSummaryView. Same
// shape the Super Admin's mirror endpoint returns (see Platform/tenants.ts's
// `PlatformTenantDashboard`) — `open_job_count`/`total_applications`/
// `completed_interviews` are proxied from job-service/candidate-service, not
// placeholders.
export type TenantDashboardSummary = {
  team_size: number;
  pending_invite_count: number;
  entitlements: EntitlementsView;
  recent_activity: ActivityLogEntry[];
  /** `null` means job-service didn't answer — render "not available", never 0. */
  open_job_count: number | null;
  /** `null` means candidate-service didn't answer — same "not available" rule
   * as `open_job_count`. Always `null` together, never independently — both
   * come from one proxied call (org-service's `CandidateServicePort`). */
  total_applications: number | null;
  completed_interviews: number | null;
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
    uploadTenantLogo: build.mutation<TenantAssetUploadResponse, UploadTenantLogoArgs>({
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
    uploadTenantEmailBanner: build.mutation<TenantAssetUploadResponse, UploadTenantEmailBannerArgs>(
      {
        query: ({ tenantId, file }) => {
          const formData = new FormData();
          formData.append('file', file);
          return {
            url: `/v1/tenants/${tenantId}/email-banner/upload`,
            method: 'POST',
            body: formData,
          };
        },
      }
    ),
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
