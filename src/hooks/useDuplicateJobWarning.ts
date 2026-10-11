import { useCheckDuplicateJobQuery } from '../api/job-service/JobOpening/CheckDuplicateJob';
import { officeDisplayName, type TenantOffice } from '../api/organization-service/Tenants/offices';

type Args = {
  jobTitleId?: string;
  offices: TenantOffice[];
  excludeJobId?: string;
};

/** A warning when an open job already has this title at one of the offices, else null. */
export const useDuplicateJobWarning = ({ jobTitleId, offices, excludeJobId }: Args) => {
  const locationIds = offices.map((office) => office.office_id);
  const { data } = useCheckDuplicateJobQuery(
    { jobTitleId: jobTitleId ?? '', locationIds, excludeJobId },
    { skip: !jobTitleId || locationIds.length === 0 }
  );
  const matches = data?.matches ?? [];
  if (!jobTitleId || locationIds.length === 0 || matches.length === 0) return null;
  const labelOf = (officeId: string) => {
    const office = offices.find(
      (o) => o.office_id.toLowerCase() === String(officeId).toLowerCase()
    );
    return office ? officeDisplayName(office) : officeId;
  };
  const jobs = matches
    .map((match) => `${match.job_profile_code} at ${match.location_ids.map(labelOf).join(', ')}`)
    .join('; ');
  return `An open job with this title already exists: ${jobs}.`;
};
