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
  /** organization-service's `org_address_location_id` — a real UUID, same id
   * TenantOffice.office_id carries (see api/organization-service/Tenants/offices.ts). */
  locationId: string;
  locationName?: string;
  permissions: Authorities[];
};

export type Role = {
  /** organization-service's `master_role.role_id` — a real UUID. */
  id: string;
  roleName: string;
  description?: string | null;
  scope: RoleScope;
  /** Absent for platform-scope roles. Real platform tenant id (organization-service's UUID `tenant_id`). */
  tenantId?: string;
  /**
   * The 8 platform-shipped roles (super_admin, cfp_admin, cfp_support,
   * company_admin, hiring_manager, recruiter, interviewer, viewer) —
   * immutable, same as the backend's tenant_id IS NULL roles. A role created
   * through the Roles & Permissions UI is never a system role.
   */
  isSystemRole: boolean;
  createdByUserId?: string;
  /** Baseline permission set — applies at any location with no override. */
  permissions: Authorities[];
  /** Per-location permission sets that replace the baseline at that location. */
  locationPermissions: RoleLocationPermissions[];
  /**
   * The system role this custom role derives from — every custom role's
   * permissions are capped by this role's own set (`base_role_permissions`),
   * enforced server-side. Absent for a system role itself (nothing sits
   * above it) and for any custom role created before this field existed.
   */
  baseRoleId?: string;
  baseRoleName?: string;
  baseRolePermissions?: Authorities[];
  createdAt?: string;
  updatedAt?: string;
};

/** Body shape for PUT /v1/roles/{roleId}/permissions — one entry per
 * location override, plus exactly one `locationId: null` baseline entry. */
export type RolePermissionsUpdate = {
  /** null = the baseline set; a location id = that location's override. */
  locationId: string | null;
  permissions: Authorities[];
}[];

export type CreateRolePayload = {
  roleName: string;
  scope: RoleScope;
  /** Same string allowance as Role.tenantId above — see that comment. */
  tenantId?: string;
  permissions: Authorities[];
  locationPermissions: RoleLocationPermissions[];
  /**
   * Which `ROLE_TEMPLATES` entry this role started from (data/roleTemplates.ts)
   * — its `key` is exactly one of the 8 system role names (see roleTemplates.ts's
   * own comment). Resolved to the matching system role's real `id` server-side
   * of the hook (useRolesCatalog), since the backend requires a `base_role_id`
   * on every create and there is no "free-standing" role.
   */
  templateKey: string;
};

export type UpdateRolePayload = {
  roleId: string;
  roleName?: string;
  permissions?: Authorities[];
  locationPermissions?: RoleLocationPermissions[];
};

export type RoleAssignment = {
  assignmentId: string;
  userId: string;
  roleId: string;
  /** null = every location. */
  locationId: string | null;
};
