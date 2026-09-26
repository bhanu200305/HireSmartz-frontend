import React, { useState } from 'react';
import { MdOutlineWorkOutline } from 'react-icons/md';
import { Badge, Search } from '../shared';
import { Loader } from '../shared/ui/loader';
import { useGetJobOpeningsListLegacyQuery as useGetJobOpeningsQuery } from '../../api/job-service/JobOpenings/jobOpenings';
import type { JobListArgs, JobSummary } from '../../api/job-service/JobOpenings/types';
import { jobStatus, daysOpen } from './jobOpeningListHelpers';
import JobDetailModal from './JobDetailModal';
import JobOpeningsListModal from './JobOpeningsListModal';
import { useJobTitleNameMap } from '../../hooks/useJobTitleNameMap';

type OpenJobsSectionProps = {
  /** Narrows the list to one status — e.g. `'published'` for the Recruiter
   * KPI dashboard's "Open jobs list" (`GET /job-openings?status=published`).
   * Omitted (default) keeps this section's original org-wide/all-status
   * behavior on the Company Metrics page. */
  status?: JobListArgs['status'];
};

/**
 * "Open jobs" — a jobs list with a per-job KPI popup.
 *
 * `jobStatus`/`daysOpen` and `JobDetailModal` live in their own files so
 * `JobOpeningsListModal` can reuse the same status/age reading and the same
 * per-job detail, instead of a second copy drifting from this one.
 */
const OpenJobsSection: React.FC<OpenJobsSectionProps> = ({ status }) => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetJobOpeningsQuery({
    page: 1,
    page_size: 10,
    status,
    text: search || undefined,
  });
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);
  // Always just the first page of up to 10 — "View all" (below) is the
  // escape hatch to the full paginated/searchable/sortable list
  // (`JobOpeningsListModal`) rather than this preview table growing its own
  // pager to match.
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const jobs = data?.items ?? [];
  // Job title comes from the org-service catalogue lookup, not the job summary itself.
  const { titleMap } = useJobTitleNameMap();
  const jobTitle = (job: JobSummary): string =>
    (job.job_title_id && titleMap[job.job_title_id]) || 'Untitled job';

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <MdOutlineWorkOutline />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-neutral-900">Open jobs</h3>
            <p className="text-xs text-neutral-400">Click a job to see its candidate pipeline</p>
          </div>
        </div>
        <Search
          appname="open jobs section"
          placeholder="Search jobs..."
          value={search}
          allowClear
          onSearch={setSearch}
        />
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[480px] w-full text-left text-sm">
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
                        className="block font-semibold text-primary transition-colors hover:text-primary-700 cursor-pointer"
                        onClick={() => setSelectedJob(job)}
                      >
                        {jobTitle(job)}
                      </button>
                      <span className="text-xs text-neutral-400">{job.job_profile_code}</span>
                    </td>
                    <td className="py-2">
                      <Badge status={status.badge}>{status.label}</Badge>
                    </td>
                    <td className="py-2 text-neutral-600">{job.total_candidate_count}</td>
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
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setIsViewAllOpen(true)}
          className="group flex items-center gap-1 text-xs font-semibold tracking-wide text-primary uppercase transition-colors hover:text-primary-700 cursor-pointer"
        >
          View all
          <span className="text-accent-400 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
      </div>

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
      {isViewAllOpen && (
        <JobOpeningsListModal title="Open jobs" onClose={() => setIsViewAllOpen(false)} />
      )}
    </div>
  );
};

export default OpenJobsSection;
