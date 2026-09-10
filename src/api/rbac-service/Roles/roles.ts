import { orgApi } from '../../organization-service/orgApi';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import { devRoleStore } from '../../../shared/utils/dev/devRoleStore';
import { getRoleTemplate } from '../../../components/RolesManagement/data/roleTemplates';

// RBAC moved into organization-service — roles are served at /v1/roles (a
// tenant's own catalog) and /v1/platform/roles (CFP's internal roles), both
// via orgApi (VITE_ORG_SERVICE_ENDPOINT). The old /roles/list path this file
// used to hit — on the shared `api` (VITE_BACKEND_ENDPOINT) — never existed
// on org-service and 404'd. See api/organization-service/Roles/roles.ts for
// the full RoleCatalogContext routing rule; this lightweight file only needs
// the "own tenant vs. platform" split, keyed off isOwnerRole.
type BackendRoleRow = { role_id: string; name: string };
const rolesPath = (isOwnerRole?: boolean): string =>
  isOwnerRole ? '/v1/platform/roles' : '/v1/roles';

// org-service returns a system role's `name` as an identifier
// (`hiring_manager`, not `Hiring Manager` — see roles/api/responses.py). This
// file's contract is "id + display name for a dropdown", and existing
// consumers match on the display form (OwnerDashboard looks for
// `'hiring manager'`), so map known system roles to their label; a custom
// tenant role's `name` is already its display name.
const toDisplayName = (name: string): string => getRoleTemplate(name)?.label ?? name;

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

const extendedApi = orgApi.injectEndpoints({
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

        const result = await baseQuery({ url: rolesPath(isOwnerRole), method: 'GET' });
        if (result.error) return { error: result.error };

        // orgApi unwraps the {status_code, status, message, data} envelope,
        // so `result.data` is the inner `{ roles: [...] }` payload. Mapped
        // down to this file's lightweight {id, roleName} dropdown shape.
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

export const { useGetRolesQuery } = extendedApi;
