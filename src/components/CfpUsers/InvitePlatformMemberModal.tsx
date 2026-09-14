import React, { useState } from 'react';
import { Select } from 'antd';
import { FaPlus } from 'react-icons/fa';
import { Button, Input, showToast } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import {
  useInviteSuperAdminMutation,
  useInvitePlatformStaffMutation,
  PlatformDepartment,
} from '../../api/organization-service/Platform/staff';
import { useRolesCatalog } from '../../hooks/useRolesCatalog';
import useEffectivePermissions from '../../hooks/useEffectivePermissions';
import { Authorities } from '../../constants/authorities.constant';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import CreateRoleModal from '../RolesManagement/CreateRoleModal';

type InvitePlatformMemberModalProps = {
  open: boolean;
  departments: PlatformDepartment[];
  onClose: () => void;
  onInvited: () => void;
};

/** §B — POST /platform/super-admins/invitations (email only) and
 * POST /platform/staff/invitations (email, department optional, role).
 * One modal, a type toggle, since both are the same kind of action with a
 * different destination.
 *
 * `role` is still a plain string on the wire (InvitePlatformStaffRequest —
 * no `role_id` field exists, matching how a platform membership's role is
 * stored: `MembershipModel.role` matched by NAME against `master_role.role`
 * for `tenant_id IS NULL`, not a foreign key). What changed is where that
 * string comes from: previously free text with no fixed list ("there's no
 * fixed list of internal roles yet", per docs/frontend_guide.txt — stale as
 * of this session's earlier RBAC work, which gave GET /platform/roles a real
 * catalog). Now it's picked from that same catalog via useRolesCatalog, so a
 * typo can no longer silently mint a membership whose role matches nothing
 * in master_role and therefore grants nothing. "+ Custom Role" covers the
 * case the fixed list doesn't — same CreateRoleModal Roles & Permissions
 * uses, scoped platform (`tenantId` omitted — a platform-owned role belongs
 * to no tenant). */
const InvitePlatformMemberModal: React.FC<InvitePlatformMemberModalProps> = ({
  open,
  departments,
  onClose,
  onInvited,
}) => {
  const [kind, setKind] = useState<'super_admin' | 'staff'>('staff');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  const [inviteSuperAdmin, { isLoading: isInvitingSuperAdmin }] = useInviteSuperAdminMutation();
  const [inviteStaff, { isLoading: isInvitingStaff }] = useInvitePlatformStaffMutation();
  const isLoading = isInvitingSuperAdmin || isInvitingStaff;

  const {
    roles: platformRoles,
    createRole,
    isForbidden: rolesForbidden,
  } = useRolesCatalog({
    scope: 'platform',
    isMaster: true,
  });
  const effectivePermissions = useEffectivePermissions();
  const canCreateRole = effectivePermissions.includes(Authorities.ROLE_CREATE);

  const reset = () => {
    setKind('staff');
    setEmail('');
    setRole('');
    setDepartmentId(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      showToast({ message: 'Email is required.', type: 'error' });
      return;
    }
    if (kind === 'staff' && !role.trim()) {
      showToast({ message: 'Role is required for internal staff.', type: 'error' });
      return;
    }
    try {
      if (kind === 'super_admin') {
        await inviteSuperAdmin({ email: email.trim() }).unwrap();
      } else {
        await inviteStaff({
          email: email.trim(),
          role: role.trim(),
          department_id: departmentId,
        }).unwrap();
      }
      showToast({ message: `Invite sent to ${email.trim()}.`, type: 'success' });
      reset();
      onInvited();
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to send invite.'), type: 'error' });
    }
  };

  return (
    <AntdCommonModal open={open} onClose={handleClose} title="Invite platform member">
      <div className="flex flex-col gap-4">
        <Select
          value={kind}
          onChange={setKind}
          options={[
            { label: 'Internal staff (Sales, Support, Finance, Ops…)', value: 'staff' },
            { label: 'Super Admin / co-founder', value: 'super_admin' },
          ]}
        />
        <Input placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
        {kind === 'staff' && (
          <>
            <Select
              placeholder="Role *"
              value={role || undefined}
              onChange={setRole}
              showSearch
              optionFilterProp="label"
              disabled={rolesForbidden}
              notFoundContent={
                rolesForbidden ? "You don't have permission to view platform roles." : undefined
              }
              options={platformRoles.map((r) => ({ label: r.roleName, value: r.roleName }))}
            />
            {rolesForbidden && (
              <p className="text-xs text-red-500">
                You don&apos;t have permission to view platform roles, so none can be picked here.
                Ask an admin to grant role-read access.
              </p>
            )}
            {canCreateRole && (
              <button
                type="button"
                onClick={() => setCreateRoleOpen(true)}
                className="self-start inline-flex items-center gap-1 text-xs font-semibold text-primary-600 border border-primary-200 rounded-full px-3 py-1.5 hover:bg-primary-50"
              >
                <FaPlus size={9} /> Custom Role
              </button>
            )}
            <Select
              placeholder="Department (optional)"
              value={departmentId}
              onChange={setDepartmentId}
              allowClear
              options={departments.map((d) => ({ label: d.name, value: d.department_id }))}
            />
          </>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Button
            className="w-full border border-gray-300 rounded-full py-2"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="w-full bg-button text-white rounded-full py-2"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Sending…' : 'Send invite'}
          </Button>
        </div>
      </div>

      <CreateRoleModal
        open={createRoleOpen}
        onClose={() => setCreateRoleOpen(false)}
        scope="platform"
        availableLocations={[]}
        roles={platformRoles}
        onCreate={async (payload) => {
          const created = await createRole(payload);
          // Same "select it the moment it's created" behaviour as the
          // tenant-side RoleLocationPicker's own "+ Custom Role" — no second
          // trip back to this dropdown to find and pick what was just made.
          setRole(created.roleName);
          return created;
        }}
      />
    </AntdCommonModal>
  );
};

export default InvitePlatformMemberModal;
