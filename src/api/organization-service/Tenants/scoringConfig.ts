import { orgApi } from '../orgApi';

// ScoringConfigView. `available` used to mean "ai-service didn't answer" back
// when this was a live proxy — scoring config is now a real, working
// org-service feature of its own, so `available` is always `true` on the
// wire today. Kept on the type for backward compatibility with any cached
// response shape, but nothing should branch on it any more.
export type ScoringConfig = {
  available: boolean;
  weights: Record<string, number>;
  is_locked: boolean;
};

export type UpdateScoringConfigArgs = {
  tenantId: string;
  weights: Record<string, number>;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getTenantScoringConfig: build.query<ScoringConfig, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/scoring-config`,
      providesTags: (_result, _error, tenantId) => [{ type: 'ScoringConfig', id: tenantId }],
    }),
    updateTenantScoringConfig: build.mutation<ScoringConfig, UpdateScoringConfigArgs>({
      query: ({ tenantId, weights }) => ({
        url: `/v1/tenants/${tenantId}/scoring-config`,
        method: 'PUT',
        body: { weights },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [{ type: 'ScoringConfig', id: tenantId }],
    }),
  }),
});

export { extendedApi as tenantScoringConfigApi };

export const { useGetTenantScoringConfigQuery, useUpdateTenantScoringConfigMutation } = extendedApi;
