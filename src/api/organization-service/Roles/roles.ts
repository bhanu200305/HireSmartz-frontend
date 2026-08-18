import { orgApi } from '../orgApi';
import type { RoleScope } from '../../../types';

// RoleResponse — the shape every roles endpoint below returns for one role.
// Covers both the 8 platform-shipped system roles (super_admin, cfp_admin,
// cfp_support, company_admin, hiring_manager, recruiter, interviewer,
// viewer — is_system_role: true, base_role_id: null) and any custom role a
// tenant (or CFP itself, for its own internal roles) created, which always
// derives from one of the 8 via base_role_id.
export type RoleLocationOverride = {
  location_id: string;
  permissions: string[];
};

export type Role = {
  role_id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  permissions: string[];
  base_role_id: string | null;
  base_role_name: string | null;
  base_role_permissions: string[];
  location_overrides: RoleLocationOverride[];
};

/**
 * Which of the three role-catalog surfaces a call targets — mirrors
 * useRolesCatalog's args 1:1 (see that hook for the scope/tenantId/isMaster
 * reasoning). Every endpoint below takes this as (part of) its arg and
 * resolves it to the matching URL via rolesBasePath, so the three surfaces
 * share one set of endpoint definitions instead of being duplicated three
 * times:
 *   - scope: 'platform'                        -> /v1/platform/roles
 *     (CFP's own internal roles; any owner-type session, not just Master
 *     Super Admin — all of them lack a tenant_id)
 *   - scope: 'tenant', isMaster: true           -> /v1/platform/tenants/{tenantId}/roles
 *     (Master Super Admin explicitly managing one client's catalog via
 *     RoleContextSwitcher — their own token is platform-scoped, so the
 *     tenant has to be named in the URL)
 *   - scope: 'tenant', isMaster: false          -> /v1/roles
 *     (a real tenant session managing its own catalog — tenant_id comes
 *     from their JWT server-side, never from the client)
 */
export type RoleCatalogContext = {
  scope: RoleScope;
  tenantId?: string;
  isMaster: boolean;
};

const rolesBasePath = ({ scope, tenantId, isMaster }: RoleCatalogContext): string => {
  if (scope === 'platform') return '/v1/platform/roles';
  if (isMaster) return `/v1/platform/tenants/${tenantId}/roles`;
  return '/v1/roles';
};

// Tags are scoped per-catalog (platform vs. a specific tenant) so switching
// "Manage roles for" in RoleContextSwitcher can't serve one company's list
// out of another's cache entry.
const catalogTagId = ({ scope, tenantId }: RoleCatalogContext): string =>
  scope === 'platform' ? 'platform' : `tenant:${tenantId ?? 'unselected'}`;

export type CreateRoleRequest = RoleCatalogContext & {
  name: string;
  description?: string | null;
  base_role_id: string;
  permissions: string[];
};

export type RenameRoleRequest = RoleCatalogContext & {
  roleId: string;
  name?: string;
  description?: string | null;
};

export type ReplaceRolePermissionsRequest = RoleCatalogContext & {
  roleId: string;
  // Always the full-matrix shape (never the legacy bare `permissions` body)
  // — see UpdateRolePermissionsRequest's docstring on the backend: exactly
  // one entry must carry location_id: null (the baseline), one entry per
  // office override after that. This is what lets a saved override be
  // REMOVED (send fewer entries), which the legacy shape can't express.
  entries: { location_id: string | null; permissions: string[] }[];
};

export type DeleteRoleRequest = RoleCatalogContext & {
  roleId: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listRoles: build.query<Role[], RoleCatalogContext>({
      query: (ctx) => rolesBasePath(ctx),
      transformResponse: (response: { roles: Role[] }) => response.roles,
      providesTags: (_result, _error, ctx) => [{ type: 'Roles', id: catalogTagId(ctx) }],
    }),
    createRole: build.mutation<Role, CreateRoleRequest>({
      query: ({ scope, tenantId, isMaster, ...body }) => ({
        url: rolesBasePath({ scope, tenantId, isMaster }),
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, ctx) => [{ type: 'Roles', id: catalogTagId(ctx) }],
    }),
    renameRole: build.mutation<Role, RenameRoleRequest>({
      query: ({ scope, tenantId, isMaster, roleId, ...body }) => ({
        url: `${rolesBasePath({ scope, tenantId, isMaster })}/${roleId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, ctx) => [{ type: 'Roles', id: catalogTagId(ctx) }],
    }),
    replaceRolePermissions: build.mutation<Role, ReplaceRolePermissionsRequest>({
      query: ({ scope, tenantId, isMaster, roleId, entries }) => ({
        url: `${rolesBasePath({ scope, tenantId, isMaster })}/${roleId}/permissions`,
        method: 'PUT',
        body: { entries },
      }),
      invalidatesTags: (_result, _error, ctx) => [{ type: 'Roles', id: catalogTagId(ctx) }],
    }),
    deleteRole: build.mutation<void, DeleteRoleRequest>({
      query: ({ scope, tenantId, isMaster, roleId }) => ({
        url: `${rolesBasePath({ scope, tenantId, isMaster })}/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, ctx) => [{ type: 'Roles', id: catalogTagId(ctx) }],
    }),
  }),
});

export const {
  useListRolesQuery,
  useCreateRoleMutation,
  useRenameRoleMutation,
  useReplaceRolePermissionsMutation,
  useDeleteRoleMutation,
} = extendedApi;
