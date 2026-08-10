import { api } from '../../index';
import type { Authorities } from '../../../constants/authorities.constant';

// Matches RBAC_API.md: GET /v1/roles/users/{user_id}/permissions.
export type GetUserPermissionsParams = {
  userId: string | number;
  /** Resolve as of one location; omit for the all-locations union. */
  locationId?: number;
  /** Bypass any cache and resolve fresh. */
  refresh?: boolean;
};

export type GetUserPermissionsResponse = {
  userId: string | number;
  permissions: Authorities[];
  fromCache: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getUserPermissions: build.query<GetUserPermissionsResponse, GetUserPermissionsParams>({
      query: ({ userId, locationId, refresh }) => ({
        url: `/v1/roles/users/${userId}/permissions`,
        method: 'GET',
        params: {
          ...(locationId !== undefined ? { location_id: locationId } : {}),
          ...(refresh !== undefined ? { refresh } : {}),
        },
      }),
      providesTags: (_result, _error, { userId }) => [{ type: 'Roles', id: `USER_${userId}` }],
    }),
  }),
});

export const { useGetUserPermissionsQuery, useLazyGetUserPermissionsQuery } = extendedApi;
