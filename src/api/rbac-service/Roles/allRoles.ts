import { orgApi } from '../../organization-service/orgApi';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import { devRoleStore } from '../../../shared/utils/dev/devRoleStore';
import { getRoleTemplate } from '../../../components/RolesManagement/data/roleTemplates';

// See roles.ts — same lightweight dropdown shape and same org-service move.
// org-service has no single "cross-scope" listing; each surface (/v1/roles,
// /v1/platform/roles) already returns the full 8-system-role catalog, so
// this resolves to the same per-scope path roles.ts uses.
type BackendRoleRow = { role_id: string; name: string };
const rolesPath = (isOwnerRole?: boolean): string =>
  isOwnerRole ? '/v1/platform/roles' : '/v1/roles';
const toDisplayName = (name: string): string => getRoleTemplate(name)?.label ?? name;
export type Role = {
  id: string;
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

const extendedApi = orgApi.injectEndpoints({
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

        const result = await baseQuery({ url: rolesPath(isOwnerRole), method: 'GET' });
        if (result.error) return { error: result.error };

        const rows = (result.data as { roles?: BackendRoleRow[] })?.roles ?? [];
        return {
          data: {
            data: rows.map((row) => ({ id: row.role_id, roleName: toDisplayName(row.name) })),
            success: true,
            message: 'ok',
          },
        };
      },
      providesTags: [{ type: 'Roles', id: 'LIST' }],
    }),
  }),
});

export const { useGetAllRolesQuery } = extendedApi;
