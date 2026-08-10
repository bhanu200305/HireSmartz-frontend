import {
  ALL_AUTHORITIES,
  Authorities,
  PERMISSION_CATALOG,
  PermissionCatalogEntry,
  PermissionModule,
} from '../../../constants/authorities.constant';
import type { Role } from '../../../types';

/**
 * The single place that turns "a role, optionally at a location" into the
 * flat permission list every gate (menu, route action, form field) checks
 * against. A role's `locationPermissions` entry for the active location
 * *replaces* the baseline set — it is not merged with it — because the
 * whole point is "this role has a different set here," not "this role has
 * its usual set plus a few extras here."
 */
export const resolveEffectivePermissions = (
  role: Pick<Role, 'permissions' | 'locationPermissions'> | undefined | null,
  locationId?: number | null
): Authorities[] => {
  if (!role) return [];

  if (locationId != null) {
    const override = role.locationPermissions?.find((entry) => entry.locationId === locationId);
    if (override) return override.permissions;
  }

  return role.permissions ?? [];
};

/**
 * What a role-creation/edit form is allowed to grant: the intersection of
 * the fixed catalog and the acting user's own effective permissions. This
 * is the escalation ceiling — a super admin or company admin can uncheck
 * items to narrow a new role, but can never check something they don't
 * themselves hold (mirrors the backend's PrivilegeEscalationError).
 */
export const getAssignablePermissionCeiling = (
  actingUserPermissions: Authorities[]
): Authorities[] => {
  const held = new Set(actingUserPermissions);
  return ALL_AUTHORITIES.filter((code) => held.has(code));
};

export const isWithinCeiling = (code: Authorities, ceiling: Authorities[]): boolean =>
  ceiling.includes(code);

/** Groups the fixed catalog by module, in catalog order — for the permission-picker UI. */
export const groupCatalogByModule = (): Record<PermissionModule, PermissionCatalogEntry[]> => {
  return PERMISSION_CATALOG.reduce(
    (groups, entry) => {
      (groups[entry.module] ||= []).push(entry);
      return groups;
    },
    {} as Record<PermissionModule, PermissionCatalogEntry[]>
  );
};
