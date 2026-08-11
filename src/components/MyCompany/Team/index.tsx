import { useState, type ReactNode } from 'react';
import { MdOutlinePersonAdd, MdOutlineUploadFile } from 'react-icons/md';
import { useGetDepartmentsByCompanyIdQuery } from '../../../api/tenant-service/Company/addCompany';
import InviteTeamMemberModal from './InviteTeamMemberModal';
import BulkImport from './BulkImport';

type TeamTabProps = {
  companyId: string;
  onTeamInviteRecorded: () => void;
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

const TeamTab = ({ companyId, onTeamInviteRecorded }: TeamTabProps) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { data: departmentsData } = useGetDepartmentsByCompanyIdQuery(
    { companyId: Number(companyId) },
    { skip: !companyId || Number.isNaN(Number(companyId)) }
  );
  const departments = (departmentsData || [])
    .filter((department) => department.status !== false)
    .map((department) => ({ id: department.id, name: department.name }));

  return (
    <div className="px-2 sm:px-6 py-2 sm:py-4">
      <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Team</h2>
      <p className="text-sm text-gray-500 mb-4">
        Invite Recruiters and Hiring Managers, one at a time or in bulk.
      </p>

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

      {departments.length === 0 && (
        <p className="text-xs text-gray-400 mt-4">
          Create a department first (under the &quot;Company Settings&quot; tab) before inviting
          your team.
        </p>
      )}

      <InviteTeamMemberModal
        open={isInviteModalOpen}
        tenantId={companyId}
        departments={departments}
        onClose={() => setIsInviteModalOpen(false)}
        onInvited={() => {
          setIsInviteModalOpen(false);
          onTeamInviteRecorded();
        }}
      />

      <BulkImport
        open={isImportModalOpen}
        tenantId={companyId}
        onClose={() => setIsImportModalOpen(false)}
        onCompleted={onTeamInviteRecorded}
      />
    </div>
  );
};

export default TeamTab;
