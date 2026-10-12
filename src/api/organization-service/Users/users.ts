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
  /** `is_active` is set true immediately on creation, regardless of whether
   * this person has actually finished setup — so on its own it can't tell a
   * real, logged-in user apart from someone still sitting on an unaccepted
   * invite. `false` here means exactly that: invited, hasn't set a password
   * yet. Render status as "Pending setup" (not "Active") whenever
   * `is_active && !has_set_password`. */
  has_set_password: boolean;
  /** Display-only tenant role name(s) — comma-joined when a user holds more
   * than one live assignment, `null` when they hold none. Only populated on
   * the list endpoints (see organization-service's `UserView.role`
   * docstring); every other OrgUser-shaped response simply carries `null`. */
  role: string | null;
  /** Resolved download URL for the storage key set via `avatar` on
   * PATCH /users/me — `null` until one has ever been uploaded. */
  avatar_url: string | null;
};

// PATCH /v1/users/{user_id} only — never on the list response. `null` when
// the save didn't touch `email`; otherwise tells the caller whether the
// address change actually re-sent a working invite link: `true` means this
// person still had a pending, un-accepted invite and a fresh one just went
// to the corrected address; `false` means the email changed but there was
// nothing to resend (e.g. they'd already accepted). A UI that only toasts
// "saved" on a corrected typo would leave the admin assuming the person can
// now log in, when `false` means they still can't until re-invited by hand.
export type UpdateUserResponse = OrgUser & { invite_resent: boolean | null };

export type ListUsersArgs = {
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
  /** Base role name to filter by, e.g. `'recruiter'` or `'hiring_manager'`
   * — the backend also matches any of this tenant's own roles derived from
   * that base. Omit for the whole directory. A name that isn't a real role
   * 404s. */
  role?: string;
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

const USERS_PAGE_SIZE = 200;
// Stops a runaway loop; 50 pages is 10,000 users.
const ALL_USERS_MAX_PAGES = 50;

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listUsers: build.query<ListUsersResponse, ListUsersArgs | void>({
      query: (args) => ({
        url: '/v1/users',
        params: {
          include_inactive: args?.includeInactive ?? false,
          limit: args?.limit ?? 50,
          offset: args?.offset ?? 0,
          // `undefined` params are dropped by fetchBaseQuery, so this only
          // narrows to a role when one is actually passed.
          role: args?.role,
        },
      }),
      providesTags: ['OrgUsers'],
    }),
    // Every active user, fetched a page at a time (the server caps a page at 200), for
    // screens that turn user ids into names and must not miss anyone in a large company.
    listAllUsers: build.query<ListUsersResponse, void>({
      async queryFn(_arg, _api, _extra, fetchWithBQ) {
        const items: OrgUser[] = [];
        let total = 0;
        for (let page = 0; page < ALL_USERS_MAX_PAGES; page += 1) {
          const result = await fetchWithBQ({
            url: '/v1/users',
            params: { limit: USERS_PAGE_SIZE, offset: items.length },
          });
          if (result.error) return { error: result.error };
          const body = result.data as ListUsersResponse;
          total = body.total;
          items.push(...body.items);
          if (body.items.length === 0 || items.length >= total) break;
        }
        return { data: { items, total, limit: items.length, offset: 0 } };
      },
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
    updateUser: build.mutation<UpdateUserResponse, UpdateUserRequest>({
      query: ({ userId, ...body }) => ({
        url: `/v1/users/${userId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['OrgUsers'],
    }),
    // Reversible, not a permanent delete — the row and their role history
    // survive; `reactivateUser` below is the way back.
    deactivateUser: build.mutation<void, string>({
      query: (userId) => ({
        url: `/v1/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['OrgUsers'],
    }),
    // The undo side of deactivateUser above — POST /v1/users/{id}/reactivate.
    // Was platform-only (only a Super Admin acting on a tenant's behalf could
    // do this) until organization-service grew the tenant-self version;
    // without it, re-adding the same person via "Add user" 409'd with
    // "already exists" — deactivating never frees the email, only suspends
    // it — and a Company Admin had no way back for their own team.
    reactivateUser: build.mutation<OrgUser, string>({
      query: (userId) => ({
        url: `/v1/users/${userId}/reactivate`,
        method: 'POST',
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
    // Every other screen that reads this user's own profile (Header's
    // avatar/name, this profile page itself) shares the SAME cached
    // getOwnUserProfile entry — RTK Query dedupes by endpoint+args, and this
    // has none. Without invalidating it, Header — a persistent layout
    // component that never remounts on route navigation, so its
    // `refetchOnMountOrArgChange` never re-fires — kept showing whatever it
    // fetched once at app load, no matter how many successful saves
    // happened here afterward.
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
  useListAllUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useListUserLocationsQuery,
  useAttachUserLocationMutation,
  useDetachUserLocationMutation,
  useGetOwnUserProfileQuery,
  useUpdateOwnUserProfileMutation,
  useUploadOwnAvatarMutation,
  useClearOwnAvatarMutation,
} = extendedApi;
