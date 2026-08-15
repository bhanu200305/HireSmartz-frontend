import { useCallback, useMemo, useState } from 'react';
import type { CreateRolePayload, Role, RoleScope, UpdateRolePayload } from '../types';
import { seedRolesForContext } from '../components/RolesManagement/data/roleSeedData';
import type { BulkImportRoleRow } from '../components/RolesManagement/types';

export type UseRolesCatalogArgs = {
  scope: RoleScope;
  tenantId?: string | number;
};

export type UseRolesCatalogResult = {
  roles: Role[];
  isLoading: boolean;
  error: null;
  createRole: (payload: CreateRolePayload) => Promise<Role>;
  updateRole: (payload: UpdateRolePayload) => Promise<Role>;
  deleteRole: (roleId: number) => Promise<void>;
  bulkImportRoles: (rows: BulkImportRoleRow[]) => Promise<Role[]>;
};

// Seed data uses ids 1-16 (see roleSeedData.ts) — new roles start well past
// that range so they never collide with a system role's id.
let mockRoleIdSeq = 1000;

const catalogKey = (args: UseRolesCatalogArgs): string => `${args.scope}:${args.tenantId ?? 'platform'}`;

/**
 * The single data-access point for the Roles & Permissions screen — every
 * call site (RoleTable, CreateRoleModal, EditRoleModal, BulkImportRolesModal)
 * only ever sees this hook's return shape, never the storage mechanism
 * behind it. Today that storage is local React state (organization-service
 * has no role-catalog CRUD endpoints yet — see RolesManagement's original
 * empty-state comment). A future real implementation swaps this hook's body
 * for useListRolesQuery(args) + mutation hooks; no call site needs to change,
 * since {roles, isLoading, error, createRole, updateRole, deleteRole,
 * bulkImportRoles} already mirrors RTK Query's own shape.
 *
 * State is keyed by scope+tenantId so switching "Manage roles for" (Master
 * Super Admin only) or navigating between an org's own catalog and CFP's own
 * never bleeds one catalog's edits into another's.
 */
export const useRolesCatalog = (args: UseRolesCatalogArgs): UseRolesCatalogResult => {
  const key = catalogKey(args);
  const [store, setStore] = useState<Record<string, Role[]>>({});

  const roles = useMemo(
    () => store[key] ?? seedRolesForContext(args.scope, args.tenantId),
    [store, key, args.scope, args.tenantId]
  );

  const mutate = useCallback(
    (updater: (current: Role[]) => Role[]) => {
      setStore((prev) => {
        const current = prev[key] ?? seedRolesForContext(args.scope, args.tenantId);
        return { ...prev, [key]: updater(current) };
      });
    },
    [key, args.scope, args.tenantId]
  );

  const createRole = useCallback(
    async (payload: CreateRolePayload): Promise<Role> => {
      const newRole: Role = {
        id: mockRoleIdSeq++,
        roleName: payload.roleName,
        scope: payload.scope,
        tenantId: payload.tenantId,
        isSystemRole: false,
        permissions: payload.permissions,
        locationPermissions: payload.locationPermissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mutate((current) => [newRole, ...current]);
      return newRole;
    },
    [mutate]
  );

  const updateRole = useCallback(
    async (payload: UpdateRolePayload): Promise<Role> => {
      let updated: Role | undefined;
      mutate((current) =>
        current.map((role) => {
          if (role.id !== payload.roleId) return role;
          updated = {
            ...role,
            roleName: payload.roleName ?? role.roleName,
            permissions: payload.permissions ?? role.permissions,
            locationPermissions: payload.locationPermissions ?? role.locationPermissions,
            updatedAt: new Date().toISOString(),
          };
          return updated;
        })
      );
      if (!updated) throw new Error(`Role ${payload.roleId} not found`);
      return updated;
    },
    [mutate]
  );

  const deleteRole = useCallback(
    async (roleId: number): Promise<void> => {
      mutate((current) => current.filter((role) => role.id !== roleId));
    },
    [mutate]
  );

  const bulkImportRoles = useCallback(
    async (rows: BulkImportRoleRow[]): Promise<Role[]> => {
      const created: Role[] = rows.map((row) => ({
        id: mockRoleIdSeq++,
        roleName: row.roleName,
        scope: row.scope,
        tenantId: args.tenantId,
        isSystemRole: false,
        permissions: row.permissions,
        locationPermissions: row.locationPermissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      mutate((current) => [...created, ...current]);
      return created;
    },
    [mutate, args.tenantId]
  );

  return {
    roles,
    isLoading: false,
    error: null,
    createRole,
    updateRole,
    deleteRole,
    bulkImportRoles,
  };
};

export default useRolesCatalog;
