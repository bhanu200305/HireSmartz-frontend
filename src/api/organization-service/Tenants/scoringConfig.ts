import { orgApi } from '../orgApi';

// ScoringConfigView — proxied from ai-service. `available: false` means
// ai-service didn't answer; render "not available", never empty weights as
// if they were real (docs/frontend_guide.txt's repeated instruction).
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

export const { useGetTenantScoringConfigQuery, useUpdateTenantScoringConfigMutation } = extendedApi;
