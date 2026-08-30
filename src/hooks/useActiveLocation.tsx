import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/provider/store';
import { setActiveLocation } from '../redux/slices/loginSlice';
import { useGetUserDashboardQuery } from '../api/organization-service/Roles/dashboard';

export type LocationOption = { id: string; name: string };

/**
 * The current user's accessible locations, which one is active, and a
 * switcher — this is what makes a role's permissions "location-wise": a
 * role can carry a different permission set per location (see
 * resolveEffectivePermissions), and this hook is how the UI picks which one
 * is currently in effect.
 */
const useActiveLocation = () => {
  const dispatch = useDispatch();
  const { activeLocationId, resolvedRole, userId, callerKind } = useSelector(
    (state: RootState) => state.LoginSlice
  );

  // A role created with per-location overrides already knows its own
  // locations (see the dev-bypass seed and the Roles & Permissions "location
  // overrides" section) — prefer that so the switcher matches what the
  // role actually varies by. For a real tenant login (no resolvedRole),
  // fall back to organization-service's own per-user dashboard, which
  // already lists every location this user may switch between — the SAME
  // call useEffectivePermissions makes for the active location, so RTK
  // Query serves this from one shared cache entry rather than firing a
  // second request.
  //
  // `dashboard.available_locations[].label` is trusted as-is, not rebuilt
  // client-side against a separate office fetch: an earlier version of this
  // hook did that to disambiguate two same-city offices, but the office
  // list needs `location:read` — a permission plenty of ordinary tenant
  // users (this hook runs for EVERY tenant session) don't hold, so that
  // fetch silently failed and the switcher fell back to the ambiguous label
  // anyway. The real fix lives server-side now: resolve_user_dashboard.py
  // itself builds `city — address_line_1` whenever no location_code is set,
  // so every caller gets a disambiguated label with no extra permission
  // needed.
  const roleLocations = resolvedRole?.locationPermissions ?? [];
  const isLiveTenantSession = !resolvedRole && !!userId && callerKind === 'tenant';
  const { data: dashboard, isFetching } = useGetUserDashboardQuery(
    { userId: userId as string, locationId: activeLocationId ?? undefined },
    { skip: !isLiveTenantSession }
  );

  const accessibleLocations: LocationOption[] = useMemo(() => {
    if (roleLocations.length > 0) {
      return roleLocations.map((entry) => ({
        id: entry.locationId,
        name: entry.locationName || `Location ${entry.locationId}`,
      }));
    }
    return (dashboard?.available_locations || []).map((location) => ({
      id: location.location_id,
      name: location.label,
    }));
  }, [roleLocations, dashboard]);

  // No "all locations" union option — a multi-location user is always
  // viewing exactly one specific location's permissions, never a combined
  // view (the union tends to look identical to whichever location holds the
  // most, which reads as "nothing changed" when switching). Default to the
  // first one as soon as the list loads, rather than leaving it unset.
  useEffect(() => {
    if (activeLocationId == null && accessibleLocations.length > 0) {
      dispatch(setActiveLocation(accessibleLocations[0].id));
    }
  }, [activeLocationId, accessibleLocations, dispatch]);

  return {
    activeLocationId: activeLocationId ?? null,
    accessibleLocations,
    isLoading: roleLocations.length === 0 && isFetching,
    hasMultipleLocations: accessibleLocations.length > 1,
    setActiveLocationId: (locationId: string | null) => dispatch(setActiveLocation(locationId)),
  };
};

export default useActiveLocation;
