import { useCallback, useMemo } from 'react';
import type {
  CreateRolePayload,
  Role,
  RoleLocationPermissions,
  RoleScope,
  UpdateRolePayload,
} from '../types';
import { getRoleTemplate } from '../components/RolesManagement/data/roleTemplates';
import {
  useListRolesQuery,
  useCreateRoleMutation,
  useRenameRoleMutation,
  useReplaceRolePermissionsMutation,
  useDeleteRoleMutation,
  type Role as BackendRole,
} from '../api/organization-service/Roles/roles';
import type { Authorities } from '../constants/authorities.constant';

export type UseRolesCatalogArgs = {
  scope: RoleScope;
  tenantId?: string;
  /** True for ANY owner-type session (not just Master Super Admin — every
   * owner-tier role lacks a tenant_id the same way). Picks between the
   * three backend surfaces — see Roles/roles.ts's RoleCatalogContext
   * docstring for the full routing rule. */
  isMaster: boolean;
};

export type UseRolesCatalogResult = {
  roles: Role[];
  isLoading: boolean;
  error: unknown;
  createRole: (payload: CreateRolePayload) => Promise<Role>;
  updateRole: (payload: UpdateRolePayload) => Promise<Role>;
  deleteRole: (roleId: string) => Promise<void>;
};

/**
 * A system role's tier is a fact about the ROLE, not about which endpoint a
 * caller happened to fetch it through. GET /v1/platform/roles legitimately
 * returns all 8 system roles (platform staff need to see every assignable
 * role, same as GET /v1/roles does for a tenant caller) — so blindly
 * stamping every row with the request's own `scope` mislabels the 5
 * company-tier system roles (company_admin, hiring_manager, recruiter,
 * interviewer, viewer) as "Platform" whenever viewed via the CFP-staff tab.
 * A CUSTOM role has no such ambiguity — where it was created (tenant_id
 * NULL or not) IS its scope, so only system roles need this lookup.
 */
const resolveRoleScope = (role: BackendRole, requestScope: RoleScope): RoleScope => {
  if (!role.is_system_role) return requestScope;
  return getRoleTemplate(role.name)?.scope ?? requestScope;
};

const toFrontendRole = (role: BackendRole, scope: RoleScope, tenantId?: string): Role => ({
  id: role.role_id,
  roleName: role.name,
  description: role.description,
  scope: resolveRoleScope(role, scope),
  tenantId,
  isSystemRole: role.is_system_role,
  permissions: role.permissions as Authorities[],
  locationPermissions: role.location_overrides.map((override) => ({
    locationId: override.location_id,
    permissions: override.permissions as Authorities[],
  })),
  baseRoleId: role.base_role_id ?? undefined,
  baseRoleName: role.base_role_name ?? undefined,
  baseRolePermissions: role.base_role_permissions as Authorities[],
});

// organization-service's PermissionCode.parse only accepts `resource:action`
// where action is one of these 6 (cfp_contracts.permissions.ActionType) —
// anything else 422s. Several Authorities entries are deliberately NOT real
// backend permissions (dashboard:view, my_company:view, and every
// job-service placeholder like job:view/job:edit/job:create — see their own
// "No backend permission" comments in authorities.constant.ts): frontend-only
// tab-visibility flags or a service whose RBAC doesn't exist here yet. The
// permission PICKER still shows them (removing them there is a separate,
// larger catalog-alignment pass — see PermissionCatalogResponse on the
// backend for what a real fix looks like), so this is the last line of
// defense: strip anything that isn't a real organization-service permission
// before it ever reaches create/update, rather than letting a checked box
// the picker shouldn't have offered turn into a 422 on save.
const BACKEND_ACTIONS = new Set(['read', 'write', 'update', 'delete', 'approve', 'export']);
const isBackendPermission = (code: string): boolean => {
  const action = code.split(':')[1];
  return action !== undefined && BACKEND_ACTIONS.has(action);
};
const toBackendPermissions = (permissions: Authorities[]): string[] =>
  permissions.filter(isBackendPermission);

const buildPermissionEntries = (
  permissions: Authorities[],
  locationPermissions: RoleLocationPermissions[]
) => [
  { location_id: null, permissions: toBackendPermissions(permissions) },
  ...locationPermissions.map((override) => ({
    location_id: override.locationId,
    permissions: toBackendPermissions(override.permissions),
  })),
];

/**
 * The single data-access point for the Roles & Permissions screen — every
 * call site (RoleTable, CreateRoleModal, EditRoleModal) only ever sees this
 * hook's return shape, never the real endpoints behind it
 * (api/organization-service/Roles/roles.ts) — same shape RTK Query's own
 * hooks give, so no call site needed to change when this stopped being
 * local mock state.
 */
