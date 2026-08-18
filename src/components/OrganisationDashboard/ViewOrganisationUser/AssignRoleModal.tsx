import React, { useMemo, useState } from 'react';
import { Select } from 'antd';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import { Button, showToast, PermissionMatrix } from '../../shared';
import { useListRolesQuery } from '../../../api/organization-service/Roles/roles';
import { useListTenantOfficesQuery } from '../../../api/organization-service/Tenants/offices';
import { useAssignRoleMutation } from '../../../api/organization-service/Roles/assignments';
import { useSetAssignmentPermissionOverridesMutation } from '../../../api/organization-service/Roles/assignmentOverrides';
import useEffectivePermissions from '../../../hooks/useEffectivePermissions';
import { getAssignablePermissionCeiling } from '../../../shared/utils/auth/rbac.helpers';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import type { Authorities } from '../../../constants/authorities.constant';

type AssignRoleModalProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  tenantId: string;
  onAssigned: () => void;
};

/**
 * Grant a role to an existing user — the flow that, until now, had no UI
 * anywhere (useAssignRoleMutation existed but had zero callers). Optionally
 * followed by a one-time step to tune that assignment's permissions at the
 * chosen location (PUT .../permission-overrides).
 *
 * WHY THE TUNING STEP ONLY APPEARS HERE, RIGHT AFTER ASSIGNING
 * ---------------------------------------------------------------
 * There is no backend endpoint to list a user's existing assignments (see
 * assignments.ts's own header comment), so `assignment_id` is only ever
 * available in the instant it comes back from `assignRole`. That makes
 * "assign, then immediately tune" the only per-assignment-override flow
 * this frontend can build without new backend work — going back later to
 * adjust an old assignment isn't possible yet.
 */
const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  open,
  onClose,
  userId,
  tenantId,
  onAssigned,
}) => {
  const [step, setStep] = useState<'assign' | 'tune'>('assign');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [granted, setGranted] = useState<Authorities[]>([]);
  const [denied, setDenied] = useState<Authorities[]>([]);

  const { data: roles } = useListRolesQuery({ scope: 'tenant', isMaster: false }, { skip: !open });
  const { data: offices } = useListTenantOfficesQuery({ tenantId }, { skip: !open });
  const [assignRole, { isLoading: isAssigning }] = useAssignRoleMutation();
  const [setOverrides, { isLoading: isSavingOverrides }] =
    useSetAssignmentPermissionOverridesMutation();

  const actingPermissions = useEffectivePermissions();
  const ceiling = useMemo(
    () => getAssignablePermissionCeiling(actingPermissions),
    [actingPermissions]
  );

  const selectedRole = roles?.find((role) => role.role_id === roleId);
  // Only the role's OWN permissions are meaningful to deny here — denying
  // something the role never granted at this location is a no-op. Reusing
  // PermissionMatrix's ceiling prop for this (rather than a plain checkbox
  // list) keeps the same module-grouped layout as everywhere else.
  const denyCeiling = (selectedRole?.permissions ?? []) as Authorities[];

  const reset = () => {
    setStep('assign');
    setRoleId(null);
    setLocationId(null);
    setAssignmentId(null);
    setGranted([]);
    setDenied([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAssign = async () => {
    if (!roleId) return;
    try {
      const result = await assignRole({
        user_id: userId,
        role_id: roleId,
        location_id: locationId,
      }).unwrap();

      if (!locationId) {
        // No location chosen — nothing to tune per-office. Done.
        showToast({ message: `"${result.role_name}" assigned.`, type: 'success' });
        onAssigned();
        handleClose();
        return;
      }

      setAssignmentId(result.assignment_id);
      setStep('tune');
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to assign role.'), type: 'error' });
    }
  };

  const handleSkipTuning = () => {
    showToast({ message: 'Role assigned.', type: 'success' });
    onAssigned();
    handleClose();
  };

  const handleSaveOverrides = async () => {
    if (!assignmentId) return;
    try {
      await setOverrides({
        assignmentId,
        location_id: locationId,
        granted,
        denied,
      }).unwrap();
      showToast({
        message: 'Role assigned and permissions tuned for this location.',
        type: 'success',
      });
      onAssigned();
      handleClose();
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Role assigned, but saving the location override failed.'),
        type: 'error',
      });
    }
  };

  const locationName = offices?.find((office) => office.office_id === locationId)?.city ?? '';

  return (
    <AntdCommonModal
      open={open}
      onClose={handleClose}
      title={step === 'assign' ? 'Assign a role' : `Tune permissions at ${locationName}`}
      subtitle={
        step === 'assign'
          ? 'Grant this person a role, optionally scoped to one office.'
          : 'Optional — grant or withhold specific permissions for this person at this office only. Everyone else with this role, and this person everywhere else, is unaffected.'
      }
      modalProps={{ width: 640 }}
    >
      {step === 'assign' ? (
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="assignRoleSelect" className="text-sm text-gray-600">
              Role
            </label>
            <Select
              id="assignRoleSelect"
              className="w-full mt-1"
              placeholder="Select a role"
              value={roleId ?? undefined}
              onChange={(value) => setRoleId(value)}
              options={(roles ?? []).map((role) => ({ label: role.name, value: role.role_id }))}
            />
          </div>

          <div>
            <label htmlFor="assignLocationSelect" className="text-sm text-gray-600">
              Location <span className="text-gray-400">(optional)</span>
            </label>
            <Select
              id="assignLocationSelect"
              allowClear
              className="w-full mt-1"
              placeholder="Applies everywhere if left blank"
              value={locationId ?? undefined}
              onChange={(value) => setLocationId(value ?? null)}
              options={(offices ?? []).map((office) => ({
                label: office.city,
                value: office.office_id,
              }))}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
            <Button
              className="text-sm font-semibold text-gray-600 border border-gray-200 rounded-full px-5 py-2"
              onClick={handleClose}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              className="text-sm font-semibold text-white bg-primary-600 rounded-full px-5 py-2 disabled:opacity-60"
              onClick={handleAssign}
              disabled={!roleId || isAssigning}
            >
              {isAssigning ? 'Assigning…' : 'Assign role'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <div className="font-semibold text-sm text-gray-900 mb-1">
              Grant extra permissions here
            </div>
            <p className="text-xs text-gray-500 mb-3">
              In addition to what &quot;{selectedRole?.name}&quot; already gives them. You can only
              grant what you hold yourself.
            </p>
            <PermissionMatrix value={granted} onChange={setGranted} ceiling={ceiling} />
          </div>

          <div>
            <div className="font-semibold text-sm text-gray-900 mb-1">
              Withhold permissions here
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Check anything &quot;{selectedRole?.name}&quot; normally grants that this person
              should NOT have at this office.
            </p>
            <PermissionMatrix value={denied} onChange={setDenied} ceiling={denyCeiling} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              className="text-sm font-semibold text-gray-600 border border-gray-200 rounded-full px-5 py-2"
              onClick={handleSkipTuning}
              disabled={isSavingOverrides}
            >
              Skip
            </Button>
            <Button
              className="text-sm font-semibold text-white bg-primary-600 rounded-full px-5 py-2 disabled:opacity-60"
              onClick={handleSaveOverrides}
              disabled={isSavingOverrides || (granted.length === 0 && denied.length === 0)}
            >
              {isSavingOverrides ? 'Saving…' : 'Save overrides'}
            </Button>
          </div>
        </div>
      )}
    </AntdCommonModal>
  );
};

export default AssignRoleModal;
