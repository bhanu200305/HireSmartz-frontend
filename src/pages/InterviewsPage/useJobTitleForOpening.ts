import { useMemo } from 'react';

import { useGetJobOpeningsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import { useJobTitleNameMap } from '../../hooks/useJobTitleNameMap';

/**
 * `job_opening_id` -> display title, best-effort from the recruiter's own job
 * list (job-service returns only ids; the title catalogue lives in
 * organization-service — see `useJobTitleNameMap`). Returns `''` when the
 * opening isn't in the caller's visible list so each call site can pick its
 * own fallback rather than showing a raw id.
 */
export const useJobTitleForOpening = (): ((jobId: string) => string) => {
  const { data } = useGetJobOpeningsQuery({ isAll: true, size: 100 });
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
