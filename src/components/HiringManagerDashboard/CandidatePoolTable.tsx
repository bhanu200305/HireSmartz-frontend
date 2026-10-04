import React from 'react';
import clsx from 'clsx';
import { Select } from 'antd';
import type { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import { CustomTable, Badge } from '../shared';
import MasterPagination from '../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';
import type { CandidatePoolItem } from '../../api/candidate-service/Stats/stats';
import { jobDisplayName } from './useJobOpeningNameMap';
import { AI_SCORE_MAX } from '../JobsOpening/Candidates/roundPipeline';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';

const formatDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
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
  /** Set by a caller that renders this inside a modal using
   * `AntdCommonModal`'s own `fillHeight` (`PendingDecisionsListModal`) — the
   * filter row, rows-per-page, and pagination footer stay pinned in view and
   * only the table rows scroll, capped to whatever space the modal actually
   * has. The plain inline page usage (`QualifiedCandidatePoolSection`/
   * `PendingDecisionsSection`) leaves this off and keeps letting the page
   * itself grow/scroll around a naturally-sized table, same as before. */
  fillHeight?: boolean;
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
  fillHeight = false,
}) => {
  const jobOptions = Object.entries(jobNameMap).map(([id, name]) => ({ label: name, value: id }));
  // Explicit per-column widths — see CandidatesListModal.tsx's identical
  // comment: `scroll.x: 'max-content'` alone wasn't reliably sizing an
  // 8-column table wider than its container inside a fill-height modal
  // (`PendingDecisionsListModal`), so the right-hand columns just got
  // squeezed/clipped instead of actually triggering the horizontal
  // scrollbar. The plain inline page usage isn't as tight on width, but
  // fixed widths are harmless there too.
  const columns: TableProps<CandidatePoolItem>['columns'] = [
    {
      title: 'Candidate',
      key: 'candidate',
      minWidth: 180,
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
      minWidth: 160,
      render: (_, row) => jobDisplayName(jobNameMap, row.job_opening_id),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      minWidth: 140,
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Resume Score',
      dataIndex: 'resume_score',
      key: 'resume_score',
      minWidth: 130,
      align: 'center',
      render: (value: number | null) => (value != null ? `${value} / ${AI_SCORE_MAX}` : '-'),
    },
    {
      title: 'Interview Score',
      dataIndex: 'interview_score',
      key: 'interview_score',
      minWidth: 140,
      align: 'center',
      render: (value: number | null) => value ?? '-',
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      minWidth: 130,
    },
    {
      title: 'Status',
      key: 'status',
      minWidth: 130,
      render: (_, row) => (
        <Badge status="neutral">{row.status_label ?? row.status_code ?? '-'}</Badge>
      ),
    },
    {
      title: 'Applied Date',
      dataIndex: 'applied_date',
      key: 'applied_date',
      minWidth: 140,
      render: (value: string | null) => formatDate(value),
    },
  ];

  return (
    <div className={clsx('flex flex-col gap-3', fillHeight && 'min-h-0 flex-auto')}>
      <div className="flex shrink-0 items-center justify-end">
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
      <div className="shrink-0">
        <RowsPerPageSelect
          pageSize={pageSize}
          options={PAGE_SIZE_OPTIONS}
          onChange={(size) => onPageChange(1, size)}
        />
      </div>
      <div className={clsx(fillHeight && 'min-h-0 flex-auto overflow-hidden flex')}>
        <CustomTable<CandidatePoolItem>
          columns={columns}
          dataSource={items}
          emptyText={loading ? 'Loading…' : emptyText}
          pagination={false}
          scrollY={fillHeight ? '100%' : undefined}
        />
      </div>
      <div className="shrink-0">
        <MasterPagination
          current={page}
          pageSize={pageSize}
          total={total}
          itemLabel="candidates"
          onPageChange={(nextPage) => onPageChange(nextPage, pageSize)}
        />
      </div>
    </div>
  );
};

export default CandidatePoolTable;
