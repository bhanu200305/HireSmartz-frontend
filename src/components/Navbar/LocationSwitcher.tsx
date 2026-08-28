import React from 'react';
import { Select } from 'antd';
import { MdOutlineLocationOn } from 'react-icons/md';
import useActiveLocation from '../../hooks/useActiveLocation';

/**
 * Lets a multi-location user pick which of their locations' permissions are
 * currently in effect — see useActiveLocation/useEffectivePermissions.
 * Renders nothing for a single-location user (or while their location list
 * is still loading), same "don't show a control with nothing to control"
 * rule Navbar already applies to "Exit Impersonation".
 *
 * No "all locations" option — always exactly one specific location.
 * useActiveLocation defaults to the first one as soon as the list loads, so
 * there's nothing unset for this control to represent.
 */
const LocationSwitcher: React.FC = () => {
  const { activeLocationId, accessibleLocations, hasMultipleLocations, setActiveLocationId } =
    useActiveLocation();

  if (!hasMultipleLocations) return null;

  return (
    <div className="cfp-dropdown-trigger w-44">
      <MdOutlineLocationOn className="cfp-dropdown-filter-icon" aria-hidden />
      <Select
        value={activeLocationId ?? undefined}
        onChange={(value) => setActiveLocationId(value)}
        className="w-full custom-select"
        variant="borderless"
        options={accessibleLocations.map((location) => ({
          value: location.id,
          label: location.name,
        }))}
      />
    </div>
  );
};

export default LocationSwitcher;
