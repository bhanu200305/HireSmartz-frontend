import React from 'react';
import type { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import { CustomTable, Badge } from '../shared';
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
  /** Pending decisions' rows hyperlink the candidate name to their profile
   * (for making the decision); the qualified-pool table doesn't. */
  linkToCandidate?: boolean;
  emptyText: string;
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
}) => {
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
    <CustomTable<CandidatePoolItem>
      columns={columns}
      dataSource={items}
      emptyText={loading ? 'Loading…' : emptyText}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
        showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} candidates`,
        onChange: onPageChange,
      }}
    />
  );
};

export default CandidatePoolTable;
