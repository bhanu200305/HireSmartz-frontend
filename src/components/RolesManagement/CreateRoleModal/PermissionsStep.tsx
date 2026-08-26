import React from 'react';
import RolePermissionsEditor, { type LocationOption } from '../RolePermissionsEditor';
import type { Authorities } from '../../../constants/authorities.constant';
import type { RoleLocationPermissions, RoleScope } from '../../../types';

type PermissionsStepProps = {
  permissions: Authorities[];
  onPermissionsChange: (next: Authorities[]) => void;
  ceiling: Authorities[];
  scope: RoleScope;
  locationOverrides: RoleLocationPermissions[];
  onLocationOverridesChange: (next: RoleLocationPermissions[]) => void;
  availableLocations: LocationOption[];
  showLocationOverrides: boolean;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

/** Create Role — step 2 of 2: baseline permissions + location overrides. */
const PermissionsStep: React.FC<PermissionsStepProps> = ({
  permissions,
  onPermissionsChange,
  ceiling,
  scope,
  locationOverrides,
  onLocationOverridesChange,
  availableLocations,
  showLocationOverrides,
  onBack,
  onSubmit,
  isSubmitting,
}) => (
  <div className="flex flex-col">
    <p className="text-xs text-gray-500 mb-4">
      Every box starts checked to your own permissions — uncheck anything this role shouldn&apos;t
      have. You can&apos;t grant a permission you don&apos;t hold yourself.
    </p>

    <RolePermissionsEditor
      permissions={permissions}
      onPermissionsChange={onPermissionsChange}
      ceiling={ceiling}
      scope={scope}
      locationOverrides={locationOverrides}
      onLocationOverridesChange={onLocationOverridesChange}
      availableLocations={availableLocations}
      showLocationOverrides={showLocationOverrides}
    />

    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting}
        className="text-sm font-semibold text-gray-600 border border-gray-200 rounded-full px-5 py-2 cursor-pointer"
      >
        ← Back
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="text-sm font-semibold text-white bg-primary-600 rounded-full px-5 py-2 disabled:opacity-60 cursor-pointer"
      >
        {isSubmitting ? 'Creating…' : '✓ Custom Role'}
      </button>
    </div>
  </div>
);

export default PermissionsStep;
