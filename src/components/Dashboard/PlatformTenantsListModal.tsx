import React, { useState } from 'react';
import { Select } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import type { TableProps } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import CustomTable from '../shared/ui/table';
import MasterPagination from '../shared/ui/MasterPagination';
import { Badge } from '../shared/ui/badge';
import { Loader } from '../shared/ui/loader';
import { Search } from '../shared';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import {
  useListPlatformTenantsQuery,
  type PlatformTenantSummary,
} from '../../api/organization-service/Platform/tenants';
import TenantAnalyticsModal from './TenantAnalyticsModal';
import {
  TENANT_STATUS_BADGE,
  formatTenantStatusLabel,
  formatTenantDate,
} from './tenantDisplay.helpers';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';

// Same four values GET /v1/platform/tenants filters on (see
// TENANT_STATUS_BADGE) — 'all' is a UI-only sentinel translated back to
// `undefined` (no status filter) below, same convention CustomerDashboard's
// Companies page already uses for this Select.
const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  ...Object.keys(TENANT_STATUS_BADGE).map((status) => ({
    label: formatTenantStatusLabel(status),
    value: status,
  })),
];

type TenantRow = PlatformTenantSummary & { key: string };

/**
 * The "Total customers" KPI card's own popup (Platform Overview /
 * `PlatformOverviewStats`) — the full, paginated tenant list behind that
 * number, same `GET /v1/platform/tenants` the "CFP Company" card and the
 * full `/company` page already use. A separate component from
 * `TenantsPreviewCard` (which embeds its own compact table directly in the
 * dashboard card) because this one opens as a modal from a plain stat tile
 * that has no table of its own to expand.
 *
 * Clicking a row opens the same `TenantAnalyticsModal` every other tenant
 * click-through in the app uses, stacked on top of this one.
 *
 * Also doubles as the "New customers this month" card's drill-down —
 * `createdAfter` filters to tenants created on/after that instant (org-service
 * already supports this on `GET /v1/platform/tenants`) and `title` swaps the
 * heading, rather than building a second near-identical modal.
 */
const PlatformTenantsListModal: React.FC<{
  onClose: () => void;
  createdAfter?: string;
  title?: string;
}> = ({ onClose, createdAfter, title = 'Total customers' }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('platform_tenants_modal', 10);
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenantSummary | null>(null);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{
    sortBy: 'created_at' | 'company_name';
    sortOrder: 'asc' | 'desc';
  }>({ sortBy: 'created_at', sortOrder: 'desc' });

  const { data, isLoading } = useListPlatformTenantsQuery({
    status,
    q: search || undefined,
    limit: pageSize,
    offset: page * pageSize,
    created_after: createdAfter,
    sort_by: sort.sortBy,
    sort_order: sort.sortOrder,
  });

  const tenants = data?.tenants ?? [];
  const dataSource: TenantRow[] = tenants.map((tenant) => ({ ...tenant, key: tenant.tenant_id }));

  const sortOrderFor = (
    columnKey: 'company_name' | 'created_at'
  ): 'ascend' | 'descend' | undefined =>
    sort.sortBy === columnKey ? (sort.sortOrder === 'asc' ? 'ascend' : 'descend') : undefined;

  const columns: TableProps<TenantRow>['columns'] = [
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      sorter: true,
      sortOrder: sortOrderFor('company_name'),
      render: (_: unknown, tenant: TenantRow) => (
        <span className="font-semibold text-primary-600">{tenant.company_name}</span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, tenant: TenantRow) => (
        <Badge status={TENANT_STATUS_BADGE[tenant.status] ?? 'neutral'}>
          {formatTenantStatusLabel(tenant.status)}
        </Badge>
      ),
    },
    {
      title: 'Admin email',
      dataIndex: 'admin_email',
      key: 'admin_email',
      render: (_: unknown, tenant: TenantRow) => (
        <span className="text-neutral-600">{tenant.admin_email || '-'}</span>
      ),
    },
    {
      title: 'Created',
      key: 'created_at',
      sorter: true,
      sortOrder: sortOrderFor('created_at'),
      render: (_: unknown, tenant: TenantRow) => (
        <span className="text-neutral-600">{formatTenantDate(tenant.created_at)}</span>
      ),
    },
  ];

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title={title}
      // Read-only list — nothing here can be lost by an outside click, so
      // unlike AntdCommonModal's form-safe default, clicking the backdrop
      // closes it.
      modalProps={{ width: 820, maskClosable: true }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Search
              appname="platform tenants modal"
              placeholder="Search company..."
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
                value={status ?? 'all'}
                onChange={(value) => {
                  setStatus(value === 'all' ? undefined : value);
                  setPage(0);
                }}
                options={STATUS_FILTER_OPTIONS}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 text-sm text-neutral-500">
          <span>Rows per page</span>
          <Select
            size="small"
            value={pageSize}
            className="rows-per-page-select"
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
            <CustomTable<TenantRow>
              columns={columns}
              dataSource={dataSource}
              onRow={(tenant) => ({
                onClick: () => setSelectedTenant(tenant),
                className: 'cursor-pointer',
              })}
              onChange={(_pagination, _filters, sorter) => {
                const active = Array.isArray(sorter) ? sorter[0] : sorter;
                const resolved = active as SorterResult<TenantRow>;
                setPage(0);
                if (!resolved?.order || !resolved.columnKey) {
                  setSort({ sortBy: 'created_at', sortOrder: 'desc' });
                  return;
                }
                const sortBy = resolved.columnKey as 'created_at' | 'company_name';
                setSort({ sortBy, sortOrder: resolved.order === 'ascend' ? 'asc' : 'desc' });
              }}
              enableKeyboardNav
              onRowEnter={(tenant) => setSelectedTenant(tenant)}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">No companies yet.</div>
              }
            />
          )}
        </div>

        <MasterPagination
          current={page + 1}
          pageSize={pageSize}
          total={data?.total ?? 0}
          itemLabel="companies"
          onPageChange={(nextPage) => setPage(nextPage - 1)}
        />
      </div>

      {selectedTenant && (
        <TenantAnalyticsModal tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />
      )}
    </AntdCommonModal>
  );
};

export default PlatformTenantsListModal;
