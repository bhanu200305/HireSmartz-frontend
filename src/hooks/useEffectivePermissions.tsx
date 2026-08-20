import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/provider/store';
import { Authorities, ROLE_AUTHORITIES } from '../constants/authorities.constant';
import { resolveEffectivePermissions } from '../shared/utils/auth/rbac.helpers';
import { convertToCamelCase } from '../shared/utils/methods';
import { useGetUserDashboardQuery } from '../api/organization-service/Roles/dashboard';

/**
 * The single source of truth for "what can the signed-in user do right now."
 *
 * Three paths, depending on what the session carries:
 *  - Dynamic (dev-bypass): a `resolvedRole` (a real Role record — baseline
 *    permissions + optional per-location overrides) is present, so the
 *    result is whatever resolveEffectivePermissions(role, activeLocationId)
 *    says. Only ever populated by the dev-bypass role switcher today.
 *  - Live (real tenant login): no `resolvedRole`, but a real tenant session
 *    — resolved fresh from organization-service's per-location dashboard
 *    endpoint for whichever location is currently active (or the
 *    all-locations union when none is). This is what makes the location
 *    toggle (useActiveLocation) actually change what the user can do.
 *  - Legacy fallback: neither of the above (e.g. a platform session, or the
 *    dashboard call still loading/failed) — same behaviour as before this
 *    feature existed: whatever `authorities` the session carries, unioned
 *    with the static ROLE_AUTHORITIES seed for the 6 pre-existing system
 *    role names.
 */
const useEffectivePermissions = (): Authorities[] => {
  const { authorities, role, resolvedRole, activeLocationId, userId, callerKind } = useSelector(
    (state: RootState) => state.LoginSlice
  );

  const isLiveTenantSession = !resolvedRole && !!userId && callerKind === 'tenant';
  const { data: dashboard } = useGetUserDashboardQuery(
    { userId: userId as string, locationId: activeLocationId ?? undefined },
    { skip: !isLiveTenantSession }
  );

  return useMemo(() => {
    if (resolvedRole) {
      return resolveEffectivePermissions(resolvedRole, activeLocationId);
    }

    if (isLiveTenantSession && dashboard) {
      return dashboard.permissions as Authorities[];
    }

    const camelCaseRoleName = convertToCamelCase(role?.name || '');
    const staticFallback = ROLE_AUTHORITIES[role?.type]?.[camelCaseRoleName] || [];
    const dynamic = (authorities || []) as Authorities[];

    return Array.from(new Set([...dynamic, ...staticFallback]));
  }, [resolvedRole, activeLocationId, authorities, role, isLiveTenantSession, dashboard]);
};

export default useEffectivePermissions;
