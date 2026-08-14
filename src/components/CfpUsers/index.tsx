import React, { useState } from 'react';
import { MdOutlinePersonAdd, MdDelete, MdOutlineAdd } from 'react-icons/md';
import { HiOutlineUserGroup } from 'react-icons/hi';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import { Badge, BadgeStatus } from '../shared/ui/badge';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import {
  useListPlatformStaffQuery,
  useListPlatformDepartmentsQuery,
  useCreatePlatformDepartmentMutation,
  useOffboardPlatformStaffMutation,
  PlatformStaffMember,
} from '../../api/organization-service/Platform/staff';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import InvitePlatformMemberModal from './InvitePlatformMemberModal';

const STATUS_BADGE: Record<string, BadgeStatus> = {
  active: 'success',
  pending: 'warning',
  offboarded: 'neutral',
};

/**
 * §B — CareerForcePro's own internal team: Super Admins + Sales/Support/
 * Finance/Ops staff, and the departments they belong to. Distinct from a
 * customer's own Users section (OrganisationDashboard) — this is
 * `/v1/platform/staff` + `/v1/platform/departments`, rows with `tenant_id
 * IS NULL`.
 *
 * A section rendered inside the Users page (pages/OrganisationUserPage), not
 * its own routed page — it has no MainLayout/page chrome of its own, the
 * composing page owns that.
 */
const CfpUsers: React.FC = () => {
  const { data: staff, isLoading } = useListPlatformStaffQuery();
  const { data: departments, isLoading: isDepartmentsLoading } = useListPlatformDepartmentsQuery();
  const [createDepartment, { isLoading: isCreatingDepartment }] =
    useCreatePlatformDepartmentMutation();
  const [offboardStaff] = useOffboardPlatformStaffMutation();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [staffToOffboard, setStaffToOffboard] = useState<PlatformStaffMember | null>(null);

  const handleAddDepartment = async () => {
    if (!departmentName.trim()) return;
    try {
      await createDepartment(departmentName.trim()).unwrap();
      showToast({ message: 'Department added.', type: 'success' });
      setDepartmentName('');
      setIsDeptModalOpen(false);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to add department.'), type: 'error' });
    }
  };

  const handleOffboard = async () => {
    if (!staffToOffboard) return;
    try {
      await offboardStaff(staffToOffboard.membership_id).unwrap();
      showToast({ message: 'Staff member offboarded.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to offboard.'), type: 'error' });
    } finally {
      setStaffToOffboard(null);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
            <HiOutlineUserGroup size={18} />
          </span>
          <h2 className="text-xl font-semibold">CFP Users</h2>
        </div>
        <div className="flex gap-3">
          <Button
            className="rounded-full border border-gray-300 px-4 py-1.5 flex items-center gap-1"
            onClick={() => setIsDeptModalOpen(true)}
          >
            <MdOutlineAdd /> Add department
          </Button>
          <Button
            className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1"
            onClick={() => setIsInviteOpen(true)}
          >
            <MdOutlinePersonAdd /> Invite
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden bg-white">
          <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-[#FAFAFA] text-xs font-semibold text-gray-500">
            <span>EMAIL</span>
            <span>ROLE</span>
            <span>DEPARTMENT</span>
            <span>STATUS</span>
            <span className="text-right">ACTIONS</span>
          </div>
          {(staff || []).map((member) => (
            <div
              key={member.membership_id}
              className="grid grid-cols-5 gap-2 px-4 py-3 items-center"
            >
              <span className="text-sm truncate" title={member.email}>
                {member.email}
              </span>
              <span className="text-sm capitalize">{member.role}</span>
              <span className="text-sm">{member.department_name || '-'}</span>
              <span>
                <Badge status={STATUS_BADGE[member.status.toLowerCase()] || 'neutral'}>
                  {member.status}
                </Badge>
              </span>
              <span className="text-right">
                {member.status.toLowerCase() === 'active' && (
                  <button
                    type="button"
                    aria-label="Offboard"
                    className="p-2 hover:bg-gray-100 rounded-full"
                    onClick={() => setStaffToOffboard(member)}
                  >
                    <MdDelete className="text-red-500" />
                  </button>
                )}
              </span>
            </div>
          ))}
          {!staff?.length && (
            <div className="p-8 text-center text-gray-400 text-sm">No staff yet.</div>
          )}
        </div>
      )}

      <Typography variant="subtitle1" className="mt-8 mb-2 block">
        Departments
      </Typography>
      {isDepartmentsLoading ? (
        <Loader />
      ) : (
        <div className="flex flex-wrap gap-2">
          {(departments || []).map((dept) => (
            <span key={dept.department_id} className="text-xs bg-gray-100 rounded-full px-3 py-1.5">
              {dept.name}
            </span>
          ))}
          {!departments?.length && (
            <Typography variant="caption">No internal departments yet.</Typography>
          )}
        </div>
      )}

      <InvitePlatformMemberModal
        open={isInviteOpen}
        departments={departments || []}
        onClose={() => setIsInviteOpen(false)}
        onInvited={() => setIsInviteOpen(false)}
      />

      <AntdCommonModal
        open={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add internal department"
      >
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Department name *"
            value={departmentName}
            onChange={(e) => setDepartmentName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full border border-gray-300 rounded-full py-2"
              onClick={() => setIsDeptModalOpen(false)}
              disabled={isCreatingDepartment}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-button text-white rounded-full py-2"
              onClick={handleAddDepartment}
              disabled={isCreatingDepartment}
            >
              {isCreatingDepartment ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      {staffToOffboard && (
        <ConfirmationModal
          title={`Offboard ${staffToOffboard.email}? This revokes their sessions immediately.`}
          confirmText="OFFBOARD"
          onConfirm={handleOffboard}
          onClose={() => setStaffToOffboard(null)}
        />
      )}
    </div>
  );
};

export default CfpUsers;
