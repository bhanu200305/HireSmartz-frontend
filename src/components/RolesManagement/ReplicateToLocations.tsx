import React, { useState } from 'react';
import { Dropdown } from 'antd';
import { MdContentCopy } from 'react-icons/md';
import { CustomCheckbox } from '../shared/ui/checkbox';
import type { LocationOption } from './RolePermissionsEditor';

type ReplicateToLocationsProps = {
  /** Locations that can receive the current permission set — whichever
   * location you're replicating *from* is excluded by the caller (copying a
   * location onto itself is a no-op). */
  targets: LocationOption[];
  /** Copies whatever set is currently open (baseline, or the active
   * location's override) onto every location id passed here — creating a
   * new override where one doesn't exist yet, overwriting one where it
   * does. */
  onReplicate: (locationIds: string[]) => void;
};

/**
 * "Replicate to locations" — lets whichever permission set is currently open
 * (the Default baseline, or one location's own override) be copied onto any
 * number of other locations in a single action, instead of re-checking the
 * same boxes location by location. A checkbox-list dropdown rather than a
 * multi-select input since the source data (LocationOption) has nothing but
 * an id/name to pick from and a plain checkbox list reads faster here.
 */
const ReplicateToLocations: React.FC<ReplicateToLocationsProps> = ({ targets, onReplicate }) => {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string, isChecked: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (isChecked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setChecked(new Set());
  };

  const apply = () => {
    if (checked.size === 0) return;
    onReplicate(Array.from(checked));
    handleOpenChange(false);
  };

  const disabled = targets.length === 0;

  return (
    <Dropdown
      trigger={['click']}
      open={open}
      onOpenChange={handleOpenChange}
      disabled={disabled}
      dropdownRender={() => (
        <div className="w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <p className="text-xs font-semibold text-gray-900 mb-1">Replicate to Locations</p>
          <p className="text-xs text-gray-500 mb-2.5">
            Copies this exact permission set to every location checked below, overwriting any
            override it already has.
          </p>
          <div className="thin-scrollbar mb-3 flex max-h-48 flex-col gap-1 overflow-y-auto">
            {targets.map((location) => (
              <CustomCheckbox
                key={location.id}
                label={location.name}
                checked={checked.has(location.id)}
                onChange={(e) => toggle(location.id, e.target.checked)}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={checked.size === 0}
              className="cursor-pointer rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply{checked.size > 0 ? ` to ${checked.size}` : ''}
            </button>
          </div>
        </div>
      )}
    >
      <button
        type="button"
        disabled={disabled}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MdContentCopy size={13} />
        Replicate To Locations
      </button>
    </Dropdown>
  );
};

export default ReplicateToLocations;
