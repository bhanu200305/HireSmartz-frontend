import { orgApi } from '../orgApi';
import type {
  CreateUserRequest,
  ListUsersResponse,
  OrgUser,
  UpdateUserRequest,
  UpdateUserResponse,
  UserLocationsResponse,
} from '../Users/users';

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

export type UpdatePlatformTenantUserRequest = UpdateUserRequest & {
  tenantId: string;
};

const usersBasePath = (tenantId: string): string => `/v1/platform/tenants/${tenantId}/users`;

// Attached offices — the platform mirror of Users/users.ts's own
// GET/POST/DELETE .../locations. An HR fact ("which offices is this person
// attached to"), not an authorization one — organization_role never reads
// user_location_mapping. THIS IS WHAT A LOCATION-SCOPED ROLE GRANT DOES NOT
// DO ON ITS OWN: granting "head_recruiter" at Office A only writes
// organization_role; it never attaches the holder to Office A, so their own
// location switcher (useActiveLocation, reading GET .../dashboard's
// available_locations) stays empty until someone attaches them separately.
// See RoleLocationPicker's callers — they call attachPlatformTenantUserLocation
// alongside every location-scoped assignRole for exactly this reason.
export type PlatformTenantUserLocationArgs = { tenantId: string; userId: string };

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
    // Platform mirror of Users/users.ts's updateUser — the tenant-ambient
    // PATCH /v1/users/{user_id} 403s for a platform caller
    // (users_router.py reads get_tenant_context()), so
    // users_platform_router.py's update_user_as_platform exists for exactly
    // this. Same UpdateUserUseCase/UpdateUserCommand either way — only the
    // guard and where tenant_id comes from differ, same as every other route
    // in this file.
    updatePlatformTenantUser: build.mutation<UpdateUserResponse, UpdatePlatformTenantUserRequest>({
      query: ({ tenantId, userId, ...body }) => ({
        url: `${usersBasePath(tenantId)}/${userId}`,
        method: 'PATCH',
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
    // Undo side of deactivate — restores is_active with the roles the user
    // already held. Without this, re-adding a deactivated user's email via
    // createPlatformTenantUser 409s (DUPLICATE_USER_EMAIL): deactivating
    // never freed the email, it only flipped a flag.
    reactivatePlatformTenantUser: build.mutation<OrgUser, { tenantId: string; userId: string }>({
      query: ({ tenantId, userId }) => ({
        url: `${usersBasePath(tenantId)}/${userId}/reactivate`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'OrgUsers', id: `platform-${tenantId}` },
      ],
    }),
    listPlatformTenantUserLocations: build.query<
      UserLocationsResponse,
      PlatformTenantUserLocationArgs
    >({
      query: ({ tenantId, userId }) => `${usersBasePath(tenantId)}/${userId}/locations`,
      providesTags: (_result, _error, { userId }) => [{ type: 'UserLocations', id: userId }],
    }),
    attachPlatformTenantUserLocation: build.mutation<
      UserLocationsResponse,
      PlatformTenantUserLocationArgs & { orgAddressLocationId: string }
    >({
      query: ({ tenantId, userId, orgAddressLocationId }) => ({
        url: `${usersBasePath(tenantId)}/${userId}/locations`,
        method: 'POST',
        body: { org_address_location_id: orgAddressLocationId },
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'UserLocations', id: userId },
        { type: 'UserPermissions', id: userId },
      ],
    }),
    detachPlatformTenantUserLocation: build.mutation<
      void,
      PlatformTenantUserLocationArgs & { orgAddressLocationId: string }
    >({
      query: ({ tenantId, userId, orgAddressLocationId }) => ({
        url: `${usersBasePath(tenantId)}/${userId}/locations/${orgAddressLocationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'UserLocations', id: userId },
        { type: 'UserPermissions', id: userId },
      ],
    }),
  }),
});

export const {
  useListPlatformTenantUsersQuery,
  useCreatePlatformTenantUserMutation,
  useUpdatePlatformTenantUserMutation,
  useDeactivatePlatformTenantUserMutation,
  useReactivatePlatformTenantUserMutation,
  useListPlatformTenantUserLocationsQuery,
  useAttachPlatformTenantUserLocationMutation,
  useDetachPlatformTenantUserLocationMutation,
} = extendedApi;
