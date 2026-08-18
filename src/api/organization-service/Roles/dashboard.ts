import { orgApi } from '../orgApi';

// GET /v1/roles/users/{user_id}/dashboard — bundles what
// useGetUserPermissionsQuery already returns (permissions.ts) PLUS the
// office this was resolved at and every office this user is attached to, so
// a location switcher can be built from ONE call instead of stitching
// together a permissions query and a separate offices query that could
// disagree if the user's office list changed in between. Supersedes
// useGetUserPermissionsQuery wherever a screen needs location context —
// that older query stays for callers that only ever want the flat,
// all-locations list.
export type DashboardLocation = {
  location_id: string;
  location_code: string | null;
  label: string;
};

export type GetUserDashboardResponse = {
  user_id: string;
  /** The office this was resolved at. Null = the all-locations union, same
   * scope as useGetUserPermissionsQuery with no locationId. */
  location: DashboardLocation | null;
  permissions: string[];
  permissions_by_resource: Record<string, string[]>;
  /** Every office this user may switch between — build the location
   * dropdown from this, not from the company's full office list, since it
   * reflects what's actually relevant to THIS person. */
  available_locations: DashboardLocation[];
  from_cache: boolean;
};

export type GetUserDashboardArgs = {
  userId: string;
  /** Render as of one location. Omit for the all-locations union. */
  locationId?: string;
  /** Bypass the cache, resolve fresh from PostgreSQL. */
  refresh?: boolean;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getUserDashboard: build.query<GetUserDashboardResponse, GetUserDashboardArgs>({
      query: ({ userId, locationId, refresh }) => ({
        url: `/v1/roles/users/${userId}/dashboard`,
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

export const { useGetUserDashboardQuery, useLazyGetUserDashboardQuery } = extendedApi;
