import { jwtDecode } from 'jwt-decode';

type Role = {
  name?: string;
  type?: string;
};

type TokenPermissionClaims = {
  canManageCompanySettings?: boolean | string | number;
};

const normalizeBooleanClaim = (value: boolean | string | number | undefined): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return false;
};

const normalizeRoleIdentifier = (value: string | undefined): string => {
  return (value || '').replace(/[_\s-]+/g, '').toLowerCase();
};

export const isHiringManagerOrRecruiterRole = (role?: Role): boolean => {
  const normalizedRoleName = normalizeRoleIdentifier(role?.name);
  const normalizedRoleType = normalizeRoleIdentifier(role?.type);

  return (
    normalizedRoleName === 'hiringmanager' ||
    normalizedRoleName === 'recruiter' ||
    normalizedRoleType === 'hiringmanager' ||
    normalizedRoleType === 'recruiter'
  );
};

/**
 * The platform-wide ("owner" scope) seeded role — see types/rbac.d.ts's
 * comment on the historical 6 system roles. Gates the sidebar's Admin
 * section (authentication-service's /admin/* actions), which is a
 * role check rather than an Authorities check like everything else in
 * MenuItems: unlocking an account or rotating the signing key has no
 * natural place in the fixed permission catalog, and matches the backend's
 * own guard on POST /admin/signing-keys/rotate, which is platform-only
 * outright rather than granted by a permission a tenant could ever hold
 * (docs/API_CONTRACT.md §8).
 *
 * For a real (non-dev-bypass) platform login, `role.name` is set to
 * PLATFORM_CALLER_ROLE_NAME below — see its comment for why that's a
 * justified assignment, not a guess — so this resolves true for a real
 * platform session the same as it always has for the dev-bypass fixtures.
 */
export const isMasterSuperAdminRole = (role?: Role): boolean => {
  return normalizeRoleIdentifier(role?.name) === 'mastersuperadmin';
};

/**
 * The `role.name` a platform (no-`tenant_id`) caller's real session stores
 * — see Login/index.tsx's completeRealLogin — so the static
 * ROLE_AUTHORITIES fallback (the only source of effective permissions a
 * platform caller has client-side today; GET /v1/roles/users/{id}/permissions
 * is tenant-only, confirmed 403ing a real Super Admin token with "this
 * endpoint requires a tenant user") can resolve instead of silently denying
 * everything.
 *
 * This is NOT a guess and deliberately does NOT come from the JWT's `roles`
 * claim: organization-service's `PLATFORM_SCOPED_ROLES` invariant
 * (system_role.py) is exactly `{SUPER_ADMIN}` — a platform-scoped
 * (no-tenant) account cannot be anything else, enforced at the schema level
 * (`OrganizationRole` rejects any other role assignment lacking a tenant).
 * The `roles` claim would be the "right" source in principle, but
 * authentication-service's own docs (API_CONTRACT.md §11.3) say it's empty
 * until a role-snapshot publisher ships and warn against building UI on it
 * until then — confirmed empty on a real bootstrapped Super Admin's token
 * even though organization-service's own (Redis-backed, not JWT-based)
 * authorization already correctly treats that same account as fully
 * platform-authorized.
 */
export const PLATFORM_CALLER_ROLE_NAME = 'Master Super Admin';

export const extractCanManageCompanySettings = (token?: string | null): boolean => {
  if (!token) return false;

  try {
    const decodedToken = jwtDecode<TokenPermissionClaims>(token);
    return normalizeBooleanClaim(decodedToken?.canManageCompanySettings);
  } catch {
    return false;
  }
};

export const canViewCompanyTab = ({
  role,
  canManageCompanySettings,
  hasMyCompanyAuthority,
}: {
  role?: Role;
  canManageCompanySettings: boolean;
  hasMyCompanyAuthority: boolean;
}): boolean => {
  if (isHiringManagerOrRecruiterRole(role)) {
    return canManageCompanySettings;
  }

  return hasMyCompanyAuthority;
};
