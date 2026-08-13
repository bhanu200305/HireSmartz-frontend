import React, { useState } from 'react';
import { Select } from 'antd';
import { Button, Input, showToast } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import {
  useInviteSuperAdminMutation,
  useInvitePlatformStaffMutation,
  PlatformDepartment,
} from '../../api/organization-service/Platform/staff';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

type InvitePlatformMemberModalProps = {
  open: boolean;
  departments: PlatformDepartment[];
  onClose: () => void;
  onInvited: () => void;
};

/** §B — POST /platform/super-admins/invitations (email only) and
 * POST /platform/staff/invitations (email, department optional, role free
 * text — "there's no fixed list of internal roles yet", per
 * docs/frontend_guide.txt). One modal, a type toggle, since both are the
 * same kind of action with a different destination. */
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

  const [inviteSuperAdmin, { isLoading: isInvitingSuperAdmin }] = useInviteSuperAdminMutation();
  const [inviteStaff, { isLoading: isInvitingStaff }] = useInvitePlatformStaffMutation();
  const isLoading = isInvitingSuperAdmin || isInvitingStaff;

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
            <Input
              placeholder="Role (free text) *"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
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
    </AntdCommonModal>
  );
};

export default InvitePlatformMemberModal;
