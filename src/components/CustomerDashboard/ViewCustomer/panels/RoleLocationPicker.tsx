import React from 'react';
import { Select } from 'antd';
import type { Role } from '../../../../types';
import type { TenantOffice } from '../../../../api/organization-service/Tenants/offices';

type RoleLocationPickerProps = {
  roles: Role[];
  offices: TenantOffice[];
  roleId: string | undefined;
  onRoleChange: (roleId: string | undefined) => void;
  locationId: string | undefined;
  onLocationChange: (locationId: string | undefined) => void;
  rolePlaceholder?: string;
};

/**
 * Role + location, together — the same pair `AssignRoleModal.tsx` already
 * combines into one grant, pulled out so both the "Add user" form and the
 * per-company profile view's "Assign a role" section can offer the exact
 * same picker (and the same permission preview) instead of two independent
 * bare `<Select>`s that drift apart. Presentational only — value/onChange
 * for both fields, no data-fetching or submit logic of its own.
 *
 * Shows what a role actually GRANTS as soon as one is picked — using
 * `roles[].permissions`, already present on every row `useRolesCatalog`
 * returns, so this needs no extra fetch. Without this, choosing between two
 * similarly-named custom roles (recall: "avp" vs "sde" in this same tenant
 * this session) meant guessing from the name alone.
 */
const RoleLocationPicker: React.FC<RoleLocationPickerProps> = ({
  roles,
  offices,
  roleId,
  onRoleChange,
  locationId,
  onLocationChange,
  rolePlaceholder = 'Select a role',
}) => {
  const selectedRole = roles.find((role) => role.id === roleId);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          placeholder={rolePlaceholder}
          value={roleId}
          onChange={(value) => onRoleChange(value)}
          showSearch
          optionFilterProp="label"
          options={roles.map((role) => ({
            label: role.roleName,
            value: role.id,
          }))}
        />
        <Select
          placeholder="Location (optional — applies everywhere if blank)"
          allowClear
          value={locationId}
          onChange={(value) => onLocationChange(value ?? undefined)}
          options={offices.map((office) => ({
            // city alone isn't unique — a tenant with two offices in the same
            // city (seen live: "Sector 83-A, Netsmartz Towers" and "Netsmartz
            // Square, Sector-67", both Mohali) needs the address to tell them
            // apart. Matches the convention DepartmentsPanel already uses.
            label: `${office.city} — ${office.address_line_1}`,
            value: office.office_id,
          }))}
        />
      </div>

      {selectedRole && (
        <div className="rounded-xl bg-gray-50 border border-[var(--border)] p-3">
          {selectedRole.description && (
            <p className="text-xs text-gray-500 mb-2">{selectedRole.description}</p>
          )}
          <p className="text-xs font-semibold text-gray-600 mb-1.5">
            Grants {selectedRole.permissions.length}{' '}
            {selectedRole.permissions.length === 1 ? 'permission' : 'permissions'}
            {selectedRole.baseRoleName && (
              <span className="font-normal text-gray-400">
                {' '}
                (derived from {selectedRole.baseRoleName})
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {selectedRole.permissions.map((permission) => (
              <span
                key={permission}
                className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleLocationPicker;
