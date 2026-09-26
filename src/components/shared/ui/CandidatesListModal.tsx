import React, { useState } from 'react';
import { Select } from 'antd';
import type { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import AntdCommonModal from './AntdCommonModal';
import CustomTable from './table';
import MasterPagination from './MasterPagination';
import { Badge } from './badge';
import { Loader } from './loader';
import { usePersistedPageSize } from '../../../hooks/usePersistedPageSize';
import {
  useListCandidatesQuery,
  type CandidateView,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import {
  useJobOpeningNameMap,
  jobDisplayName,
} from '../../HiringManagerDashboard/useJobOpeningNameMap';
import { PAGE_SIZE_OPTIONS } from '../../../constants/app.constants';

type CandidateRow = CandidateView & { key: string };

const candidateName = (row: CandidateRow): string =>
  [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unnamed candidate';

const formatDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '-';

/**
 * The "Total applications" KPI card's popup — Company Admin's and
 * Recruiter's dashboards both use this for the same card (org-wide either
 * way: `GET /candidates` has no role-based auto-scoping, and neither does
 * the `total-applications` count it's the popup for — a recruiter's own
 * total-applications number is already org-wide server-side, same as a
 * company admin's, so there is nothing to scope here to match).
 *
 * Same list-modal shape as `JobOpeningsListModal`/`PlatformTenantsListModal`
 * — paginated in place, row click drills into the same candidate detail
 * page every other candidate link in this app already uses.
 */
const CandidatesListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('total_applications_modal', 10);

  const { data, isLoading } = useListCandidatesQuery({
    limit: pageSize,
    offset: page * pageSize,
    sortBy: 'applied_date',
    sortOrder: 'desc',
  });
  const { jobNameMap } = useJobOpeningNameMap();

  const candidates = data?.items ?? [];
  const dataSource: CandidateRow[] = candidates.map((c) => ({ ...c, key: c.id }));

  const columns: TableProps<CandidateRow>['columns'] = [
    {
      title: 'Candidate',
      key: 'candidate',
      render: (_: unknown, row: CandidateRow) => (
        <Link
          to={`/jobs/view/${row.job_opening_id}/candidates/${row.id}/details`}
          className="font-semibold text-primary transition-colors hover:text-primary-700"
        >
          {candidateName(row)}
        </Link>
      ),
    },
    {
      title: 'Job',
      key: 'job',
      render: (_: unknown, row: CandidateRow) => jobDisplayName(jobNameMap, row.job_opening_id),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, row: CandidateRow) => (
        <Badge status="neutral">{row.status_label ?? row.status_code ?? 'Applied'}</Badge>
      ),
    },
    {
      title: 'Resume score',
      dataIndex: 'resume_score',
      key: 'resume_score',
      align: 'center',
      render: (value: number | null) => value ?? '-',
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Applied date',
      dataIndex: 'applied_date',
      key: 'applied_date',
      render: (value: string) => formatDate(value),
    },
  ];

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title="Total applications"
      modalProps={{ width: 860, maskClosable: true }}
    >
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
            <CustomTable<CandidateRow>
              columns={columns}
              dataSource={dataSource}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">
                  No candidate applications yet.
                </div>
              }
            />
          )}
        </div>

        <MasterPagination
          current={page + 1}
          pageSize={pageSize}
          total={data?.total ?? 0}
          itemLabel="applications"
          onPageChange={(nextPage) => setPage(nextPage - 1)}
        />
      </div>
    </AntdCommonModal>
  );
};

export default CandidatesListModal;
