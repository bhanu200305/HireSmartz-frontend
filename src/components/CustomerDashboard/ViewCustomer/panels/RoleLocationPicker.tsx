import React, { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { FaPlus } from 'react-icons/fa';
import CreateRoleModal from '../../../RolesManagement/CreateRoleModal';
import { Authorities } from '../../../../constants/authorities.constant';
import useEffectivePermissions from '../../../../hooks/useEffectivePermissions';
import type { CreateRolePayload, Role } from '../../../../types';
import type { TenantOffice } from '../../../../api/organization-service/Tenants/offices';

type RoleLocationPickerProps = {
  roles: Role[];
  offices: TenantOffice[];
  roleId: string | undefined;
  onRoleChange: (roleId: string | undefined) => void;
  /** Every location this grant should apply at — a separate assignment row
   * is created per entry (see the two callers' handleAdd/handleAssign; the
   * backend has no bulk shape, only one location_id per grant). Empty =
   * "applies everywhere", the same as before this was multi-select. */
  locationIds: string[];
  onLocationIdsChange: (locationIds: string[]) => void;
  rolePlaceholder?: string;
  /** Which tenant a role created from here belongs to — required to open
   * "+ Custom Role" at all; omit when the caller has no tenant in scope yet
   * (e.g. Master Super Admin hasn't picked a company) and the button hides. */
  tenantId?: string;
  /** Same `createRole` every RolesManagement/CreateRoleModal caller already
   * uses (from `useRolesCatalog`) — reused here rather than duplicating the
   * create flow, so a role made from an "Add user"/"Grant a role" screen is
   * identical in every way to one made from Roles & Permissions directly. */
  onCreateRole?: (payload: CreateRolePayload) => Promise<Role>;
};

/** What `selectedRole` actually confers at one location — its override
 * there if one was set in Roles & Permissions (`master_role_location_override`,
 * REPLACES the baseline, never merges with it — see resolve_user_permissions.py's
 * own docstring), else its baseline. Same rule the backend resolver applies,
 * done client-side against data already in hand. */
const permissionsAtLocation = (role: Role, locationId: string): Role['permissions'] =>
  role.locationPermissions?.find((entry) => entry.locationId === locationId)?.permissions ??
  role.permissions;

/**
 * Role + location, together — the same pair `AssignRoleModal.tsx` already
 * combines into one grant, pulled out so both the "Add user" form and the
 * per-company profile view's "Assign a role" section can offer the exact
 * same picker (and the same permission preview) instead of two independent
 * bare `<Select>`s that drift apart. Presentational only — value/onChange
 * for both fields, no data-fetching or submit logic of its own.
 *
 * Location is multi-select: a role like "head_recruiter" can carry different
 * permissions per office (set up in Roles & Permissions' per-location
 * overrides), so granting it needs to name every office this person should
 * hold it at in one action, not one office per separate visit to this form.
 * Picking two or more locations shows a small tab row — same toggle idea as
 * the "Effective permissions" location switcher on the profile view — so
 * "head_recruiter has more at Location A, less at Location B" is visible
 * and confirmable BEFORE granting, not discovered after.
 *
 * "+ Custom Role" (when `tenantId`/`onCreateRole` are both given) opens the
 * exact same `CreateRoleModal` wizard Roles & Permissions uses — so a person
 * doesn't need to already know the right role exists before adding/granting
 * one; they can define it right here and it's selected the moment it's
 * created, with zero extra clicks to go find it in the picker afterward.
 */
const RoleLocationPicker: React.FC<RoleLocationPickerProps> = ({
  roles,
  offices,
  roleId,
  onRoleChange,
  locationIds,
  onLocationIdsChange,
  rolePlaceholder = 'Select a role',
  tenantId,
  onCreateRole,
}) => {
  const selectedRole = roles.find((role) => role.id === roleId);
  const effectivePermissions = useEffectivePermissions();
  const canCreateRole = effectivePermissions.includes(Authorities.ROLE_CREATE);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [previewLocationId, setPreviewLocationId] = useState<string | undefined>(undefined);

  const officeLabel = (officeId: string) => {
    const office = offices.find((o) => o.office_id === officeId);
    // City alone isn't unique — a tenant with two offices in the same city
    // (seen live: "Sector 83-A, Netsmartz Towers" and "Netsmartz Square,
    // Sector-67", both Mohali) needs the address to tell them apart. Matches
    // the convention DepartmentsPanel already uses.
    return office ? `${office.city}, ${office.address_line_1}` : 'Unknown location';
  };

  // The tab shown defaults to the first selected location, and follows it
  // if the selection changes underneath — picking a new set of locations
  // (or a different role) shouldn't leave the preview pinned to an office
  // that's no longer part of this grant.
  useEffect(() => {
    if (locationIds.length === 0) {
      setPreviewLocationId(undefined);
      return;
    }
    if (!previewLocationId || !locationIds.includes(previewLocationId)) {
      setPreviewLocationId(locationIds[0]);
    }
  }, [locationIds, roleId]);

  const availableLocations = useMemo(
    () =>
      offices.map((office) => ({
        id: office.office_id,
        name: officeLabel(office.office_id),
      })),
    [offices]
  );

  const handleCreateRole = async (payload: CreateRolePayload): Promise<Role> => {
    if (!onCreateRole) throw new Error('onCreateRole was not provided.');
    const created = await onCreateRole(payload);
    // The whole point of offering this inline: the new role is immediately
    // what's selected, not just added to the list for the person to then
    // find and pick a second time.
    onRoleChange(created.id);
    return created;
  };

  const previewPermissions =
    selectedRole && previewLocationId
      ? permissionsAtLocation(selectedRole, previewLocationId)
      : selectedRole?.permissions;

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
          mode="multiple"
          placeholder="Location(s) (optional, applies everywhere if blank)"
          allowClear
          value={locationIds}
          onChange={(value) => onLocationIdsChange(value ?? [])}
          maxTagCount="responsive"
          options={offices.map((office) => ({
            label: officeLabel(office.office_id),
            value: office.office_id,
          }))}
        />
      </div>

      {canCreateRole && tenantId && onCreateRole && (
        <button
          type="button"
          onClick={() => setCreateRoleOpen(true)}
          className="self-start inline-flex items-center gap-1 text-xs font-semibold text-primary-600 border border-primary-200 rounded-full px-3 py-1.5 hover:bg-primary-50 cursor-pointer"
        >
          <FaPlus size={9} /> Custom Role
        </button>
      )}

      {selectedRole && (
        <div className="rounded-xl bg-gray-50 border border-[var(--border)] p-3">
          {selectedRole.description && (
            <p className="text-xs text-gray-500 mb-2">{selectedRole.description}</p>
          )}

          {locationIds.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {locationIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreviewLocationId(id)}
                  className={`text-[11px] font-medium rounded-full px-2.5 py-1 border cursor-pointer ${
                    previewLocationId === id
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {officeLabel(id)}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs font-semibold text-gray-600 mb-1.5">
            Grants {previewPermissions?.length ?? 0}{' '}
            {previewPermissions?.length === 1 ? 'permission' : 'permissions'}
            {previewLocationId && (
              <span className="font-normal text-gray-400"> at this office</span>
            )}
            {selectedRole.baseRoleName && (
              <span className="font-normal text-gray-400">
                {' '}
                (derived from {selectedRole.baseRoleName})
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {previewPermissions?.map((permission) => (
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

      {tenantId && onCreateRole && (
        <CreateRoleModal
          open={createRoleOpen}
          onClose={() => setCreateRoleOpen(false)}
          scope="tenant"
          tenantId={tenantId}
          availableLocations={availableLocations}
          roles={roles}
          onCreate={handleCreateRole}
        />
      )}
    </div>
  );
};

export default RoleLocationPicker;
