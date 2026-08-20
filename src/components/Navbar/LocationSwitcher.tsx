import React from 'react';
import { Select } from 'antd';
import { MdOutlineLocationOn } from 'react-icons/md';
import useActiveLocation from '../../hooks/useActiveLocation';

const ALL_LOCATIONS_VALUE = '__all__';

/**
 * Lets a multi-location user pick which of their locations' permissions are
 * currently in effect — see useActiveLocation/useEffectivePermissions.
 * Renders nothing for a single-location user (or while their location list
 * is still loading), same "don't show a control with nothing to control"
 * rule Navbar already applies to "Exit Impersonation".
 */
const LocationSwitcher: React.FC = () => {
  const { activeLocationId, accessibleLocations, hasMultipleLocations, setActiveLocationId } =
    useActiveLocation();

  if (!hasMultipleLocations) return null;

  return (
    <div className="flex items-center gap-2">
      <MdOutlineLocationOn size={18} className="text-gray-500" />
      <Select
        value={activeLocationId ?? ALL_LOCATIONS_VALUE}
        onChange={(value) =>
          setActiveLocationId(value === ALL_LOCATIONS_VALUE ? null : (value as string))
        }
        className="w-44"
        size="middle"
        options={[
          { value: ALL_LOCATIONS_VALUE, label: 'All locations' },
          ...accessibleLocations.map((location) => ({
            value: location.id,
            label: location.name,
          })),
        ]}
      />
    </div>
  );
};

export default LocationSwitcher;
