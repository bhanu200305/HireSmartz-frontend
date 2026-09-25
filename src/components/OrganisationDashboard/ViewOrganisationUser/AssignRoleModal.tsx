import React, { useState } from 'react';
import { Select } from 'antd';
import { MdClose } from 'react-icons/md';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import { Button, showToast } from '../../shared';
import { useListRolesQuery } from '../../../api/organization-service/Roles/roles';
import { useListTenantOfficesQuery } from '../../../api/organization-service/Tenants/offices';
import {
  useAssignRoleMutation,
  useListUserRoleAssignmentsQuery,
  useRevokeRoleMutation,
} from '../../../api/organization-service/Roles/assignments';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';

type AssignRoleModalProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  tenantId: string;
  onAssigned: () => void;
};

/**
 * Grant a role to an existing user, optionally scoped to one office.
 *
 * Deliberately one step. An earlier version offered a second "tune
 * permissions for just this person at this office" screen right after
 * assigning — that was the wrong default: a role's per-location permissions
 * are already configured once, in Roles & Permissions, for everyone who
 * holds it. Re-asking here, per assignment, duplicated that configuration
 * and made it look like something new had to be decided every time a role
 * was granted. If a genuine one-off exception for one person is ever needed,
 * that belongs as its own explicit action from the assignment itself, not a
 * step every assignment passes through.
 */
const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  open,
  onClose,
  userId,
  tenantId,
  onAssigned,
}) => {
  const [roleId, setRoleId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const { data: roles } = useListRolesQuery({ scope: 'tenant', isMaster: false }, { skip: !open });
  const { data: offices } = useListTenantOfficesQuery({ tenantId }, { skip: !open });
  const { data: currentAssignments } = useListUserRoleAssignmentsQuery({ userId }, { skip: !open });
  const [assignRole, { isLoading: isAssigning }] = useAssignRoleMutation();
  const [revokeRole, { isLoading: isRevoking }] = useRevokeRoleMutation();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const roleName = (id: string) => roles?.find((r) => r.role_id === id)?.name ?? id;
  const locationLabel = (id: string | null) => {
    if (!id) return 'Everywhere';
    const office = offices?.find((o) => o.office_id === id);
    return office ? `${office.city}, ${office.address_line_1}` : id;
  };

  const handleRevoke = async (assignmentId: string) => {
    setRevokingId(assignmentId);
    try {
      await revokeRole({ assignmentId, userId }).unwrap();
      showToast({ message: 'Role removed.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to remove role.'), type: 'error' });
    } finally {
      setRevokingId(null);
    }
  };

  const reset = () => {
    setRoleId(null);
    setLocationId(null);
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
      showToast({ message: `"${result.role_name}" assigned.`, type: 'success' });
      onAssigned();
      handleClose();
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to assign role.'), type: 'error' });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={handleClose}
      title="Assign a role"
      subtitle="Grant this person a role, optionally scoped to one office."
      modalProps={{ width: 640 }}
    >
      <div className="flex flex-col gap-4">
        {!!currentAssignments?.length && (
          <div>
            <p className="text-sm text-gray-600 mb-1.5">Current role(s)</p>
            <div className="flex flex-col gap-1.5">
              {currentAssignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  className="flex items-center justify-between gap-2 rounded-full bg-gray-100 pl-3 pr-1.5 py-1 text-sm text-gray-700"
                >
                  <span>
                    {roleName(assignment.role_id)}
                    <span className="text-gray-400">
                      {' '}
                      · {locationLabel(assignment.location_id)}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${roleName(assignment.role_id)}`}
                    disabled={isRevoking}
                    onClick={() => handleRevoke(assignment.assignment_id)}
                    className="p-0.5 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {revokingId === assignment.assignment_id ? (
                      <span className="block h-3.5 w-3.5 animate-pulse rounded-full bg-gray-400" />
                    ) : (
                      <MdClose size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="assignRoleSelect" className="text-sm text-gray-600">
            {currentAssignments?.length ? 'Assign another role' : 'Role'}
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
              // City alone isn't unique — two offices in the same city read
              // identically otherwise.
              label: `${office.city}, ${office.address_line_1}`,
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
    </AntdCommonModal>
  );
};

export default AssignRoleModal;
