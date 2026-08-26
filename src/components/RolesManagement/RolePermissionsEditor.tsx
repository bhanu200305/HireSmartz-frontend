import React, { useState } from 'react';
import { PermissionMatrix } from '../shared';
import ReplicateToLocations from './ReplicateToLocations';
import type { Authorities } from '../../constants/authorities.constant';
import type { RoleLocationPermissions, RoleScope } from '../../types';

export type LocationOption = { id: string; name: string };

type RolePermissionsEditorProps = {
  permissions: Authorities[];
  onPermissionsChange: (next: Authorities[]) => void;
  ceiling: Authorities[];
  scope: RoleScope;
  locationOverrides: RoleLocationPermissions[];
  onLocationOverridesChange: (next: RoleLocationPermissions[]) => void;
  availableLocations: LocationOption[];
  /** Location overrides only make sense for tenant-scoped roles — CFP staff
   * (platform tier) aren't location-scoped. */
  showLocationOverrides: boolean;
};

const DEFAULT_TAB = '__default__';

/** Baseline permission matrix + per-location override list — shared by
 * CreateRoleModal's Step 2 and EditRoleModal so both stay in sync.
 *
 * ONE PANEL AT A TIME, PICKED FROM A ROW OF TABS UP TOP
 * -------------------------------------------------------
 * The baseline set ("Default") is a tab like any other, not a permanently
 * visible block with location overrides tacked on below it — that older
 * layout made it easy to edit two locations and not realize the baseline
 * above them was a real third permission set being saved alongside them.
 * Here there is exactly one matrix on screen, for whichever tab is active,
 * so "how many sets am I creating" is just "how many tabs have a dot."
 */
const RolePermissionsEditor: React.FC<RolePermissionsEditorProps> = ({
  permissions,
  onPermissionsChange,
  ceiling,
  scope,
  locationOverrides,
  onLocationOverridesChange,
  availableLocations,
  showLocationOverrides,
}) => {
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);

  if (!showLocationOverrides) {
    return (
      <PermissionMatrix
        value={permissions}
        onChange={onPermissionsChange}
        ceiling={ceiling}
        scope={scope}
      />
    );
  }

  const activeOverride =
    activeTab === DEFAULT_TAB
      ? undefined
      : locationOverrides.find((override) => override.locationId === activeTab);

  const activeLocation =
    activeTab === DEFAULT_TAB
      ? undefined
      : availableLocations.find((location) => location.id === activeTab);

  const addOverride = (locationId: string) => {
    const location = availableLocations.find((loc) => loc.id === locationId);
    if (!location) return;
    onLocationOverridesChange([
      ...locationOverrides,
      { locationId: location.id, locationName: location.name, permissions: [...permissions] },
    ]);
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

  /** Copies `sourcePermissions` onto every location in `targetLocationIds` —
   * an existing override there is overwritten in place, a location with no
   * override yet gets a brand-new one. Used by "Replicate to locations" from
   * both the Default baseline and any single location's own override. */
  const replicateTo = (sourcePermissions: Authorities[], targetLocationIds: string[]) => {
    const targetSet = new Set(targetLocationIds);
    const existingIds = new Set(locationOverrides.map((override) => override.locationId));

    const updated = locationOverrides.map((override) =>
      targetSet.has(override.locationId)
        ? { ...override, permissions: [...sourcePermissions] }
        : override
    );

    const created: RoleLocationPermissions[] = targetLocationIds
      .filter((id) => !existingIds.has(id))
      .map((id) => availableLocations.find((location) => location.id === id))
      .filter((location): location is LocationOption => Boolean(location))
      .map((location) => ({
        locationId: location.id,
        locationName: location.name,
        permissions: [...sourcePermissions],
      }));

    onLocationOverridesChange([...updated, ...created]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="font-semibold text-sm text-gray-900">Permissions by location</div>
        <p className="text-xs text-gray-500 mt-0.5 mb-3">
          &quot;Default&quot; is the baseline every location uses unless you give it its own set
          below. Pick a location to customise it.
        </p>

        <div className="flex items-center gap-1.5 flex-wrap border-b border-gray-100 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab(DEFAULT_TAB)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer transition-colors ${
              activeTab === DEFAULT_TAB
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Default
          </button>

          {availableLocations.map((location) => {
            const isConfigured = locationOverrides.some(
              (override) => override.locationId === location.id
            );
            const isActive = activeTab === location.id;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => setActiveTab(location.id)}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : isConfigured
                      ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isConfigured && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-primary-500'}`}
                  />
                )}
                {location.name}
              </button>
            );
          })}

          {availableLocations.length === 0 && (
            <p className="text-xs text-gray-400">No locations found for this company yet.</p>
          )}
        </div>
      </div>

      {activeTab === DEFAULT_TAB && (
        <div>
          {availableLocations.length > 0 && (
            <div className="flex justify-end mb-2">
              <ReplicateToLocations
                targets={availableLocations}
                onReplicate={(ids) => replicateTo(permissions, ids)}
              />
            </div>
          )}
          <PermissionMatrix
            value={permissions}
            onChange={onPermissionsChange}
            ceiling={ceiling}
            scope={scope}
          />
        </div>
      )}

      {activeTab !== DEFAULT_TAB && activeLocation && !activeOverride && (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center">
          <p className="text-xs text-gray-500 mb-3">
            {activeLocation.name} currently uses the Default set above. Give it its own permissions
            instead:
          </p>
          <button
            type="button"
            onClick={() => addOverride(activeLocation.id)}
            className="text-xs font-semibold text-primary-600 border border-primary-200 rounded-lg px-3 py-2 hover:bg-primary-50 cursor-pointer"
          >
            + Customise permissions for {activeLocation.name}
          </button>
        </div>
      )}

      {activeTab !== DEFAULT_TAB && activeOverride && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <ReplicateToLocations
              targets={availableLocations.filter(
                (location) => location.id !== activeOverride.locationId
              )}
              onReplicate={(ids) => replicateTo(activeOverride.permissions, ids)}
            />
            <button
              type="button"
              onClick={() => removeOverride(activeOverride.locationId)}
              className="text-xs font-semibold text-danger-text hover:underline cursor-pointer whitespace-nowrap"
            >
              − Remove override (use Default instead)
            </button>
          </div>
          <PermissionMatrix
            value={activeOverride.permissions}
            onChange={(next) => updateOverride(activeOverride.locationId, next)}
            ceiling={ceiling}
            scope={scope}
          />
        </div>
      )}
    </div>
  );
};

export default RolePermissionsEditor;
