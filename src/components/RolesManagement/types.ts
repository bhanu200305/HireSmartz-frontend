import type { Authorities } from '../../constants/authorities.constant';
import type { RoleLocationPermissions, RoleScope } from '../../types';

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

export type BulkImportRowStatus = 'ready' | 'error';

export type BulkImportRoleRow = {
  /** Local key for the review table only — not a server id. */
  id: string;
  roleName: string;
  scope: RoleScope;
  templateKey: string;
  templateLabel: string;
  permissions: Authorities[];
  locationPermissions: RoleLocationPermissions[];
  status: BulkImportRowStatus;
};
