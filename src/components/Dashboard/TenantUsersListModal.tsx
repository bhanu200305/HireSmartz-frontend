import React, { useState } from 'react';
import { Select } from 'antd';
import type { TableProps } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import CustomTable from '../shared/ui/table';
import MasterPagination from '../shared/ui/MasterPagination';
import { Badge } from '../shared/ui/badge';
import { Loader } from '../shared/ui/loader';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { useListPlatformTenantUsersQuery } from '../../api/organization-service/Platform/users';
import type { OrgUser } from '../../api/organization-service/Users/users';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

type UserRow = OrgUser & { key: string };

/**
 * The Super Admin per-tenant "Active users" KPI card's popup
 * (`TenantAnalyticsModal`/`MetricsPanel`) — the full, paginated team
 * directory for that one tenant, reached via
 * `GET /v1/platform/tenants/{tenant_id}/users` (same shape the tenant-side
 * Users tab already renders, just platform-scoped). Replaces the old
 * `viewAllHref="/view-company?...&tab=8"` link, which navigated away from
 * this modal to a completely different page.
 */
const TenantUsersListModal: React.FC<{ tenantId: string; onClose: () => void }> = ({
  tenantId,
  onClose,
}) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('tenant_active_users_modal', 10);

  const { data, isLoading } = useListPlatformTenantUsersQuery({
    tenantId,
    includeInactive: false,
    limit: pageSize,
    offset: page * pageSize,
  });

  const users = data?.items ?? [];
  const dataSource: UserRow[] = users.map((u) => ({ ...u, key: u.user_id }));

  const columns: TableProps<UserRow>['columns'] = [
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, row: UserRow) => (
        <div>
          <span className="block font-semibold text-neutral-900">{row.full_name}</span>
          {row.title && <span className="text-xs text-neutral-400">{row.title}</span>}
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      key: 'role',
      render: (_: unknown, row: UserRow) => <Badge status="info">{row.role ?? '-'}</Badge>,
    },
  ];

  return (
    <AntdCommonModal open onClose={onClose} title="Active users" modalProps={{ width: 780 }}>
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
            <CustomTable<UserRow>
              columns={columns}
              dataSource={dataSource}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">No active users.</div>
              }
            />
          )}
        </div>

        <MasterPagination
          current={page + 1}
          pageSize={pageSize}
          total={data?.total ?? 0}
          itemLabel="users"
          onPageChange={(nextPage) => setPage(nextPage - 1)}
        />
      </div>
    </AntdCommonModal>
  );
};

export default TenantUsersListModal;
