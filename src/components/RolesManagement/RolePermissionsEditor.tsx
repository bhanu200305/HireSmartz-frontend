import React, { useState } from 'react';
import { PermissionMatrix } from '../shared';
import type { Authorities } from '../../constants/authorities.constant';
import type { RoleLocationPermissions } from '../../types';
import LocationOverrideBlock from './LocationOverrideBlock';

export type LocationOption = { id: string; name: string };

type RolePermissionsEditorProps = {
  permissions: Authorities[];
  onPermissionsChange: (next: Authorities[]) => void;
  ceiling: Authorities[];
  locationOverrides: RoleLocationPermissions[];
  onLocationOverridesChange: (next: RoleLocationPermissions[]) => void;
  availableLocations: LocationOption[];
  /** Location overrides only make sense for tenant-scoped roles — CFP staff
   * (platform tier) aren't location-scoped. */
  showLocationOverrides: boolean;
};

/** Baseline permission matrix + per-location override list — shared by
 * CreateRoleModal's Step 2 and EditRoleModal so both stay in sync. */
const RolePermissionsEditor: React.FC<RolePermissionsEditorProps> = ({
  permissions,
  onPermissionsChange,
  ceiling,
  locationOverrides,
  onLocationOverridesChange,
  availableLocations,
  showLocationOverrides,
}) => {
  const [pendingLocationId, setPendingLocationId] = useState<string>('');

  const overriddenIds = new Set(locationOverrides.map((override) => override.locationId));
  const pickableLocations = availableLocations.filter((loc) => !overriddenIds.has(loc.id));

  const addOverride = () => {
    if (pendingLocationId === '') return;
    const location = availableLocations.find((loc) => loc.id === pendingLocationId);
    if (!location) return;
    onLocationOverridesChange([
      ...locationOverrides,
      { locationId: location.id, locationName: location.name, permissions: [...permissions] },
    ]);
    setPendingLocationId('');
  };

  const removeOverride = (locationId: string) => {
    onLocationOverridesChange(
      locationOverrides.filter((override) => override.locationId !== locationId)
    );
  };

  const updateOverride = (locationId: string, next: Authorities[]) => {
    onLocationOverridesChange(
      locationOverrides.map((override) =>
        override.locationId === locationId ? { ...override, permissions: next } : override
      )
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PermissionMatrix value={permissions} onChange={onPermissionsChange} ceiling={ceiling} />

      {showLocationOverrides && (
        <div className="pt-4 border-t border-gray-100">
          <div className="font-semibold text-sm text-gray-900">Location-specific overrides</div>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">
            Optional — give this role a different permission set at a specific location. Any
            location without an override uses the baseline set above.
          </p>

          {locationOverrides.map((override) => (
            <LocationOverrideBlock
              key={override.locationId}
              override={override}
              ceiling={ceiling}
              onChange={(next) => updateOverride(override.locationId, next)}
              onRemove={() => removeOverride(override.locationId)}
            />
          ))}

          {availableLocations.length === 0 ? (
            <p className="text-xs text-gray-400">No locations found for this company yet.</p>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-2 bg-white min-w-[180px]"
                value={pendingLocationId}
                onChange={(e) => setPendingLocationId(e.target.value)}
                disabled={pickableLocations.length === 0}
              >
                <option value="">
                  {pickableLocations.length === 0
                    ? 'No more locations to add'
                    : 'Select a location…'}
                </option>
                {pickableLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addOverride}
                disabled={pendingLocationId === ''}
                className="text-xs font-semibold text-primary-600 border border-primary-200 rounded-lg px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-50 cursor-pointer"
              >
                + Add location override
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RolePermissionsEditor;
