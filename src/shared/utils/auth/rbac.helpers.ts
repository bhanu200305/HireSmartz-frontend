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
  locationId?: string | null
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

/** `code -> catalog entry` — built once per call site via `useMemo`, not
 * module scope, since `PERMISSION_CATALOG` itself is a plain array and this
 * is cheap to derive on demand. */
const catalogByCode = (): Map<Authorities, PermissionCatalogEntry> =>
  new Map(PERMISSION_CATALOG.map((entry) => [entry.code, entry]));

/**
 * A role's actual `permissions` codes, resolved to their human-readable
 * labels and grouped by module, in catalog order — what a hover preview
 * needs to answer "what does this role actually grant" without dumping raw
 * `resource:action` strings on the reader. Codes with no catalog entry
 * (frontend-only concepts like `dashboard:view` — see PERMISSION_CATALOG's
 * own module docstring) are silently dropped rather than shown unlabelled;
 * a role can hold one of these but it confers nothing a backend enforces,
 * so a preview of what the role DOES is correct to omit it.
 */
export const groupPermissionsByModule = (
  codes: Authorities[]
): Partial<Record<PermissionModule, PermissionCatalogEntry[]>> => {
  const byCode = catalogByCode();
  return codes.reduce(
    (groups, code) => {
      const entry = byCode.get(code);
      if (!entry) return groups;
      (groups[entry.module] ||= []).push(entry);
      return groups;
    },
    {} as Partial<Record<PermissionModule, PermissionCatalogEntry[]>>
  );
};
