import React, { useState } from 'react';
import { Select } from 'antd';
import type { TableProps } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import CustomTable from '../shared/ui/table';
import MasterPagination from '../shared/ui/MasterPagination';
import { Badge } from '../shared/ui/badge';
import { Loader } from '../shared/ui/loader';
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

const PAGE_SIZE_OPTIONS = [10, 20, 50];

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
 */
const PlatformTenantsListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('platform_tenants_modal', 10);
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenantSummary | null>(null);

  const { data, isLoading } = useListPlatformTenantsQuery({
    limit: pageSize,
    offset: page * pageSize,
  });

  const tenants = data?.tenants ?? [];
  const dataSource: TenantRow[] = tenants.map((tenant) => ({ ...tenant, key: tenant.tenant_id }));

  const columns: TableProps<TenantRow>['columns'] = [
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
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
      render: (_: unknown, tenant: TenantRow) => (
        <span className="text-neutral-600">{formatTenantDate(tenant.created_at)}</span>
      ),
    },
  ];

  return (
    <AntdCommonModal open onClose={onClose} title="Total customers" modalProps={{ width: 820 }}>
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
            <CustomTable<TenantRow>
              columns={columns}
              dataSource={dataSource}
              onRow={(tenant) => ({
                onClick: () => setSelectedTenant(tenant),
                className: 'cursor-pointer',
              })}
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
