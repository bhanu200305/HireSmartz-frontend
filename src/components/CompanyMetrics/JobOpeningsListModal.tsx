import React, { useState } from 'react';
import { Select } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import type { TableProps } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import CustomTable from '../shared/ui/table';
import MasterPagination from '../shared/ui/MasterPagination';
import { Badge, Search } from '../shared';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { Loader } from '../shared/ui/loader';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { useGetJobOpeningsListLegacyQuery as useGetJobOpeningsQuery } from '../../api/job-service/JobOpenings/jobOpenings';
import type { JobSummary, JobStatusFilter } from '../../api/job-service/JobOpenings/types';
import { jobStatus, daysOpen } from './jobOpeningListHelpers';
import JobDetailModal from './JobDetailModal';
import { useJobTitleNameMap } from '../../hooks/useJobTitleNameMap';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';

const STATUS_FILTER_OPTIONS: { label: string; value: JobStatusFilter | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Closed', value: 'closed' },
];

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
  const [pageSize, setPageSize] = usePersistedPageSize('active_job_openings_modal', 10, 100);
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter | 'all'>('published');
  // The only column this endpoint can actually sort by that this table also
  // shows — job-service's `sort_by` is a closed enum (job_open_date /
  // created_at / vacancies / job_profile_code, see JobSortField backend-
  // side), so "Job title"/"Applicants"/"Interviews" have no real sort to
  // wire up. "Days open" is derived FROM job_open_date, so sorting by that
  // (inverted — an older open date means MORE days open) is the one honest
  // server-side sort available here.
  const [daysOpenSortDir, setDaysOpenSortDir] = useState<'asc' | 'desc' | null>(null);

  const { data, isLoading } = useGetJobOpeningsQuery({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    text: search || undefined,
    page: page + 1,
    page_size: pageSize,
    ...(assignedToMe ? { assigned_to_me: true } : {}),
    ...(daysOpenSortDir
      ? { sort_by: 'job_open_date', sort_dir: daysOpenSortDir === 'asc' ? 'desc' : 'asc' }
      : {}),
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
      sorter: true,
      sortOrder:
        daysOpenSortDir === 'asc' ? 'ascend' : daysOpenSortDir === 'desc' ? 'descend' : undefined,
      render: (_: unknown, job: JobRow) => daysOpen(job.job_open_date),
    },
  ];

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title={title}
      modalProps={{ width: 820, maskClosable: true }}
      fillHeight
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Search
              appname="job openings modal"
              placeholder="Search jobs..."
              value={search}
              allowClear
              onSearch={(value) => {
                setSearch(value);
                setPage(0);
              }}
            />
            <div className="cfp-dropdown-trigger w-40">
              <FilterSelectIcon />
              <Select
                placeholder="Status"
                className="w-full custom-select"
                variant="borderless"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(0);
                }}
                options={STATUS_FILTER_OPTIONS}
              />
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <RowsPerPageSelect
            pageSize={pageSize}
            options={PAGE_SIZE_OPTIONS}
            onChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
        </div>

        <div className="w-full min-h-0 flex-1 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {isLoading ? (
            <Loader />
          ) : (
            <CustomTable<JobRow>
              columns={columns}
              dataSource={dataSource}
              scrollY="100%"
              onRow={(job) => ({
                onClick: () => setSelectedJob(job),
                className: 'cursor-pointer',
              })}
              onChange={(_pagination, _tableFilters, sorter) => {
                const active = Array.isArray(sorter) ? sorter[0] : sorter;
                const resolved = active as SorterResult<JobRow>;
                setDaysOpenSortDir(
                  resolved?.columnKey === 'days_open' && resolved.order
                    ? resolved.order === 'ascend'
                      ? 'asc'
                      : 'desc'
                    : null
                );
              }}
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

        <div className="shrink-0">
          <MasterPagination
            current={page + 1}
            pageSize={pageSize}
            total={data?.total ?? 0}
            itemLabel="job openings"
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </div>
      </div>

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </AntdCommonModal>
  );
};

export default JobOpeningsListModal;
