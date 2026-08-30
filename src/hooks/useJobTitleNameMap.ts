import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/provider/store';
import { useSessionTenantId } from './useSessionTenantId';
import { useListTenantJobTitlesQuery } from '../api/organization-service/Tenants/jobTitles';

/**
 * `org_job_title_id` -> display name.
 *
 * job-service's job listing/summary endpoints only ever return
 * `job_title_id` — the title catalogue lives in organization-service, not
 * job-service, so job-service deliberately never resolves it to a name (see
 * `JobSummaryView`'s docstring on the backend: "those catalogues live
 * outside job-service"). Anything that lists jobs needs this same id->name
 * join to show an actual title instead of falling back to a placeholder
 * (the job's profile code, or "Untitled job", depending on the call site) —
 * shared here so every listing resolves it the same way instead of each
 * screen growing its own copy (or, worse, silently skipping it).
 */
export const useJobTitleNameMap = (): {
  titleMap: Record<string, string>;
  isLoading: boolean;
} => {
  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const tenantId = useSessionTenantId();
  const { data: jobTitles = [], isLoading } = useListTenantJobTitlesQuery(
    { tenantId: tenantId ?? '', isMaster: callerKind === 'platform' },
    { skip: !tenantId }
  );

  const titleMap = useMemo(
    () => Object.fromEntries(jobTitles.map((title) => [title.org_job_title_id, title.name])),
    [jobTitles]
  );

  return { titleMap, isLoading };
};
