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

/**
 * The platform-wide ("owner" scope) seeded role — see types/rbac.d.ts's
 * comment on the historical 6 system roles. `role.name` for a real platform
 * login now correctly resolves to the caller's actual role
 * (Login/index.tsx's completeRealLogin fetches GET /platform/staff/me at
 * login and threads it through) — cfp_admin/cfp_support pass through as
 * those literal strings, only a genuine Super Admin resolves to
 * PLATFORM_CALLER_ROLE_NAME ('Master Super Admin', matching
 * `ROLE_AUTHORITIES.owner.masterSuperAdmin`'s key) — so this now means what
 * its name says, both for RolesManagement's platform-vs-own-tier catalog
 * switch and as the static ROLE_AUTHORITIES fallback key for a platform
 * caller's effective permissions app-wide (useEffectivePermissions ->
 * findRoleAuthorities(role.type, role.name)).
 *
 * isPlatformSuperAdminRole/isCfpSupportRole below still exist and still work
 * correctly (each re-fetches the same real role reactively, redundant with
 * but consistent with this) — kept rather than removed now that Redux is
 * also correct, since they were already shipped, verified, and several
 * screens depend on them; not worth the churn to collapse into one source
 * for its own sake.
 */
export const isMasterSuperAdminRole = (role?: Role): boolean => {
  return normalizeRoleIdentifier(role?.name) === 'mastersuperadmin';
};

/**
 * The REAL platform role (org-service's GET /platform/staff/me — `role`).
 * Gates the sidebar's Admin section (unlocking an account, signing-key
 * rotation) — cfp_admin/cfp_support must not pass this.
 *
 * Backend still blocks the actual privileged actions server-side either way
 * (auth:update/auth:approve, docs/API_CONTRACT.md §8) — this only controls
 * whether the nav entry/page is shown to begin with.
 */
export const isPlatformSuperAdminRole = (realPlatformRole?: string | null): boolean => {
  return normalizeRoleIdentifier(realPlatformRole ?? undefined) === 'superadmin';
};

/**
 * The REAL platform role, same source and reasoning as
 * isPlatformSuperAdminRole above — gates the sidebar's "My Support Access"
 * nav item (a cfp_support staff member's own list of tenants they currently
 * have a time-limited grant into) and switches CustomerDashboard/ViewCustomer
 * into its read-only, grant-restricted mode for that role. cfp_admin/
 * super_admin must not pass this.
 */
export const isCfpSupportRole = (realPlatformRole?: string | null): boolean => {
  return normalizeRoleIdentifier(realPlatformRole ?? undefined) === 'cfpsupport';
};

/**
 * Gates the sidebar's "Activity" nav item — a role check rather than an
 * Authorities check, same reasoning as isMasterSuperAdminRole above: there's
 * no Authorities catalog entry scoped to exactly {hiring_manager, recruiter}
 * and no one else (the real permissions both roles hold, e.g.
 * JOB_OPENING_VIEW, are also held by company_admin, who already has their
 * own "Audit Log"/"Activity" surfaces under My Company).
 *
 * For a real (non-dev-bypass) tenant login, `role.name` is the raw JWT
 * `roles` claim (Login/index.tsx's completeRealLogin) — organization-service's
 * seeded system roles are fixed keys ('hiring_manager', 'recruiter'), so this
 * resolves correctly for a real session. A tenant that renames/customizes a
 * role would break this the same way it would any other role-name check.
 */
export const isHiringManagerOrRecruiterRole = (role?: Role): boolean => {
  const normalized = normalizeRoleIdentifier(role?.name);
  return normalized === 'hiringmanager' || normalized === 'recruiter';
};

/**
 * `role.name` for a genuine Super Admin platform login, and the fallback
 * value Login/index.tsx's completeRealLogin uses for ANY platform caller
 * when GET /platform/staff/me can't be reached (backend down, endpoint not
 * yet deployed) — degrading to "treat as Super Admin" rather than to
 * nothing, so a completed login is never blocked or narrowed below what it
 * showed before that endpoint existed. In the normal case (the fetch
 * succeeds) this is only actually assigned when the real role IS
 * 'super_admin' — cfp_admin/cfp_support get their own literal role strings
 * instead, which already correctly key into `ROLE_AUTHORITIES.owner`'s
 * `cfpAdmin`/`cfpSupport` entries via normalizeRoleIdentifier.
 *
 * Deliberately still NOT sourced from the JWT's `roles` claim even now that
 * a real source exists elsewhere: authentication-service's own docs
 * (API_CONTRACT.md §11.3) say that claim is empty until a role-snapshot
 * publisher ships, confirmed still empty on a real bootstrapped platform
 * token — GET /platform/staff/me is the one real source today.
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
