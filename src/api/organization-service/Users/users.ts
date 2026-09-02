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
  /** Display-only tenant role name(s) — comma-joined when a user holds more
   * than one live assignment, `null` when they hold none. Only populated on
   * the list endpoints (see organization-service's `UserView.role`
   * docstring); every other OrgUser-shaped response simply carries `null`. */
  role: string | null;
  /** Resolved download URL for the storage key set via `avatar` on
   * PATCH /users/me — `null` until one has ever been uploaded. */
  avatar_url: string | null;
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
  /** Storage key from POST /users/me/avatar/upload — PATCH semantics apply
   * (users_requests.py's UpdateUserRequest docstring): omitted leaves the
   * current avatar alone, there is no way to CLEAR one via this field, an
   * explicit `null` would be indistinguishable from omission on the wire. */
  avatar?: string;
};

// GET/PATCH /v1/users/me — self-service, no USER_UPDATE permission required:
// the caller can only ever reach their own row (user_id comes from the
// token server-side, never accepted from the client). Same field set as
// UpdateUserRequest above, minus userId — always implicitly "me".
export type UpdateOwnUserProfileRequest = Omit<UpdateUserRequest, 'userId'>;

export type UploadOwnAvatarResult = {
  storage_key: string;
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
    getOwnUserProfile: build.query<OrgUser, void>({
      query: () => '/v1/users/me',
      providesTags: ['OwnProfile'],
    }),
    // Without invalidatesTags, the PATCH genuinely saves (backend confirms
    // it) but Header/index.tsx holds a permanent, app-wide subscription to
    // getOwnUserProfile — the cache entry never goes "unused" long enough to
    // naturally expire and refetch, so the old profile just sits there
    // (here and in Header) until a hard reload flushes the store. Tagging
    // both sides is what makes the save actually show up.
    updateOwnUserProfile: build.mutation<OrgUser, UpdateOwnUserProfileRequest>({
      query: (body) => ({
        url: '/v1/users/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['OwnProfile'],
    }),
    // POST /v1/users/me/avatar/upload — server-mediated, same reasoning as
    // every other upload in this app (see Tenants/imports.ts's
    // uploadRosterFile): the file goes straight to organization-service as
    // multipart/form-data, which writes it to S3 itself. Returns only the
    // storage_key; the caller persists it via updateOwnUserProfile's
    // `avatar` field right after. Platform callers 404 here — no `users` row
    // exists for them to attach an avatar to (see the route's own docstring
    // in users_router.py) — this endpoint is tenant-user-only.
    uploadOwnAvatar: build.mutation<UploadOwnAvatarResult, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/v1/users/me/avatar/upload',
          method: 'POST',
          body: formData,
        };
      },
    }),
    // DELETE /v1/users/me/avatar — the only way to actually remove a saved
    // avatar. updateOwnUserProfile's `avatar` field can only ever SET one:
    // PATCH-omission semantics mean an explicit null is indistinguishable
    // from leaving it alone (see UpdateUserRequest's own docstring on the
    // backend). Invalidates the same cache tag for the same reason
    // updateOwnUserProfile does.
    clearOwnAvatar: build.mutation<OrgUser, void>({
      query: () => ({
        url: '/v1/users/me/avatar',
        method: 'DELETE',
      }),
      invalidatesTags: ['OwnProfile'],
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
  useGetOwnUserProfileQuery,
  useUpdateOwnUserProfileMutation,
  useUploadOwnAvatarMutation,
  useClearOwnAvatarMutation,
} = extendedApi;
