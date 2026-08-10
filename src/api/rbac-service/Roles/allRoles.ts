import { api } from '../../index';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import { devRoleStore } from '../../../shared/utils/dev/devRoleStore';

// See roles.ts — same lightweight dropdown shape, kept separate on purpose
// (this hits /roles/all/list, the cross-scope listing) rather than importing
// from roles.ts, so the two endpoints stay independently swappable.
export type Role = {
  id: number;
  roleName: string;
};

// Flat shape — every real consumer (OrganisationDashboard, ...) reads
// `allRoles.data` as the array directly, not `allRoles.data.data`.
export type GetRolesResponse = {
  data: Role[];
  success: boolean;
  message: string;
};

type GetRolesParams = {
  isOwnerRole?: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAllRoles: build.query<GetRolesResponse, GetRolesParams>({
      queryFn: async ({ isOwnerRole }, _queryApi, _extraOptions, baseQuery) => {
        if (isDevAuthBypassEnabled()) {
          const scope = isOwnerRole === undefined ? undefined : isOwnerRole ? 'platform' : 'tenant';
          const roles = devRoleStore
            .list({ scope })
            .map((role) => ({ id: role.id, roleName: role.roleName }));
          return { data: { data: roles, success: true, message: 'ok' } };
        }

        const result = await baseQuery({
          url: '/roles/all/list',
          method: 'GET',
          params: isOwnerRole !== undefined ? { isOwnerRole } : {},
        });
        if (result.error) return { error: result.error };
        return { data: result.data as GetRolesResponse };
      },
      providesTags: [{ type: 'Roles', id: 'LIST' }],
    }),
  }),
});

export const { useGetAllRolesQuery } = extendedApi;
