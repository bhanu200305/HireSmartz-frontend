import React, { useEffect, useMemo, useState } from 'react';
import { Input, showToast } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import RolePermissionsEditor, { type LocationOption } from './RolePermissionsEditor';
import useEffectivePermissions from '../../hooks/useEffectivePermissions';
import { getAssignablePermissionCeiling } from '../../shared/utils/auth/rbac.helpers';
import { getPlatformErrorMessage } from '../../shared/utils/api/platformErrorEnvelope';
import type { Authorities } from '../../constants/authorities.constant';
import type { Role, RoleLocationPermissions, UpdateRolePayload } from '../../types';

type EditRoleModalProps = {
  role: Role | null;
  onClose: () => void;
  availableLocations: LocationOption[];
  onSave: (payload: UpdateRolePayload) => Promise<Role>;
};

/** Single-panel edit — no template re-pick, just the permission matrix +
 * location overrides, pre-filled from the role being edited. Only ever
 * opened for custom roles; system roles show no Edit action (see RoleTable). */
const EditRoleModal: React.FC<EditRoleModalProps> = ({
  role,
  onClose,
  availableLocations,
  onSave,
}) => {
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState<Authorities[]>([]);
  const [locationOverrides, setLocationOverrides] = useState<RoleLocationPermissions[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const actingPermissions = useEffectivePermissions();
  // Same second ceiling CreateRoleModal applies: the backend caps a custom
  // role at its base role's own permission set (PERMISSION_EXCEEDS_BASE_ROLE
  // otherwise). Unlike create, no template lookup needed — the role being
  // edited already carries its real base_role_permissions from the backend.
  const ceiling = useMemo(() => {
    const acting = getAssignablePermissionCeiling(actingPermissions);
    if (!role?.baseRolePermissions) return acting;
    const baseSet = new Set(role.baseRolePermissions);
    return acting.filter((code) => baseSet.has(code));
  }, [actingPermissions, role]);

  useEffect(() => {
    if (!role) return;
    setRoleName(role.roleName);
    setPermissions(role.permissions);
    setLocationOverrides(role.locationPermissions);
  }, [role]);

  if (!role) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        roleId: role.id,
        roleName: roleName.trim(),
        permissions,
        locationPermissions: locationOverrides,
      });
      showToast({ message: `"${roleName.trim()}" updated.`, type: 'success' });
      onClose();
    } catch (err) {
      showToast({
        message: getPlatformErrorMessage(err, 'Failed to update role.'),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AntdCommonModal
      open={Boolean(role)}
      onClose={onClose}
      title={`Edit permissions for "${role.roleName}"`}
      subtitle="Adjust this role's baseline permissions and location-specific overrides."
      modalProps={{
        width: 760,
        // No hardcoded vh cap here — index.css already caps every antd
        // Modal's `.ant-modal-content` at the real, ResizeObserver-tracked
        // gap between the app header/footer and scrolls `.modal-content`
        // inside it. A per-modal vh guess on top of that is a second,
        // independent height limit that can disagree with the real one and
        // silently clip this modal's own sticky Save/Cancel row — see the
        // comment on `.ant-modal-body .modal-content` in index.css.
        // `overflowX: 'hidden'` avoids a stray horizontal scrollbar per the
        // CSS "orthogonal overflow" rule (overflow-y non-visible computes
        // overflow-x to auto unless it's set explicitly too).
        styles: {
          body: { overflowX: 'hidden', paddingRight: 14 },
        },
        classNames: { body: 'thin-scrollbar' },
      }}
    >
      <div className="mb-5">
        <label htmlFor="editRoleName" className="block text-xs font-semibold text-gray-700 mb-1.5">
          Designation
        </label>
        <Input
          id="editRoleName"
          value={roleName}
          maxLength={60}
          onChange={(e) => setRoleName(e.target.value)}
        />
      </div>

      <RolePermissionsEditor
        permissions={permissions}
        onPermissionsChange={setPermissions}
        ceiling={ceiling}
        scope={role.scope}
        locationOverrides={locationOverrides}
        onLocationOverridesChange={setLocationOverrides}
        availableLocations={availableLocations}
        showLocationOverrides={role.scope === 'tenant'}
      />

      {/* Sticky, not scrolled-away: same treatment as CreateRoleModal's
          Step 2 footer — this renders the identical RolePermissionsEditor
          and can grow just as tall, so Cancel/Save need to stay reachable
          without scrolling all the way down past it. */}
      <div className="sticky bottom-0 -mx-6 mt-6 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4 z-10">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="text-sm font-semibold text-gray-600 border border-gray-200 rounded-full px-5 py-2 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !roleName.trim()}
          className="text-sm font-semibold text-white bg-primary-600 rounded-full px-5 py-2 disabled:opacity-60 cursor-pointer"
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </AntdCommonModal>
  );
};

export default EditRoleModal;
