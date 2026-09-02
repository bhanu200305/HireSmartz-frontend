import { orgApi } from '../orgApi';
import type { CultureIntro } from '../Tenants/cultureIntro';

// Super Admin's platform-mounted mirror of Tenants/cultureIntro.ts —
// `GET/PUT /v1/platform/tenants/{tenant_id}/culture-intro`, same
// `CultureIntroView`/`intro_text` shape, only the permission dependency
// differs (`require_platform_permission` instead of the tenant's own
// `interview:read`/`interview:write` + `require_own_tenant`). Also NOT part
// of `UpdatePlatformTenantProfileRequest` — see Platform/tenantProfile.ts.
export type UpdatePlatformCultureIntroArgs = {
  tenantId: string;
  intro_text: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getPlatformTenantCultureIntro: build.query<CultureIntro, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/culture-intro`,
      providesTags: (_result, _error, tenantId) => [{ type: 'PlatformTenants', id: tenantId }],
    }),
    updatePlatformTenantCultureIntro: build.mutation<CultureIntro, UpdatePlatformCultureIntroArgs>({
      query: ({ tenantId, intro_text }) => ({
        url: `/v1/platform/tenants/${tenantId}/culture-intro`,
        method: 'PUT',
        body: { intro_text },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'PlatformTenants', id: tenantId },
      ],
    }),
  }),
});

export const {
  useGetPlatformTenantCultureIntroQuery,
  useUpdatePlatformTenantCultureIntroMutation,
} = extendedApi;