export const useRolesCatalog = (args: UseRolesCatalogArgs): UseRolesCatalogResult => {
  const { scope, tenantId, isMaster } = args;
  const ctx = useMemo(() => ({ scope, tenantId, isMaster }), [scope, tenantId, isMaster]);

  // Master Super Admin picked "a client organization" but hasn't chosen a
  // company yet — RolesManagement/Index.tsx already hides the table for
  // this case, but without this the query would fire against
  // /v1/platform/tenants/undefined/roles.
  const skip = scope === 'tenant' && isMaster && !tenantId;

  const { data, isLoading, isFetching, error } = useListRolesQuery(ctx, { skip });
  // Every surface (GET /v1/roles, /v1/platform/roles,
  // /v1/platform/tenants/{id}/roles) returns the FULL 8-system-role catalog
  // regardless of which one you call — platform staff need to see every
  // assignable role the same way a tenant does. Kept unfiltered here (only
  // `roles` below is filtered) because resolveBaseRoleId needs to find ANY
  // system role by name, including ones from the other tier — creating a
  // "Company Admin" custom role still needs to look up the real
  // company_admin system role's id even while viewing the CFP-staff tab's
  // catalog... except it can't, since that call is always scoped to
  // wherever the role is being created FOR (see CreateRolePayload.scope),
  // which always matches this same `scope`. Left unfiltered anyway since
  // narrowing it would just be redundant, not wrong.
  const backendRoles = useMemo(() => data ?? [], [data]);

  // Display list only: narrowed to the roles that actually BELONG to this
  // tab. A CFP-staff (`scope: 'platform'`) view should show only
  // super_admin/cfp_admin/cfp_support, never the 5 company-tier system
  // roles the same backend response also includes for the tenant side's
  // benefit — see resolveRoleScope's docstring for why "which endpoint
  // returned it" isn't the same fact as "which tier it belongs to". Custom
  // roles are unaffected: resolveRoleScope always gives them the request's
  // own scope, so they trivially pass this filter.
  const roles = useMemo(
    () =>
      backendRoles
        .map((role) => toFrontendRole(role, scope, tenantId))
        .filter((role) => role.scope === scope),
    [backendRoles, scope, tenantId]
  );

  const [createRoleMutation] = useCreateRoleMutation();
  const [renameRoleMutation] = useRenameRoleMutation();
  const [replacePermissionsMutation] = useReplaceRolePermissionsMutation();
  const [deleteRoleMutation] = useDeleteRoleMutation();

  // CreateRolePayload carries a template KEY (e.g. "hiring_manager"), not a
  // base_role_id — the backend requires the latter on every create (a
  // custom role always derives from one of the 8 system roles; there is no
  // "free-standing" role — see CreateRoleRequest on the backend). Resolved
  // here, against the system roles this same catalog query already
  // returned, rather than pushing a UUID lookup into CreateRoleModal /
  // BulkImportRolesModal.
  const resolveBaseRoleId = useCallback(
    (templateKey: string): string => {
      const systemRole = backendRoles.find(
        (role) => role.is_system_role && role.name === templateKey
      );
      if (!systemRole) {
        throw new Error(`No system role named "${templateKey}" in this catalog.`);
      }
      return systemRole.role_id;
    },
    [backendRoles]
  );

  const createRole = useCallback(
    async (payload: CreateRolePayload): Promise<Role> => {
      const created = await createRoleMutation({
        ...ctx,
        name: payload.roleName,
        base_role_id: resolveBaseRoleId(payload.templateKey),
        permissions: toBackendPermissions(payload.permissions),
      }).unwrap();

      // POST /roles only ever accepts the baseline set (CreateRoleRequest has
      // no location_overrides field) — any per-location overrides chosen in
      // the Create Role wizard have to be persisted as a second call, same
      // PUT .../permissions endpoint updateRole uses. Skipped when there are
      // none so a plain create (the common case) stays a single request.
      if (payload.locationPermissions.length === 0) {
        return toFrontendRole(created, scope, tenantId);
      }

      const withOverrides = await replacePermissionsMutation({
        ...ctx,
        roleId: created.role_id,
        entries: buildPermissionEntries(payload.permissions, payload.locationPermissions),
      }).unwrap();
      return toFrontendRole(withOverrides, scope, tenantId);
    },
    [createRoleMutation, replacePermissionsMutation, ctx, resolveBaseRoleId, scope, tenantId]
  );

  const updateRole = useCallback(
    async (payload: UpdateRolePayload): Promise<Role> => {
      const current = backendRoles.find((role) => role.role_id === payload.roleId);

      // Rename (PATCH) and the permission matrix (PUT .../permissions) are
      // separate calls on the backend — only fire the rename if the name
      // actually changed.
      if (payload.roleName !== undefined && payload.roleName !== current?.name) {
        await renameRoleMutation({
          ...ctx,
          roleId: payload.roleId,
          name: payload.roleName,
        }).unwrap();
      }

      const permissions =
        payload.permissions ?? (current?.permissions as Authorities[] | undefined) ?? [];
      const locationPermissions =
        payload.locationPermissions ??
        current?.location_overrides.map((override) => ({
          locationId: override.location_id,
          permissions: override.permissions as Authorities[],
        })) ??
        [];

      const updated = await replacePermissionsMutation({
        ...ctx,
        roleId: payload.roleId,
        entries: buildPermissionEntries(permissions, locationPermissions),
      }).unwrap();

      return toFrontendRole(updated, scope, tenantId);
    },
    [backendRoles, renameRoleMutation, replacePermissionsMutation, ctx, scope, tenantId]
  );

  const deleteRole = useCallback(
    async (roleId: string): Promise<void> => {
      await deleteRoleMutation({ ...ctx, roleId }).unwrap();
    },
    [deleteRoleMutation, ctx]
  );

  return {
    roles,
    isLoading: isLoading || isFetching,
    error,
    createRole,
    updateRole,
    deleteRole,
  };
};

export default useRolesCatalog;
