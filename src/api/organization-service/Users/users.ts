import { orgApi } from '../orgApi';

// UserResponse — /v1/users. Tenant always comes from the caller's own JWT
// (RequestContextMiddleware), never from a request field — no `tenantId` in
// any of these shapes, matching organization-service's own users_router.py
// docstring: "TENANT AND ACTOR ALWAYS COME FROM THE TOKEN, NEVER THE BODY."
export type OrgUser = {
  user_id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  title: string | null;
  full_name: string;
  country_code: string | null;
  phone_no: string | null;
  designation_id: string | null;
  department_id: string | null;
  is_email_verified: boolean;
  is_active: boolean;
};

export type ListUsersArgs = {
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
};

export type ListUsersResponse = {
  items: OrgUser[];
  total: number;
  limit: number;
  offset: number;
};

export type CreateUserRequest = {
  email: string;
  first_name: string;
  last_name?: string;
  title?: string;
  middle_name?: string;
  country_code?: string;
  phone_no?: string;
  designation_id?: string;
  department_id?: string;
  /** Grant this role in the same transaction as creation — omit to create a
   * user with no permissions until a role is assigned separately. */
  role_id?: string;
};

// UserLocationsView — GET/POST/DELETE /v1/users/{user_id}/locations. IDs
// only, same convention as designation_id/department_id on OrgUser — join
// against useListTenantOfficesQuery for display names. This is the HR fact
// of which offices a user is attached to, NOT which offices their role
// applies at (organization_role.location_id) — see UserLocationMapping's
// own docstring. It is what the location switcher's available_locations
// list is actually built from.
export type UserLocationsResponse = {
  user_id: string;
  org_address_location_ids: string[];
};

export type UpdateUserRequest = {
  userId: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  middle_name?: string;
  country_code?: string;
  phone_no?: string;
  designation_id?: string;
  department_id?: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listUsers: build.query<ListUsersResponse, ListUsersArgs | void>({
      query: (args) => ({
        url: '/v1/users',
        params: {
          include_inactive: args?.includeInactive ?? false,
          limit: args?.limit ?? 50,
          offset: args?.offset ?? 0,
        },
      }),
      providesTags: ['OrgUsers'],
    }),
    createUser: build.mutation<OrgUser, CreateUserRequest>({
      query: (body) => ({
        url: '/v1/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['OrgUsers'],
    }),
    updateUser: build.mutation<OrgUser, UpdateUserRequest>({
      query: ({ userId, ...body }) => ({
        url: `/v1/users/${userId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['OrgUsers'],
    }),
    // Reversible, not a permanent delete — the row and their role history
    // survive; reactivation isn't exposed over the API yet, same known gap
    // as everywhere else "not available yet" is used deliberately.
    deactivateUser: build.mutation<void, string>({
      query: (userId) => ({
        url: `/v1/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['OrgUsers'],
    }),
    listUserLocations: build.query<UserLocationsResponse, string>({
      query: (userId) => `/v1/users/${userId}/locations`,
      providesTags: (_result, _error, userId) => [{ type: 'UserLocations', id: userId }],
    }),
    attachUserLocation: build.mutation<
      UserLocationsResponse,
      { userId: string; orgAddressLocationId: string }
    >({
      query: ({ userId, orgAddressLocationId }) => ({
        url: `/v1/users/${userId}/locations`,
        method: 'POST',
        body: { org_address_location_id: orgAddressLocationId },
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'UserLocations', id: userId },
        { type: 'UserPermissions', id: userId },
      ],
    }),
    detachUserLocation: build.mutation<void, { userId: string; orgAddressLocationId: string }>({
      query: ({ userId, orgAddressLocationId }) => ({
        url: `/v1/users/${userId}/locations/${orgAddressLocationId}`,
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
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useListUserLocationsQuery,
  useAttachUserLocationMutation,
  useDetachUserLocationMutation,
} = extendedApi;
