import React, { useState } from 'react';
import { Select } from 'antd';
import type { TableProps } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import CustomTable from '../shared/ui/table';
import MasterPagination from '../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { Badge } from '../shared/ui/badge';
import { Loader } from '../shared/ui/loader';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { useListPlatformTenantUsersQuery } from '../../api/organization-service/Platform/users';
import type { OrgUser } from '../../api/organization-service/Users/users';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';
import ViewPlatformUserModal from '../CustomerDashboard/ViewCustomer/panels/ViewPlatformUserModal';
import { systemRoleLabel } from '../RolesManagement/data/roleTemplates';

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
  const [viewingUser, setViewingUser] = useState<OrgUser | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data, isLoading } = useListPlatformTenantUsersQuery({
    tenantId,
    includeInactive,
    limit: pageSize,
    offset: page * pageSize,
  });

  const users = data?.items ?? [];
  const dataSource: UserRow[] = users.map((u) => ({ ...u, key: u.user_id }));

  // Explicit per-column widths — see CandidatesListModal.tsx's identical
  // comment on why `scroll.x: 'max-content'` alone isn't reliable here.
  const columns: TableProps<UserRow>['columns'] = [
    {
      title: 'Name',
      key: 'name',
      minWidth: 240,
      render: (_: unknown, row: UserRow) => (
        <button
          type="button"
          onClick={() => setViewingUser(row)}
          className="text-left cursor-pointer"
        >
          <span className="block font-semibold text-neutral-900 hover:text-primary-600 hover:underline">
            {row.full_name}
          </span>
          {row.title && <span className="text-xs text-neutral-400">{row.title}</span>}
        </button>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      minWidth: 280,
    },
    {
      title: 'Role',
      key: 'role',
      minWidth: 180,
      render: (_: unknown, row: UserRow) => (
        <Badge status="info">{row.role ? systemRoleLabel(row.role) : '-'}</Badge>
      ),
    },
  ];

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title="Active Users"
      modalProps={{ width: 780, maskClosable: true }}
      fillHeight
    >
      <div className="flex min-h-0 flex-auto flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <Select
            className="w-48"
            value={includeInactive ? 'all' : 'active'}
            onChange={(value) => {
              setIncludeInactive(value === 'all');
              setPage(0);
            }}
            options={[
              { label: 'Active Only', value: 'active' },
              { label: 'Include Deactivated', value: 'all' },
            ]}
          />
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
            <CustomTable<UserRow>
              columns={columns}
              dataSource={dataSource}
              scrollY="100%"
              onRow={(row) => ({
                onClick: () => setViewingUser(row),
                className: 'cursor-pointer',
              })}
              enableKeyboardNav
              onRowEnter={(row) => setViewingUser(row)}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">No active users.</div>
              }
            />
          )}
        </div>

        <div className="shrink-0">
          <MasterPagination
            current={page + 1}
            pageSize={pageSize}
            total={data?.total ?? 0}
            itemLabel="users"
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </div>
      </div>

      <ViewPlatformUserModal
        open={viewingUser !== null}
        tenantId={tenantId}
        user={viewingUser}
        onClose={() => setViewingUser(null)}
      />
    </AntdCommonModal>
  );
};

export default TenantUsersListModal;
