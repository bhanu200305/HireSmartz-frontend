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
