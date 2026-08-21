import { useState, type ReactNode } from 'react';
import { MdOutlinePersonAdd, MdOutlineUploadFile } from 'react-icons/md';
import { useListTenantDepartmentsQuery } from '../../../api/organization-service/Tenants/departments';
import InviteTeamMemberModal from './InviteTeamMemberModal';
import BulkImport from './BulkImport';
import TeamInvitationsList from './TeamInvitationsList';
import useHasAccess from '../../../hooks/useHasAccess';
import { Authorities } from '../../../constants/authorities.constant';

type TeamTabProps = {
  tenantId: string;
};

const ActionCard = ({
  icon,
  title,
  description,
  cta,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-1 flex-col items-start gap-2 rounded-2xl border border-[var(--border)] bg-white p-5 text-left transition-shadow hover:shadow-md cursor-pointer"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xl">
      {icon}
    </div>
    <p className="font-semibold text-gray-900">{title}</p>
    <p className="text-sm text-gray-500">{description}</p>
    <span className="mt-1 text-sm font-medium text-brand-600">{cta} →</span>
  </button>
);

/** §D — invite one at a time (POST .../users/invitations) or in bulk (the
 * 3-step roster flow), plus the invitations list every status feeds. */
const TeamTab = ({ tenantId }: TeamTabProps) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const canInvite = useHasAccess(Authorities.INVITATION_SEND);

  const { data: departmentsData } = useListTenantDepartmentsQuery(tenantId, { skip: !tenantId });
  const departments = (departmentsData || []).map((department) => ({
    id: department.org_department_id,
    name: department.name,
  }));

  return (
    <div className="px-2 sm:px-6 py-2 sm:py-4">
      <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Team</h2>
      <p className="text-sm text-gray-500 mb-4">
        Invite Recruiters and Hiring Managers, one at a time or in bulk.
      </p>

      {canInvite && (
        <div className="flex flex-col sm:flex-row gap-4">
          <ActionCard
            icon={<MdOutlinePersonAdd />}
            title="Invite Team Member"
            description="Send a single invite to a Recruiter or Hiring Manager."
            cta="Invite"
            onClick={() => setIsInviteModalOpen(true)}
          />
          <ActionCard
            icon={<MdOutlineUploadFile />}
            title="Import Team"
            description="Upload a spreadsheet to invite your whole team at once."
            cta="Import"
            onClick={() => setIsImportModalOpen(true)}
          />
        </div>
      )}

      {canInvite && departments.length === 0 && (
        <p className="text-xs text-gray-400 mt-4">
          Departments are optional for an invite, but creating one first (under the
          &quot;Departments&quot; tab) makes assigning people easier later.
        </p>
      )}

      <TeamInvitationsList tenantId={tenantId} />

      <InviteTeamMemberModal
        open={isInviteModalOpen}
        tenantId={tenantId}
        departments={departments}
        onClose={() => setIsInviteModalOpen(false)}
        onInvited={() => setIsInviteModalOpen(false)}
      />

      <BulkImport
        open={isImportModalOpen}
        tenantId={tenantId}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default TeamTab;
