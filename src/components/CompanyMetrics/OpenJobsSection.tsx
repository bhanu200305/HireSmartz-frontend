import React, { useState } from 'react';
import { MdOutlineWorkOutline } from 'react-icons/md';
import { Badge, Search } from '../shared';
import { Loader } from '../shared/ui/loader';
import { SortCaretIcon } from '../shared/ui/SortCaretIcon';
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
  // The only column job-service can actually sort by that this table also
  // shows — see JobOpeningsListModal's own comment on `daysOpenSortDir`;
  // "Days open" is derived FROM job_open_date, so sorting by that (inverted
  // — an older open date means MORE days open) is the one honest
  // server-side sort available here.
  const [daysOpenSortDir, setDaysOpenSortDir] = useState<'asc' | 'desc' | null>(null);
  const { data, isLoading } = useGetJobOpeningsQuery({
    page: 1,
    page_size: 10,
    status,
    text: search || undefined,
    ...(daysOpenSortDir
      ? { sort_by: 'job_open_date', sort_dir: daysOpenSortDir === 'asc' ? 'desc' : 'asc' }
      : {}),
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

  // Toggles ascending/descending forever once a first click sets it — no
  // 3rd "cancel back to unsorted" step, matching CustomTable's own
  // `sortDirections` (table.tsx) and COL's `handleSort` (Columns.tsx), so
  // every sortable list in the app behaves the same way.
  const toggleDaysOpenSort = () => setDaysOpenSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <MdOutlineWorkOutline />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-neutral-900">Job Openings</h3>
            <p className="text-xs text-neutral-400">
              Click a job opening to see its candidate pipeline
            </p>
          </div>
        </div>
        <Search
          appname="open jobs section"
          placeholder="Search Job Openings..."
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
                <th className="pb-2 text-xs font-semibold tracking-wide">Job Title</th>
                <th className="pb-2 text-xs font-semibold tracking-wide">Status</th>
                <th className="pb-2 text-xs font-semibold tracking-wide">Applicants</th>
                <th className="pb-2 text-xs font-semibold tracking-wide">Interviews</th>
                <th
                  className="cursor-pointer select-none pb-2 text-xs font-semibold tracking-wide hover:text-neutral-600"
                  onClick={toggleDaysOpenSort}
                >
                  <span className="inline-flex items-center">
                    Days Open
                    <SortCaretIcon direction={daysOpenSortDir} />
                  </span>
                </th>
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
          className="group flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary-700 cursor-pointer"
        >
          View All
          <span className="text-accent-400 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
      </div>

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
      {isViewAllOpen && (
        <JobOpeningsListModal title="Job Openings" onClose={() => setIsViewAllOpen(false)} />
      )}
    </div>
  );
};

export default OpenJobsSection;
