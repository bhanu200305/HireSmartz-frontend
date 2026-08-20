import { useMemo } from 'react';
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

  return {
    activeLocationId: activeLocationId ?? null,
    accessibleLocations,
    isLoading: roleLocations.length === 0 && isFetching,
    hasMultipleLocations: accessibleLocations.length > 1,
    setActiveLocationId: (locationId: string | null) => dispatch(setActiveLocation(locationId)),
  };
};

export default useActiveLocation;
