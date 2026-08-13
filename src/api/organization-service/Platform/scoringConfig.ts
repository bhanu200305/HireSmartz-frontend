import { orgApi } from '../orgApi';
import type { ScoringConfig } from '../Tenants/scoringConfig';

// GET/PUT /v1/platform/scoring-config — the platform-default weights every
// tenant starts with unless it sets its own (Tenants/scoringConfig.ts).
// Mounted as its own top-level router on the backend (not nested under
// /platform/tenants) specifically to avoid colliding with the
// /platform/tenants/{tenant_id} path parameter — see platform_router.py's
// own comment on why.
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
  }),
});

export const { useGetPlatformScoringConfigQuery, useUpdatePlatformScoringConfigMutation } =
  extendedApi;
