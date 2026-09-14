import { Authorities, ROLE_AUTHORITIES } from '../../../constants/authorities.constant';

// Normalizes a role name for comparison, regardless of casing/format.
export const normalizeRoleName = (name: string | null | undefined): string =>
  (name ?? '').toLowerCase().replace(/[^a-z]/g, '');

export const findRoleAuthorities = (
  type: string | undefined,
  name: string | undefined
): Authorities[] => {
  const rolesForType = ROLE_AUTHORITIES[type as keyof typeof ROLE_AUTHORITIES] as
    | Record<string, Authorities[]>
    | undefined;
  if (!rolesForType) return [];
  const target = normalizeRoleName(name);
  const key = Object.keys(rolesForType).find((k) => normalizeRoleName(k) === target);
  return key ? rolesForType[key] : [];
};

// Feature/action-level gate for buttons and menu items. Pass
// useEffectivePermissions()'s result as effectivePermissions when available.
export const hasFeatureAccess = (
  feature: 'user' | 'company' | 'job_opening' | 'dashboard' | 'job_configuration',
  action: 'create' | 'view' | 'edit' | 'archive' | 'resend',
  role: {
    name: string;
    type: string;
  },
  effectivePermissions: Authorities[] = []
): boolean => {
  const authority = `${feature}_${action}`;
  // get authority enum from authorities constant
  const requiredAuthority = Authorities[authority.toUpperCase() as keyof typeof Authorities];
  if (!requiredAuthority) return false;

  if (effectivePermissions.length > 0) {
    return effectivePermissions.includes(requiredAuthority);
  }

  return findRoleAuthorities(role?.type, role?.name).includes(requiredAuthority);
};

// Roles that bypass per-job assignment entirely.
const _ASSIGNMENT_EXEMPT_ROLE_NAMES = new Set([
  'companyadmin',
  'superadmin',
  'cfpadmin',
  'cfpsupport',
]);

// Job-level gate on top of hasFeatureAccess — assigned, created, or admin.
// JOB_OPENING_DELETE is company_admin-and-above only, so it also serves as
// a reliable org-wide bypass signal.
export const isAssignedToJob = (
  job: { hiringManagerIds?: string[]; recruiterIds?: string[]; createdById?: string | null },
  userId: string | null | undefined,
  role: { name: string; type: string },
  effectivePermissions: Authorities[] = []
): boolean => {
  if (
    role?.type === 'owner' ||
    _ASSIGNMENT_EXEMPT_ROLE_NAMES.has(normalizeRoleName(role?.name)) ||
    effectivePermissions.includes(Authorities.JOB_OPENING_DELETE)
  ) {
    return true;
  }
  if (!userId) return false;
  return Boolean(
    job.hiringManagerIds?.includes(userId) ||
    job.recruiterIds?.includes(userId) ||
    job.createdById === userId
  );
};
