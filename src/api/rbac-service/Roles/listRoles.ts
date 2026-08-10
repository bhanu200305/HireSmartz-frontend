import { api } from '../../index';
import type { Role, RoleScope } from '../../../types';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import { devRoleStore } from '../../../shared/utils/dev/devRoleStore';

// The full, canonical Role listing (GET /v1/roles) for the Roles &
// Permissions management screens — distinct from roles.ts/allRoles.ts,
// which stay on the legacy lightweight {id, roleName} shape used by role
// *dropdowns* elsewhere in the app (user create/edit forms).
export type ListRolesParams = {
  scope?: RoleScope;
  tenantId?: number;
};

export type ListRolesResponse = {
  data: Role[];
  success: boolean;
  message: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    listRoles: build.query<ListRolesResponse, ListRolesParams | void>({
      // No /v1/roles backend exists yet (see RBAC docs' known gaps) — in
      // dev-bypass mode this reads from the local devRoleStore instead of
      // hitting the network, so the feature is usable before that backend
      // exists. Once VITE_BYPASS_AUTH is off, this always goes over the wire.
      queryFn: async (params, _queryApi, _extraOptions, baseQuery) => {
        if (isDevAuthBypassEnabled()) {
          const data = devRoleStore.list({ scope: params?.scope });
          return { data: { data, success: true, message: 'ok' } };
        }

        const result = await baseQuery({
          url: '/v1/roles',
          method: 'GET',
          params: params ?? {},
        });
        if (result.error) return { error: result.error };
        return { data: result.data as ListRolesResponse };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((role) => ({ type: 'Roles' as const, id: role.id })),
              { type: 'Roles' as const, id: 'LIST' },
            ]
          : [{ type: 'Roles' as const, id: 'LIST' }],
    }),
  }),
});

export const { useListRolesQuery } = extendedApi;
