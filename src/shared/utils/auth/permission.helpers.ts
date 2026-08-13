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
 * Same caveat as isHiringManagerOrRecruiterRole: `role` is currently empty
 * for a real (non-dev-bypass) login — authentication-service's login
 * response carries no role claim yet (see Login/index.tsx's
 * completeRealLogin) — so this reads false for every real session today,
 * not just non-admins. It only resolves true today via the dev-bypass
 * fixtures. Revisit once role/permission data actually reaches the
 * frontend.
 */
export const isMasterSuperAdminRole = (role?: Role): boolean => {
  return normalizeRoleIdentifier(role?.name) === 'mastersuperadmin';
};

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
