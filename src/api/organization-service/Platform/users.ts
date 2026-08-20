import { orgApi } from '../orgApi';
import type { CreateUserRequest, ListUsersResponse, OrgUser } from '../Users/users';

// Super Admin's platform-mounted mirror of Users/users.ts — same
// request/response shapes as POST/GET/DELETE /v1/users, tenant bound from
// the path instead of the caller's own token. That token route 403s for a
// platform caller (organization-service's users_router.py reads
// get_tenant_context(), which a platform principal never has), which is
// exactly why users_platform_router.py exists server-side — same pattern as
// rolesBasePath in ../Roles/roles.ts and departmentsBasePath in ./departments.ts.
export type ListPlatformTenantUsersArgs = {
  tenantId: string;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
};

export type CreatePlatformTenantUserRequest = CreateUserRequest & {
  tenantId: string;
};

const usersBasePath = (tenantId: string): string => `/v1/platform/tenants/${tenantId}/users`;

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformTenantUsers: build.query<ListUsersResponse, ListPlatformTenantUsersArgs>({
      query: ({ tenantId, includeInactive, limit, offset }) => ({
        url: usersBasePath(tenantId),
        params: {
          include_inactive: includeInactive ?? false,
          limit: limit ?? 50,
          offset: offset ?? 0,
        },
      }),
      providesTags: (_result, _error, { tenantId }) => [
        { type: 'OrgUsers', id: `platform-${tenantId}` },
      ],
    }),
    createPlatformTenantUser: build.mutation<OrgUser, CreatePlatformTenantUserRequest>({
      query: ({ tenantId, ...body }) => ({
        url: usersBasePath(tenantId),
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'OrgUsers', id: `platform-${tenantId}` },
      ],
    }),
    // Reversible, not a permanent delete — mirrors Users/users.ts's
    // deactivateUser: the row and its role history survive.
    deactivatePlatformTenantUser: build.mutation<void, { tenantId: string; userId: string }>({
      query: ({ tenantId, userId }) => ({
        url: `${usersBasePath(tenantId)}/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'OrgUsers', id: `platform-${tenantId}` },
      ],
    }),
  }),
});

export const {
  useListPlatformTenantUsersQuery,
  useCreatePlatformTenantUserMutation,
  useDeactivatePlatformTenantUserMutation,
} = extendedApi;
