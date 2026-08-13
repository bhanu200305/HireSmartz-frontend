import React from 'react';
import { Navigate } from 'react-router-dom';
import { Authorities } from '../constants/authorities.constant';
import useEffectivePermissions from '../hooks/useEffectivePermissions';

type RequirePermissionProps = {
  /** A single permission, or several — `mode` decides how they combine. */
  permission: Authorities | Authorities[];
  /** 'any' (default) = at least one permission required; 'all' = every one required. */
  mode?: 'any' | 'all';
  children: React.ReactNode;
};

/**
 * Route/section-level permission gate — defense in depth alongside
 * organization-service's own `require_permission`/`require_platform_permission`
 * (RBAC_API.md), not a replacement for it: the backend is what actually
 * enforces access, this just keeps a user without a permission from ever
 * seeing (or bouncing off a 403 inside) a screen they can't use.
 *
 * Sits *inside* PrivateRoute — PrivateRoute already confirmed there's a
 * session at all; this confirms that session can do the specific thing the
 * screen is for. Redirects home rather than rendering an inline "access
 * denied" block, matching the pattern already used for `shouldRestrictCompanyAccess`
 * in MyCompany/index.tsx and the non-admin redirect in AdminTools/index.tsx.
 */
const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  mode = 'any',
  children,
}) => {
  const required = Array.isArray(permission) ? permission : [permission];
  // A single call to the underlying hook, then plain array checks — calling
  // a hook once per required permission inside .map() would violate the
  // Rules of Hooks (hook-call count must not vary with `permission`'s length).
  const effectivePermissions = useEffectivePermissions();
  const isAllowed =
    mode === 'all'
      ? required.every((authority) => effectivePermissions.includes(authority))
      : required.some((authority) => effectivePermissions.includes(authority));

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RequirePermission;
