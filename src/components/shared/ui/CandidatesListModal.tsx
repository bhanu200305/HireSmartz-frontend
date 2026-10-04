import React, { useState } from 'react';
import type { SorterResult } from 'antd/es/table/interface';
import type { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import AntdCommonModal from './AntdCommonModal';
import CustomTable from './table';
import MasterPagination from './MasterPagination';
import { RowsPerPageSelect } from './RowsPerPageSelect';
import { Badge } from './badge';
import { Loader } from './loader';
import { Search } from './search';
import { usePersistedPageSize } from '../../../hooks/usePersistedPageSize';
import {
  useListCandidatesQuery,
  type CandidateView,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import FilterMenu, {
  type CandidateListFilterValues,
} from '../../JobsOpening/Candidates/FilterMenu';
import {
  useJobOpeningNameMap,
  jobDisplayName,
} from '../../HiringManagerDashboard/useJobOpeningNameMap';
import { PAGE_SIZE_OPTIONS } from '../../../constants/app.constants';
import { AI_SCORE_MAX } from '../../JobsOpening/Candidates/roundPipeline';

// Candidate / Resume score / Applied date are the only three columns
// candidate-service can actually sort by (`ListCandidatesArgs.sortBy`) — see
// that type's own docstring. Mapping table-column key -> API sort key here
// rather than making the column keys match the API names directly, since
// 'candidate' (this modal's column) reads better than 'name' as a header.
const SORT_KEY_BY_COLUMN: Record<string, 'applied_date' | 'resume_score' | 'name'> = {
  candidate: 'name',
  resume_score: 'resume_score',
  applied_date: 'applied_date',
};

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
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CandidateListFilterValues>({});
  const [sort, setSort] = useState<{
    sortBy: 'applied_date' | 'resume_score' | 'name';
    sortOrder: 'asc' | 'desc';
  }>({ sortBy: 'applied_date', sortOrder: 'desc' });

  const { data, isLoading } = useListCandidatesQuery({
    limit: pageSize,
    offset: page * pageSize,
    search: search || undefined,
    statusCode: filters.statusCode,
    source: filters.source,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
  });
  const { jobNameMap } = useJobOpeningNameMap();

  const candidates = data?.items ?? [];
  const dataSource: CandidateRow[] = candidates.map((c) => ({ ...c, key: c.id }));

  // Reflects the CURRENT server-side sort back onto the column header (the
  // active arrow) — `sorter: true` below means antd never sorts client-side
  // itself, it just shows the control and reports clicks via `onChange`.
  const sortOrderFor = (columnKey: string): 'ascend' | 'descend' | undefined =>
    sort.sortBy === SORT_KEY_BY_COLUMN[columnKey]
      ? sort.sortOrder === 'asc'
        ? 'ascend'
        : 'descend'
      : undefined;

  // Explicit per-column `minWidth`, not `width` — with this table's
  // `tableLayout: 'auto'` (the default whenever a CustomTable has no
  // `scroll.y`/sticky column/`ellipsis`, see rc-table's own
  // `mergedTableLayout`), rc-table's `<ColGroup>` only ever reads
  // `column.minWidth` to build each `<col>`'s CSS; a plain `column.width`
  // is silently ignored in this mode (it's only honored under
  // `tableLayout: 'fixed'`). Setting `width` here first still let every
  // column get squeezed down to fit the modal with no real minimum, so
  // nothing ever overflowed for `scroll.x: 'max-content'`'s scrollbar to
  // appear — the columns just clipped at the modal's edge instead of
  // scrolling to reach them. `minWidth` is what rc-table actually applies
  // in `auto` layout, so the table now has a real floor to grow past.
  const columns: TableProps<CandidateRow>['columns'] = [
    {
      title: 'Candidate',
      key: 'candidate',
      minWidth: 190,
      sorter: true,
      sortOrder: sortOrderFor('candidate'),
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
      minWidth: 150,
      render: (_: unknown, row: CandidateRow) => jobDisplayName(jobNameMap, row.job_opening_id),
    },
    {
      title: 'Status',
      key: 'status',
      minWidth: 130,
      render: (_: unknown, row: CandidateRow) => (
        <Badge status="neutral">{row.status_label ?? row.status_code ?? 'Applied'}</Badge>
      ),
    },
    {
      title: 'Resume Score',
      dataIndex: 'resume_score',
      key: 'resume_score',
      minWidth: 140,
      align: 'center',
      sorter: true,
      sortOrder: sortOrderFor('resume_score'),
      render: (value: number | null) => (value != null ? `${value} / ${AI_SCORE_MAX}` : '-'),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      minWidth: 150,
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Applied Date',
      dataIndex: 'applied_date',
      key: 'applied_date',
      minWidth: 140,
      sorter: true,
      sortOrder: sortOrderFor('applied_date'),
      render: (value: string) => formatDate(value),
    },
  ];

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title="Total Applications"
      modalProps={{ width: 860, maskClosable: true }}
      fillHeight
    >
      <div className="flex min-h-0 flex-auto flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Search
              appname="total applications modal"
              placeholder="Search candidates..."
              value={search}
              allowClear
              onSearch={(value) => {
                setSearch(value);
                setPage(0);
              }}
            />
            <FilterMenu
              filters={filters}
              onFilterChange={(next) => {
                setFilters((prev) => ({ ...prev, ...next }));
                setPage(0);
              }}
            />
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

        <div className="w-full min-h-0 flex-auto overflow-hidden rounded-xl border border-neutral-200 bg-white flex">
          {isLoading ? (
            <Loader />
          ) : (
            <CustomTable<CandidateRow>
              columns={columns}
              dataSource={dataSource}
              scrollY="100%"
              onChange={(_pagination, _tableFilters, sorter) => {
                const active = Array.isArray(sorter) ? sorter[0] : sorter;
                const resolved = active as SorterResult<CandidateRow>;
                if (!resolved?.order || !resolved.columnKey) {
                  setSort({ sortBy: 'applied_date', sortOrder: 'desc' });
                  return;
                }
                const sortBy = SORT_KEY_BY_COLUMN[String(resolved.columnKey)];
                if (!sortBy) return;
                setSort({ sortBy, sortOrder: resolved.order === 'ascend' ? 'asc' : 'desc' });
              }}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">
                  No candidate applications yet.
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
            itemLabel="applications"
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default CandidatesListModal;
