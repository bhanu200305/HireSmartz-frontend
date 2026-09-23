import React, { useState } from 'react';
import { Select } from 'antd';
import type { TableProps } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import CustomTable from '../shared/ui/table';
import MasterPagination from '../shared/ui/MasterPagination';
import { Badge } from '../shared';
import { Loader } from '../shared/ui/loader';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { useGetJobOpeningsListLegacyQuery as useGetJobOpeningsQuery } from '../../api/job-service/JobOpenings/jobOpenings';
import type { JobSummary } from '../../api/job-service/JobOpenings/types';
import { jobStatus, daysOpen } from './jobOpeningListHelpers';
import JobDetailModal from './JobDetailModal';
import { useJobTitleNameMap } from '../../hooks/useJobTitleNameMap';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

type JobRow = JobSummary & { key: string };

/**
 * The "Active job openings" KPI card's popup — the full, paginated list
 * behind that number, sharing the same per-row detail popup
 * (`JobDetailModal`) as `OpenJobsSection`.
 *
 * Page size is a per-browser preference (`usePersistedPageSize`), not a
 * platform setting.
 *
 * Also doubles as the Hiring Manager's "My open jobs" card's popup —
 * `assignedToMe` scopes to the caller's own tagged-or-created jobs (same
 * flag `GET /job-openings/stats` already takes), and `title` swaps the
 * heading, rather than building a second near-identical modal. A Recruiter
 * caller needs neither: job-service auto-scopes them to their own jobs
 * unconditionally regardless of this flag.
 */
const JobOpeningsListModal: React.FC<{
  onClose: () => void;
  title?: string;
  assignedToMe?: boolean;
}> = ({ onClose, title = 'Active job openings', assignedToMe }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('active_job_openings_modal', 10);
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);

  const { data, isLoading } = useGetJobOpeningsQuery({
    status: 'published',
    page: page + 1,
    page_size: pageSize,
    ...(assignedToMe ? { assigned_to_me: true } : {}),
  });

  const jobs = data?.items ?? [];
  const dataSource: JobRow[] = jobs.map((job) => ({ ...job, key: job.org_job_opening_id }));
  // Job title comes from the org-service catalogue lookup, not the job summary itself.
  const { titleMap } = useJobTitleNameMap();
  const jobTitle = (job: JobRow): string =>
    (job.job_title_id && titleMap[job.job_title_id]) || 'Untitled job';

  const columns: TableProps<JobRow>['columns'] = [
    {
      title: 'Job title',
      dataIndex: 'title',
      key: 'title',
      render: (_: unknown, job: JobRow) => (
        <div>
          <span className="block font-semibold text-primary-600">{jobTitle(job)}</span>
          <span className="text-xs text-neutral-400">{job.job_profile_code}</span>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, job: JobRow) => {
        const status = jobStatus(job);
        return <Badge status={status.badge}>{status.label}</Badge>;
      },
    },
    {
      title: 'Applicants',
      dataIndex: 'total_candidate_count',
      key: 'total_candidate_count',
    },
    {
      title: 'Interviews',
      dataIndex: 'interviewed_count',
      key: 'interviewed_count',
    },
    {
      title: 'Days open',
      key: 'days_open',
      render: (_: unknown, job: JobRow) => daysOpen(job.job_open_date),
    },
  ];

  return (
    <AntdCommonModal open onClose={onClose} title={title} modalProps={{ width: 820 }}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-end gap-2 text-sm text-neutral-500">
          <span>Rows per page</span>
          <Select
            size="small"
            value={pageSize}
            className="w-20"
            options={PAGE_SIZE_OPTIONS.map((size) => ({ label: size, value: size }))}
            onChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
        </div>

        <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {isLoading ? (
            <Loader />
          ) : (
            <CustomTable<JobRow>
              columns={columns}
              dataSource={dataSource}
              onRow={(job) => ({
                onClick: () => setSelectedJob(job),
                className: 'cursor-pointer',
              })}
              enableKeyboardNav
              onRowEnter={(job) => setSelectedJob(job)}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">
                  No active job openings.
                </div>
              }
            />
          )}
        </div>

        <MasterPagination
          current={page + 1}
          pageSize={pageSize}
          total={data?.total ?? 0}
          itemLabel="job openings"
          onPageChange={(nextPage) => setPage(nextPage - 1)}
        />
      </div>

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </AntdCommonModal>
  );
};

export default JobOpeningsListModal;
