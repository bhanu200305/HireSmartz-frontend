import { orgApi } from '../orgApi';
import type { ScoringConfig } from '../Tenants/scoringConfig';

// GET/PUT /v1/platform/scoring-config — the platform-default weights every
// tenant starts with unless it sets its own (Tenants/scoringConfig.ts).
// Mounted as its own top-level router on the backend (not nested under
// /platform/tenants) specifically to avoid colliding with the
// /platform/tenants/{tenant_id} path parameter — see platform_router.py's
// own comment on why.
export type UpdatePlatformTenantScoringConfigArgs = {
  tenantId: string;
  weights: Record<string, number>;
  // UpdateTenantScoringConfigAsPlatformRequest — Super Admin-only lever, not
  // present on the tenant's own self-service PUT. Omitted (not sent) leaves
  // the current lock state unchanged; the backend requires `weights` on
  // every call regardless, so a lock-only toggle still resends the current
  // weights alongside it.
  is_locked?: boolean;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getPlatformScoringConfig: build.query<ScoringConfig, void>({
      query: () => '/v1/platform/scoring-config',
      providesTags: ['PlatformScoringConfig'],
    }),
    updatePlatformScoringConfig: build.mutation<ScoringConfig, Record<string, number>>({
      query: (weights) => ({
        url: '/v1/platform/scoring-config',
        method: 'PUT',
        body: { weights },
      }),
      invalidatesTags: ['PlatformScoringConfig'],
    }),
    // A SPECIFIC tenant's own weights, on their behalf — distinct from the
    // platform-wide default above. Same ScoringConfigView shape, tenant
    // bound from the path (mirrors Tenants/scoringConfig.ts).
    getPlatformTenantScoringConfig: build.query<ScoringConfig, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/scoring-config`,
      providesTags: (_result, _error, tenantId) => [
        { type: 'ScoringConfig', id: `platform-${tenantId}` },
      ],
    }),
    updatePlatformTenantScoringConfig: build.mutation<
      ScoringConfig,
      UpdatePlatformTenantScoringConfigArgs
    >({
      query: ({ tenantId, weights, is_locked }) => ({
        url: `/v1/platform/tenants/${tenantId}/scoring-config`,
        method: 'PUT',
        body: is_locked === undefined ? { weights } : { weights, is_locked },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'ScoringConfig', id: `platform-${tenantId}` },
      ],
    }),
  }),
});

export { extendedApi as platformScoringConfigApi };

export const {
  useGetPlatformScoringConfigQuery,
  useUpdatePlatformScoringConfigMutation,
  useGetPlatformTenantScoringConfigQuery,
  useUpdatePlatformTenantScoringConfigMutation,
} = extendedApi;
