import { orgApi } from '../orgApi';

// GET /v1/roles/users/{user_id}/permissions — RBAC_API.md. The admin-facing
// "what can this person actually do?" view, and (per this session's Phase 0)
// also the ONLY source of a real session's effective permissions: the access
// token deliberately carries no `permissions` claim (see
// authentication-service/docs/API_CONTRACT.md's JWT-claims table — permissions
// are resolved server-side per request, from Redis, never from the token) so
// the frontend has to ask for them explicitly, once, right after login.
export type GetUserPermissionsResponse = {
  user_id: string;
  permissions: string[];
  from_cache: boolean;
};

export type GetUserPermissionsArgs = {
  userId: string;
  /** Resolve as of one location. Omit for the union across all locations. */
  locationId?: string;
  /** Bypass the cache, resolve fresh from PostgreSQL. */
  refresh?: boolean;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getUserPermissions: build.query<GetUserPermissionsResponse, GetUserPermissionsArgs>({
      query: ({ userId, locationId, refresh }) => ({
        url: `/v1/roles/users/${userId}/permissions`,
        method: 'GET',
        params: {
          ...(locationId ? { location_id: locationId } : {}),
          ...(refresh ? { refresh: true } : {}),
        },
      }),
      providesTags: (_result, _error, { userId }) => [{ type: 'UserPermissions', id: userId }],
    }),
  }),
});

export const { useGetUserPermissionsQuery, useLazyGetUserPermissionsQuery } = extendedApi;
