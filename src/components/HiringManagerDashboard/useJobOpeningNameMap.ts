import { useMemo } from 'react';
import { useGetJobOpeningsListLegacyQuery } from '../../api/job-service/JobOpenings/jobOpenings';
import { useJobTitleNameMap } from '../../hooks/useJobTitleNameMap';

/**
 * `job_opening_id` -> display name, for the per-job charts and tables on
 * the Hiring Manager dashboard — those candidate-service endpoints only
 * ever return a bare `job_opening_id` (candidate-service never copies
 * job-service's fields, same reasoning as everywhere else in this app), so
 * resolving a name takes two joins: job_opening_id -> job_title_id (this
 * org's job list) -> title (`useJobTitleNameMap`'s catalogue).
 *
 * `GET /job-openings` isn't scoped to "my assigned jobs" for a hiring
 * manager (job-service's `_recruiter_assignment_filter` only narrows a
 * `recruiter` caller) — it's the org-wide catalogue, which is exactly what
 * a name lookup needs. `page_size: 100` is job-service's own list cap; a
 * job opening beyond that page simply falls back to a shortened id below.
 */
export const useJobOpeningNameMap = (): {
  jobNameMap: Record<string, string>;
  isLoading: boolean;
} => {
  const { data: jobsPage, isLoading: isJobsLoading } = useGetJobOpeningsListLegacyQuery({
    page: 1,
    page_size: 100,
  });
  const { titleMap, isLoading: isTitlesLoading } = useJobTitleNameMap();

  const jobNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (jobsPage?.items ?? []).forEach((job) => {
      map[job.org_job_opening_id] =
        (job.job_title_id && titleMap[job.job_title_id]) || job.job_profile_code || 'Untitled job';
    });
    return map;
  }, [jobsPage, titleMap]);

  return { jobNameMap, isLoading: isJobsLoading || isTitlesLoading };
};

/** Falls back to a shortened id when a job isn't in the map (beyond the
 * 100-job page, or still loading) — never a raw, unreadable full UUID. */
export const jobDisplayName = (jobNameMap: Record<string, string>, jobOpeningId: string): string =>
  jobNameMap[jobOpeningId] ?? `Job ${jobOpeningId.slice(0, 8)}`;
