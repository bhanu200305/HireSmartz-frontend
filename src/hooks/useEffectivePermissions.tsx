import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/provider/store';
import { Authorities } from '../constants/authorities.constant';
import { resolveEffectivePermissions } from '../shared/utils/auth/rbac.helpers';
import { findRoleAuthorities, normalizeRoleName } from '../shared/utils/auth/getAccess';
import { useGetUserDashboardQuery } from '../api/organization-service/Roles/dashboard';

// company_admin gets full, unscoped access always — never location-limited.
const _UNSCOPED_ROLE_NAMES = new Set(['companyadmin']);

/**
 * The single source of truth for "what can the signed-in user do right now."
 *
 * Three paths, depending on what the session carries:
 *  - Dynamic (dev-bypass): a `resolvedRole` is present, so the result comes
 *    from resolveEffectivePermissions(role, activeLocationId).
 *  - Live (real tenant login): resolved fresh from organization-service's
 *    per-location dashboard endpoint.
 *  - Legacy fallback: whatever `authorities` the session carries, unioned
 *    with the static ROLE_AUTHORITIES seed.
 */
const useEffectivePermissions = (): Authorities[] => {
  const { authorities, role, resolvedRole, activeLocationId, userId, callerKind } = useSelector(
    (state: RootState) => state.LoginSlice
  );

  const isUnscopedRole = _UNSCOPED_ROLE_NAMES.has(normalizeRoleName(role?.name));
  const isLiveTenantSession =
    !resolvedRole && !!userId && callerKind === 'tenant' && !isUnscopedRole;
  const { data: dashboard } = useGetUserDashboardQuery(
    { userId: userId as string, locationId: activeLocationId ?? undefined },
    // Refetch on mount - a mid-session permission grant must be picked up
    // without a full page refresh.
    { skip: !isLiveTenantSession, refetchOnMountOrArgChange: true }
  );

  return useMemo(() => {
    if (isUnscopedRole) {
      return findRoleAuthorities(role?.type, role?.name);
    }

    if (resolvedRole) {
      return resolveEffectivePermissions(resolvedRole, activeLocationId);
    }

    if (isLiveTenantSession && dashboard) {
      return dashboard.permissions as Authorities[];
    }

    const staticFallback = findRoleAuthorities(role?.type, role?.name);
    const dynamic = (authorities || []) as Authorities[];

    return Array.from(new Set([...dynamic, ...staticFallback]));
  }, [
    resolvedRole,
    activeLocationId,
    authorities,
    role,
    isLiveTenantSession,
    dashboard,
    isUnscopedRole,
  ]);
};

/** Forces a live permission re-check without waiting for the next mount. */
export const useEffectivePermissionsRefetch = (): (() => void) => {
  const { role, resolvedRole, activeLocationId, userId, callerKind } = useSelector(
    (state: RootState) => state.LoginSlice
  );
  const isUnscopedRole = _UNSCOPED_ROLE_NAMES.has(normalizeRoleName(role?.name));
  const isLiveTenantSession =
    !resolvedRole && !!userId && callerKind === 'tenant' && !isUnscopedRole;
  const { refetch } = useGetUserDashboardQuery(
    { userId: userId as string, locationId: activeLocationId ?? undefined },
    { skip: !isLiveTenantSession, refetchOnMountOrArgChange: true }
  );
  // refetch() throws if the query was skipped - guard for non-live sessions.
  return () => {
    if (isLiveTenantSession) {
      refetch();
    }
  };
};

export default useEffectivePermissions;
