import React from 'react';
import { PermissionMatrix } from '../shared';
import type { Authorities } from '../../constants/authorities.constant';
import type { RoleLocationPermissions } from '../../types';

type LocationOverrideBlockProps = {
  override: RoleLocationPermissions;
  ceiling: Authorities[];
  onChange: (next: Authorities[]) => void;
  onRemove: () => void;
};

/** One "this role behaves differently at this location" entry — its own
 * independent permission matrix, cloned from the baseline when added. */
const LocationOverrideBlock: React.FC<LocationOverrideBlockProps> = ({
  override,
  ceiling,
  onChange,
  onRemove,
}) => (
  <div className="border-[1.5px] border-accent-300 bg-accent-50 rounded-xl px-4 pt-3.5 pb-1 mb-3.5">
    <div className="flex items-center justify-between mb-3">
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-info-bg text-info-text">
        {override.locationName ?? `Location ${override.locationId}`}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="text-xs font-semibold text-danger-text hover:underline cursor-pointer"
      >
        − Remove override
      </button>
    </div>
    <PermissionMatrix value={override.permissions} onChange={onChange} ceiling={ceiling} />
  </div>
);

export default LocationOverrideBlock;
