import { orgApi } from '../orgApi';

// TenantSummaryView — Super Admin's companies-list row. Deliberately
// narrower than TenantProfileView (Tenants/profile.ts, the Company Admin's
// own view) — no colors/description/culture_intro, which a list row has no
// use for.
export type PlatformTenantSummary = {
  tenant_id: string;
  company_name: string;
  status: string;
  industry_id: string | null;
  signup_source: string;
  admin_email: string;
  created_at: string | null;
  /** `null` until a real activity signal exists — see the backend entity's own docstring. */
  last_active_at: string | null;
};

export type ListPlatformTenantsArgs = {
  status?: string;
  industry_id?: string;
  signup_source?: string;
  q?: string;
  // ISO 8601. Backs the "New customers this month" KPI card's drill-down —
  // org-service's GET /v1/platform/tenants already accepts both (see
  // platform_router.py), this was just never wired from the frontend.
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
};

export type ListPlatformTenantsResponse = {
  tenants: PlatformTenantSummary[];
  total: number;
};

// GET /v1/platform/tenants/{tenant_id}/dashboard — same
// TenantDashboardSummaryView as the tenant-scoped `/v1/tenants/{tenant_id}
// /dashboard` (Tenants/profile.ts's `getTenantDashboard`), just reachable
// for ANY tenant under `require_platform_permission` instead of
// `require_own_tenant`. `open_job_count` here is job-service's real count
// (org-service proxies it internally) — not a placeholder.
export type PlatformTenantDashboard = {
  team_size: number;
  pending_invite_count: number;
  /** `null` means job-service didn't answer — render "not available", never 0. */
  open_job_count: number | null;
  /** `null` means candidate-service didn't answer — same "not available" rule
   * as `open_job_count`. Always `null` together, never independently — both
   * come from one proxied call (org-service's `CandidateServicePort`). */
  total_applications: number | null;
  completed_interviews: number | null;
};

export type PlatformEntitlements = {
  is_culture_intro_enabled: boolean;
  is_config_score_enabled: boolean;
  is_candidate_intro_enabled: boolean;
  is_candidate_inquiries_enabled: boolean;
  is_location_manage_allowed: boolean;
  is_hierarchy_enabled: boolean;
  locked_flags: string[];
};

/** Super Admin's write path — the only one that may set `locked_flags`. */
export type UpdatePlatformEntitlementsArgs = {
  tenantId: string;
  is_culture_intro_enabled?: boolean;
  is_config_score_enabled?: boolean;
  is_candidate_intro_enabled?: boolean;
  is_candidate_inquiries_enabled?: boolean;
  is_location_manage_allowed?: boolean;
  is_hierarchy_enabled?: boolean;
  locked_flags?: string[];
};

export type DeleteTenantResponse = {
  status: 'deleted' | string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformTenants: build.query<ListPlatformTenantsResponse, ListPlatformTenantsArgs | void>({
      query: (args) => ({
        url: '/v1/platform/tenants',
        params: {
          ...(args?.status ? { status: args.status } : {}),
          ...(args?.industry_id ? { industry_id: args.industry_id } : {}),
          ...(args?.signup_source ? { signup_source: args.signup_source } : {}),
          ...(args?.q ? { q: args.q } : {}),
          ...(args?.created_after ? { created_after: args.created_after } : {}),
          ...(args?.created_before ? { created_before: args.created_before } : {}),
          limit: args?.limit ?? 50,
          offset: args?.offset ?? 0,
        },
      }),
      providesTags: ['PlatformTenants'],
    }),
    getPlatformTenant: build.query<PlatformTenantSummary, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}`,
      providesTags: (_result, _error, tenantId) => [{ type: 'PlatformTenants', id: tenantId }],
    }),
    getPlatformTenantDashboard: build.query<PlatformTenantDashboard, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/dashboard`,
      providesTags: (_result, _error, tenantId) => [{ type: 'PlatformTenants', id: tenantId }],
    }),
    getPlatformTenantEntitlements: build.query<PlatformEntitlements, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/entitlements`,
      providesTags: (_result, _error, tenantId) => [
        { type: 'Entitlements', id: `platform-${tenantId}` },
      ],
    }),
    updatePlatformTenantEntitlements: build.mutation<
      PlatformEntitlements,
      UpdatePlatformEntitlementsArgs
    >({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/platform/tenants/${tenantId}/entitlements`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'Entitlements', id: `platform-${tenantId}` },
        { type: 'PlatformTenants', id: tenantId },
      ],
    }),
    // DRAFT-only, enforced server-side (409 TENANT_NOT_DELETABLE otherwise)
    // — see organization-service's DeleteTenantUseCase. Soft delete, so the
    // row just stops appearing in the list below, same as any other status
    // filter would already hide it.
    deleteTenant: build.mutation<DeleteTenantResponse, { tenantId: string }>({
      query: ({ tenantId }) => ({
        url: `/v1/platform/tenants/${tenantId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformTenants'],
    }),
  }),
});

export const {
  useListPlatformTenantsQuery,
  useGetPlatformTenantQuery,
  useGetPlatformTenantDashboardQuery,
  useGetPlatformTenantEntitlementsQuery,
  useUpdatePlatformTenantEntitlementsMutation,
  useDeleteTenantMutation,
} = extendedApi;
