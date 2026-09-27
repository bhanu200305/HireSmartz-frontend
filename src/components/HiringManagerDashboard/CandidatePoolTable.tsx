import React from 'react';
import { Select } from 'antd';
import type { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import { CustomTable, Badge } from '../shared';
import MasterPagination from '../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';
import type { CandidatePoolItem } from '../../api/candidate-service/Stats/stats';
import { jobDisplayName } from './useJobOpeningNameMap';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';

const formatDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '-';

const candidateName = (row: CandidatePoolItem): string =>
  [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unnamed candidate';

type CandidatePoolTableProps = {
  items: CandidatePoolItem[];
  jobNameMap: Record<string, string>;
  loading?: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  /** Hyperlinks the candidate name through to their own pipeline/detail
   * page — every call site of this shared table passes this on, so a
   * clicked candidate always opens their record rather than sitting inert. */
  linkToCandidate?: boolean;
  emptyText: string;
  /** `jobOpeningId` server-side filter (`CandidateStatsParams`, forwarded by
   * both the qualified-pool and pending-decisions endpoints) — the caller
   * owns the actual query param since the query itself lives there; this
   * component just renders the dropdown (it already has `jobNameMap`) and
   * reports the choice back up. */
  jobOpeningId?: string;
  onJobOpeningIdChange: (jobOpeningId: string | undefined) => void;
};

/**
 * Shared table body for "Qualified candidate pool" and "Pending decisions"
 * — same columns (Candidate / Job / Location / Resume score / Interview
 * score / Stage / Status / Applied date) for both, per the KPI-addition
 * spec; only the hyperlink differs, so one component takes a flag rather
 * than two near-identical copies drifting apart.
 */
const CandidatePoolTable: React.FC<CandidatePoolTableProps> = ({
  items,
  jobNameMap,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  linkToCandidate,
  emptyText,
  jobOpeningId,
  onJobOpeningIdChange,
}) => {
  const jobOptions = Object.entries(jobNameMap).map(([id, name]) => ({ label: name, value: id }));
  const columns: TableProps<CandidatePoolItem>['columns'] = [
    {
      title: 'Candidate',
      key: 'candidate',
      render: (_, row) =>
        linkToCandidate ? (
          <Link
            to={`/jobs/view/${row.job_opening_id}/candidates/${row.candidate_id}/details`}
            className="font-semibold text-primary transition-colors hover:text-primary-700"
          >
            {candidateName(row)}
          </Link>
        ) : (
          <span className="font-medium text-neutral-800">{candidateName(row)}</span>
        ),
    },
    {
      title: 'Job',
      key: 'job',
      render: (_, row) => jobDisplayName(jobNameMap, row.job_opening_id),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Resume score',
      dataIndex: 'resume_score',
      key: 'resume_score',
      align: 'center',
      render: (value: number | null) => value ?? '-',
    },
    {
      title: 'Interview score',
      dataIndex: 'interview_score',
      key: 'interview_score',
      align: 'center',
      render: (value: number | null) => value ?? '-',
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, row) => (
        <Badge status="neutral">{row.status_label ?? row.status_code ?? '-'}</Badge>
      ),
    },
    {
      title: 'Applied date',
      dataIndex: 'applied_date',
      key: 'applied_date',
      render: (value: string | null) => formatDate(value),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <div className="cfp-dropdown-trigger w-56">
          <FilterSelectIcon />
          <Select
            placeholder="Job"
            allowClear
            showSearch
            optionFilterProp="label"
            className="w-full custom-select"
            variant="borderless"
            value={jobOpeningId}
            onChange={(value) => onJobOpeningIdChange(value)}
            options={jobOptions}
            popupMatchSelectWidth={false}
          />
        </div>
      </div>
      <RowsPerPageSelect
        pageSize={pageSize}
        options={PAGE_SIZE_OPTIONS}
        onChange={(size) => onPageChange(1, size)}
      />
      <CustomTable<CandidatePoolItem>
        columns={columns}
        dataSource={items}
        emptyText={loading ? 'Loading…' : emptyText}
        pagination={false}
      />
      <MasterPagination
        current={page}
        pageSize={pageSize}
        total={total}
        itemLabel="candidates"
        onPageChange={(nextPage) => onPageChange(nextPage, pageSize)}
      />
    </div>
  );
};

export default CandidatePoolTable;
