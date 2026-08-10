import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/provider/store';
import { setActiveLocation } from '../redux/slices/loginSlice';
import { useGetMyLocationsQuery } from '../api/job-service/JobOpening/GetJobLocations';

export type LocationOption = { id: number; name: string };

/**
 * The current user's accessible locations, which one is active, and a
 * switcher — this is what makes a role's permissions "location-wise": a
 * role can carry a different permission set per location (see
 * resolveEffectivePermissions), and this hook is how the UI picks which one
 * is currently in effect.
 */
const useActiveLocation = () => {
  const dispatch = useDispatch();
  const { activeLocationId, resolvedRole } = useSelector((state: RootState) => state.LoginSlice);

  // A role created with per-location overrides already knows its own
  // locations (see the dev-bypass seed and the Roles & Permissions "location
  // overrides" section) — prefer that so the switcher matches what the
  // role actually varies by. Fall back to the user's own accessible
  // locations (from the tenant's location list) once a real backend is wired up.
  const roleLocations = resolvedRole?.locationPermissions ?? [];
  const { data: myLocationsResponse, isFetching } = useGetMyLocationsQuery(
    { activeOnly: true },
    { skip: roleLocations.length > 0 }
  );

  const accessibleLocations: LocationOption[] = useMemo(() => {
    if (roleLocations.length > 0) {
      return roleLocations.map((entry) => ({
        id: entry.locationId,
        name: entry.locationName || `Location ${entry.locationId}`,
      }));
    }
    return (myLocationsResponse?.data || []).map((location) => ({
      id: location.id,
      name: location.name,
    }));
  }, [roleLocations, myLocationsResponse]);

  return {
    activeLocationId: activeLocationId ?? null,
    accessibleLocations,
    isLoading: roleLocations.length === 0 && isFetching,
    hasMultipleLocations: accessibleLocations.length > 1,
    setActiveLocationId: (locationId: number | null) => dispatch(setActiveLocation(locationId)),
  };
};

export default useActiveLocation;
