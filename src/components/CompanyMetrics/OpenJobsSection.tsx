import React, { useState } from 'react';
import { MdOutlineWorkOutline } from 'react-icons/md';
import { Badge } from '../shared';
import { Loader } from '../shared/ui/loader';
import { useGetJobOpeningsListLegacyQuery as useGetJobOpeningsQuery } from '../../api/job-service/JobOpenings/jobOpenings';
import type { JobSummary } from '../../api/job-service/JobOpenings/types';
import { jobStatus, daysOpen } from './jobOpeningListHelpers';
import JobDetailModal from './JobDetailModal';
import { useJobTitleNameMap } from '../../hooks/useJobTitleNameMap';

/**
 * 2.4 "Open jobs" — a real jobs list (job-service's own UUID-based
 * `GET /job-openings`, not the legacy numeric-ID list the "Job Openings"
 * nav page still runs on — see the two systems' write-up), with a per-job
 * KPI popup. Kept as its own section here rather than added to the
 * existing Job Openings page: that page's rows carry a different ID space
 * with no mapping to job-service's real jobs, so a KPI popup attached to
 * it couldn't query real data for the job actually clicked.
 *
 * `jobStatus`/`daysOpen` and `JobDetailModal` live in their own files now
 * (`jobOpeningListHelpers.ts`, `JobDetailModal.tsx`) so the "Active job
 * openings" KPI card's own popup (`JobOpeningsListModal`) can reuse the
 * exact same status/age reading and the exact same per-job detail, instead
 * of a second copy of both quietly drifting from this one.
 */
const OpenJobsSection: React.FC = () => {
  const { data, isLoading } = useGetJobOpeningsQuery({ page: 1, page_size: 10 });
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);
  const jobs = data?.items ?? [];
  // `job.title` doesn't exist on the current backend contract (job-service
  // only ever returns job_title_id — see JobSummaryView's docstring) — the
  // real name comes from this org-service catalogue lookup instead.
  const { titleMap } = useJobTitleNameMap();
  const jobTitle = (job: JobSummary): string =>
    (job.job_title_id && titleMap[job.job_title_id]) || 'Untitled job';

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <MdOutlineWorkOutline />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-neutral-900">Open jobs</h3>
          <p className="text-xs text-neutral-400">Click a job to see its candidate pipeline</p>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-neutral-400">
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Job title</th>
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Applicants</th>
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Interviews</th>
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Days open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {jobs.map((job) => {
              const status = jobStatus(job);
              return (
                <tr key={job.org_job_opening_id}>
                  <td className="py-2">
                    <button
                      type="button"
                      className="block font-semibold text-primary transition-colors hover:text-primary-700"
                      onClick={() => setSelectedJob(job)}
                    >
                      {jobTitle(job)}
                    </button>
                    <span className="text-xs text-neutral-400">{job.job_profile_code}</span>
                  </td>
                  <td className="py-2">
                    <Badge status={status.badge}>{status.label}</Badge>
                  </td>
                  <td className="py-2 text-neutral-600">{job.candidate_count}</td>
                  <td className="py-2 text-neutral-600">{job.interviewed_count}</td>
                  <td className="py-2 text-neutral-600">{daysOpen(job.job_open_date)}</td>
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neutral-400">
                  No open jobs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
};

export default OpenJobsSection;
