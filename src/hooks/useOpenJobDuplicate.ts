import { useCheckDuplicateJobQuery } from '../api/job-service/JobOpening/CheckDuplicateJob';
import { officeDisplayName, type TenantOffice } from '../api/organization-service/Tenants/offices';

type Args = {
  jobTitleId?: string;
  departmentId?: string | number;
  offices: TenantOffice[];
  /** The job being created or edited, so it never clashes with itself. */
  excludeJobId?: string;
};

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * The message when an open job with this title and department is already at one of the
 * offices (saving is refused), else null. Needs a title, a department and an office.
 */
export const useOpenJobDuplicate = ({ jobTitleId, departmentId, offices, excludeJobId }: Args) => {
  const department = departmentId != null ? String(departmentId) : '';
  const locationIds = offices.map((office) => office.office_id);
  const ready = !!jobTitleId && isUuid(department) && locationIds.length > 0;
  const { data } = useCheckDuplicateJobQuery(
    { jobTitleId: jobTitleId ?? '', departmentId: department, locationIds, excludeJobId },
    { skip: !ready }
  );
  const matches = data?.matches ?? [];
  if (!ready || matches.length === 0) return null;
  const labelOf = (officeId: string) => {
    const office = offices.find(
      (o) => o.office_id.toLowerCase() === String(officeId).toLowerCase()
    );
    return office ? officeDisplayName(office) : officeId;
  };
  const jobs = matches
    .map((match) => `${match.job_profile_code} at ${match.location_ids.map(labelOf).join(', ')}`)
    .join('; ');
  return `An open job with this title and department already exists: ${jobs}. Choose a different location, title or department.`;
};
