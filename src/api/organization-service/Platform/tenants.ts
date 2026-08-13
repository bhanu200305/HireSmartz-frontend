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
  limit?: number;
  offset?: number;
};

export type ListPlatformTenantsResponse = {
  tenants: PlatformTenantSummary[];
  total: number;
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
  }),
});

export const {
  useListPlatformTenantsQuery,
  useGetPlatformTenantQuery,
  useGetPlatformTenantEntitlementsQuery,
  useUpdatePlatformTenantEntitlementsMutation,
} = extendedApi;
