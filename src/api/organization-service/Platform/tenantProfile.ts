import { orgApi } from '../orgApi';
import type { TenantProfile, TenantStatusResponse } from '../Tenants/profile';

// Super Admin's platform-mounted mirror of Tenants/profile.ts's GET/PATCH
// .../profile — same TenantProfileView/UpdateTenantProfileRequest shapes,
// tenant bound from the path instead of the caller's own token (a platform
// caller has no tenant_id of their own to match `require_own_tenant`).
export type UpdatePlatformTenantProfileRequest = {
  tenantId: string;
  name?: string;
  logo?: string;
  description?: string;
  website_url?: string;
  industry_id?: string;
  admin_contact?: string;
  culture_intro?: string;
  company_size?: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getPlatformTenantProfile: build.query<TenantProfile, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/profile`,
      providesTags: (_result, _error, tenantId) => [{ type: 'PlatformTenants', id: tenantId }],
    }),
    updatePlatformTenantProfile: build.mutation<
      TenantStatusResponse,
      UpdatePlatformTenantProfileRequest
    >({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/platform/tenants/${tenantId}/profile`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'PlatformTenants', id: tenantId },
      ],
    }),
  }),
});

export const { useGetPlatformTenantProfileQuery, useUpdatePlatformTenantProfileMutation } =
  extendedApi;
