import { ROLE_AUTHORITIES } from '../../../constants/authorities.constant';
import type { CreateRolePayload, Role, RoleScope, UpdateRolePayload } from '../../../types';

/**
 * Local, browser-persisted stand-in for the Roles & Permissions backend.
 *
 * There is no real `/v1/roles` backend yet — role creation is an explicit
 * "known gap" in the RBAC design docs, and every other pre-backend flow in
 * this app (login itself, see devAuthBypass.ts) already has a local
 * fallback for exactly this reason. This is that fallback for Roles: it
 * only activates when VITE_BYPASS_AUTH=true (see isDevAuthBypassEnabled in
 * devAuthBypass.ts, checked at the RTK Query call site, not in here), and
 * every mutation here is the same shape createRole/updateRole/deleteRole
 * would send over the wire — swapping this out for a real network call
 * later is a call-site change, not a data-model change.
 */

const STORAGE_KEY = 'cfp_dev_roles_v1';

// camelCase role key -> readable label, e.g. "masterSuperAdmin" -> "Master Super Admin"
// (same convention as DevRoleSwitcher's humanize, kept in sync deliberately).
const humanize = (key: string): string =>
  key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

let seedIdCounter = -1;

const buildSeedRoles = (): Role[] => {
  const roles: Role[] = [];

  Object.entries(ROLE_AUTHORITIES).forEach(([type, rolesByName]) => {
    const scope: RoleScope = type === 'owner' ? 'platform' : 'tenant';

    Object.entries(rolesByName).forEach(([roleKey, permissions]) => {
      roles.push({
        id: seedIdCounter--,
        roleName: humanize(roleKey),
        scope,
        isSystemRole: true,
        permissions,
        locationPermissions: [],
      });
    });
  });

  return roles;
};

const readStore = (): Role[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = buildSeedRoles();
      writeStore(seeded);
      return seeded;
    }
    return JSON.parse(raw) as Role[];
  } catch {
    return buildSeedRoles();
  }
};

const writeStore = (roles: Role[]): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
};

export class DevRoleStoreError extends Error {}

export const devRoleStore = {
  list: ({ scope }: { scope?: RoleScope } = {}): Role[] => {
    const all = readStore();
    return scope ? all.filter((role) => role.scope === scope) : all;
  },

  getById: (roleId: number): Role | undefined => readStore().find((role) => role.id === roleId),

  create: (payload: CreateRolePayload): Role => {
    const all = readStore();
    const newRole: Role = {
      id: Date.now(),
      roleName: payload.roleName,
      scope: payload.scope,
      tenantId: payload.tenantId,
      isSystemRole: false,
      permissions: payload.permissions,
      locationPermissions: payload.locationPermissions,
      createdAt: new Date().toISOString(),
    };
    writeStore([...all, newRole]);
    return newRole;
  },

  update: (payload: UpdateRolePayload): Role => {
    const all = readStore();
    const index = all.findIndex((role) => role.id === payload.roleId);
    if (index === -1) throw new DevRoleStoreError('Role not found.');
    if (all[index].isSystemRole) throw new DevRoleStoreError('System roles cannot be edited.');

    const updated: Role = {
      ...all[index],
      roleName: payload.roleName ?? all[index].roleName,
      permissions: payload.permissions ?? all[index].permissions,
      locationPermissions: payload.locationPermissions ?? all[index].locationPermissions,
      updatedAt: new Date().toISOString(),
    };
    all[index] = updated;
    writeStore(all);
    return updated;
  },

  remove: (roleId: number): void => {
    const all = readStore();
    const role = all.find((r) => r.id === roleId);
    if (!role) throw new DevRoleStoreError('Role not found.');
    if (role.isSystemRole) throw new DevRoleStoreError('System roles cannot be deleted.');
    writeStore(all.filter((r) => r.id !== roleId));
  },
};
