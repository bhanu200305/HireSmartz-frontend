import { orgApi } from '../orgApi';
import type { ListTenantActivityArgs, ListTenantActivityResponse } from '../Tenants/profile';

// GET /v1/platform/tenants/{tenant_id}/activity — platform mirror of
// Tenants/profile.ts's listTenantActivity (same ListActivityView shape,
// ORGANIZATION_READ guard instead of require_own_tenant) — lets Super Admin
// see a tenant's own admin activity log from ViewCustomer, the same way
// MyCompany's own Activity tab already does for the tenant itself.
const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformTenantActivity: build.query<ListTenantActivityResponse, ListTenantActivityArgs>({
      query: ({ tenantId, limit = 20, offset = 0 }) => ({
        url: `/v1/platform/tenants/${tenantId}/activity`,
        params: { limit, offset },
      }),
      providesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantActivity', id: `platform-${tenantId}` },
      ],
    }),
  }),
});

export const { useListPlatformTenantActivityQuery } = extendedApi;
