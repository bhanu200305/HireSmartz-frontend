import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/provider/store';
import { Authorities, ROLE_AUTHORITIES } from '../constants/authorities.constant';
import { resolveEffectivePermissions } from '../shared/utils/auth/rbac.helpers';
import { convertToCamelCase } from '../shared/utils/methods';

/**
 * The single source of truth for "what can the signed-in user do right now."
 *
 * Two paths, depending on what the session carries:
 *  - Dynamic: a `resolvedRole` (a real Role record — baseline permissions +
 *    optional per-location overrides) is present, so the result is whatever
 *    resolveEffectivePermissions(role, activeLocationId) says. This is the
 *    path every session created/edited through the Roles & Permissions UI
 *    (or a real backend login) takes.
 *  - Legacy fallback: no `resolvedRole` (e.g. DevRoleSwitcher, or a backend
 *    response that hasn't been migrated yet) — same behaviour as before
 *    this feature existed: whatever `authorities` the session carries,
 *    unioned with the static ROLE_AUTHORITIES seed for the 6 pre-existing
 *    system role names.
 */
const useEffectivePermissions = (): Authorities[] => {
  const { authorities, role, resolvedRole, activeLocationId } = useSelector(
    (state: RootState) => state.LoginSlice
  );

  return useMemo(() => {
    if (resolvedRole) {
      return resolveEffectivePermissions(resolvedRole, activeLocationId);
    }

    const camelCaseRoleName = convertToCamelCase(role?.name || '');
    const staticFallback = ROLE_AUTHORITIES[role?.type]?.[camelCaseRoleName] || [];
    const dynamic = (authorities || []) as Authorities[];

    return Array.from(new Set([...dynamic, ...staticFallback]));
  }, [resolvedRole, activeLocationId, authorities, role]);
};

export default useEffectivePermissions;
