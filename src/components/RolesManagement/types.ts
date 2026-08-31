import type { RoleScope } from '../../types';

/**
 * Which role catalog the screen is currently operating against. Mirrors
 * useRolesCatalog's args shape 1:1. Derived from either the signed-in
 * user's own scope/tenant, or — Master Super Admin only — the "Manage
 * roles for" switcher's current selection.
 */
export type RoleManagementContext = {
  scope: RoleScope;
  tenantId?: string;
  tenantName?: string;
};
