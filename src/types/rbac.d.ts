import type { Authorities } from '../constants/authorities.constant';

// ============================================
// RBAC domain types
// ============================================
// Mirrors the backend design: a fixed permission catalog (Authorities), a
// Role that a platform super admin ("owner" scope) or a company admin
// ("tenant" scope) can create, and a per-location permission override so the
// same role can grant a different effective set at a different location.
// See RBAC_ARCHITECTURE.md / RBAC_API.md for the backend shape this is
// modelled on.

/** platform = CFP-wide ("owner") role; tenant = a single company's role. */
export type RoleScope = 'platform' | 'tenant';

export type RoleLocationPermissions = {
  locationId: number;
  locationName?: string;
  permissions: Authorities[];
};

export type Role = {
  id: number;
  roleName: string;
  scope: RoleScope;
  /** Absent for platform-scope roles. */
  tenantId?: number;
  /**
   * Seeded/system roles (the historical 6 — masterSuperAdmin, admin, etc.)
   * are immutable, same as the backend's tenant_id IS NULL roles — a role
   * created through the Roles & Permissions UI is never a system role.
   */
  isSystemRole: boolean;
  createdByUserId?: string;
  /** Baseline permission set — applies at any location with no override. */
  permissions: Authorities[];
  /** Per-location permission sets that replace the baseline at that location. */
  locationPermissions: RoleLocationPermissions[];
  createdAt?: string;
  updatedAt?: string;
};

/** Body shape for PUT /v1/roles/{roleId}/permissions. */
export type RolePermissionsUpdate = {
  /** null = the baseline set; a location id = that location's override. */
  locationId: number | null;
  permissions: Authorities[];
}[];

export type CreateRolePayload = {
  roleName: string;
  scope: RoleScope;
  tenantId?: number;
  permissions: Authorities[];
  locationPermissions: RoleLocationPermissions[];
};

export type UpdateRolePayload = {
  roleId: number;
  roleName?: string;
  permissions?: Authorities[];
  locationPermissions?: RoleLocationPermissions[];
};

export type RoleAssignment = {
  assignmentId: number;
  userId: string | number;
  roleId: number;
  /** null = every location. */
  locationId: number | null;
};
