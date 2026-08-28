import { api } from '../../index';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import { devRoleStore } from '../../../shared/utils/dev/devRoleStore';

// Lightweight shape used by role dropdowns (assigning a role to a user) —
// most consumers only ever need id + display name. The full dynamic Role
// record (permissions, per-location overrides, scope, ...) used by the
// Roles & Permissions management screens lives in src/types/rbac.d.ts and
// is fetched via getRoleById/createRole/updateRole instead.
export type Role = {
  id: string;
  roleName: string;
};

// Flat shape — every real consumer (Dashboard, OrganisationDashboard, ...)
// reads `roles.data` as the array directly (e.g. `roles?.data?.find(...)`),
// not `roles.data.data`. The type here previously declared an extra nesting
// level that no consumer actually used; keep this flat to match reality.
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
    getRoles: build.query<GetRolesResponse, GetRolesParams>({
      // Dev-bypass mode reads from the same local devRoleStore the Roles &
      // Permissions screens write to, so a role created there immediately
      // shows up here too — one list of roles, not two.
      queryFn: async ({ isOwnerRole }, _queryApi, _extraOptions, baseQuery) => {
        if (isDevAuthBypassEnabled()) {
          const scope = isOwnerRole === undefined ? undefined : isOwnerRole ? 'platform' : 'tenant';
          const roles = devRoleStore
            .list({ scope })
            .map((role) => ({ id: role.id, roleName: role.roleName }));
          return { data: { data: roles, success: true, message: 'ok' } };
        }

        const result = await baseQuery({
          url: '/roles/list',
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

export const { useGetRolesQuery } = extendedApi;
