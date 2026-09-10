import { Authorities, ROLE_AUTHORITIES } from '../../../constants/authorities.constant';
import { convertToCamelCase } from '../methods';

/**
 * Feature/action-level gate for buttons and menu items (as opposed to
 * useHasAccess, which is the hook form of the same check).
 *
 * `effectivePermissions` should be the caller's resolved permission set —
 * pass the result of useEffectivePermissions() so this never disagrees with
 * useHasAccess/the sidebar. If omitted (legacy call sites not yet updated),
 * this falls back to the static ROLE_AUTHORITIES seed only, same as before.
 */
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

  const allowedAuthorities = ROLE_AUTHORITIES[role?.type]?.[convertToCamelCase(role?.name)] || [];
  return allowedAuthorities.includes(requiredAuthority);
};

/** Job-level gate on top of hasFeatureAccess — assigned, created, or admin. */
export const isAssignedToJob = (
  job: { hiringManagerIds?: string[]; recruiterIds?: string[]; createdById?: string | null },
  userId: string | null | undefined,
  role: { name: string; type: string }
): boolean => {
  // Not convertToCamelCase — it doesn't handle underscore_case.
  if (role?.type === 'owner' || role?.name === 'company_admin') return true;
  if (!userId) return false;
  return Boolean(
    job.hiringManagerIds?.includes(userId) ||
    job.recruiterIds?.includes(userId) ||
    job.createdById === userId
  );
};
