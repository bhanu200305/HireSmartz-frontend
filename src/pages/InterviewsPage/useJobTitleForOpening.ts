import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { useGetJobOpeningsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import { useJobTitleNameMap } from '../../hooks/useJobTitleNameMap';
import { RootState } from '../../redux/provider/store';

/**
 * `job_opening_id` -> display title, best-effort from the recruiter's own job
 * list (job-service returns only ids; the title catalogue lives in
 * organization-service — see `useJobTitleNameMap`). Returns `''` when the
 * opening isn't in the caller's visible list so each call site can pick its
 * own fallback rather than showing a raw id.
 *
 * `GET /job-openings` is tenant-scoped and rejects a platform caller
 * (Super Admin/CFP staff) outright - this hook is used from GlobalSearch's
 * candidate results, reachable by a platform caller too, so it must skip
 * the query entirely rather than firing a request that always 403s.
 */
export const useJobTitleForOpening = (): ((jobId: string) => string) => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const { data } = useGetJobOpeningsQuery({ isAll: true, size: 100 }, { skip: !tenantId });
  const { titleMap } = useJobTitleNameMap();

  const openingMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of data?.data ?? []) {
      const id = String(row.jobOpeningId);
      map[id] = titleMap[String(row.jobTitleId)] || row.jobProfileCode || '';
    }
    return map;
  }, [data, titleMap]);

  return (jobId: string) => openingMap[String(jobId)] || '';
};
