import React, { useState } from 'react';
import { Select } from 'antd';
import type { TableProps } from 'antd';
import AntdCommonModal from './AntdCommonModal';
import CustomTable from './table';
import MasterPagination from './MasterPagination';
import { Badge } from './badge';
import { Loader } from './loader';
import { usePersistedPageSize } from '../../../hooks/usePersistedPageSize';
import { useListUsersQuery, type OrgUser } from '../../../api/organization-service/Users/users';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

type UserRow = OrgUser & { key: string };

/**
 * The "Active team members" KPI card's popup (`HiringOverviewStats`) —
 * the full, paginated team directory behind that number. Same
 * `GET /v1/users` this app's own organisation-users table already uses,
 * scoped to active users (matching what the card's own count counts).
 */
const TeamMembersListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('active_team_members_modal', 10);

  const { data, isLoading } = useListUsersQuery({
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
      sorter: (a: UserRow, b: UserRow) => a.full_name.localeCompare(b.full_name),
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
      sorter: (a: UserRow, b: UserRow) => a.email.localeCompare(b.email),
    },
    {
      title: 'Role',
      key: 'role',
      sorter: (a: UserRow, b: UserRow) => (a.role ?? '').localeCompare(b.role ?? ''),
      render: (_: unknown, row: UserRow) => <Badge status="info">{row.role ?? '-'}</Badge>,
    },
    {
      title: 'Phone',
      key: 'phone',
      sorter: (a: UserRow, b: UserRow) => (a.phone_no ?? '').localeCompare(b.phone_no ?? ''),
      render: (_: unknown, row: UserRow) =>
        row.phone_no ? `${row.country_code ?? ''} ${row.phone_no}` : '-',
    },
  ];

  return (
    <AntdCommonModal open onClose={onClose} title="Active team members" modalProps={{ width: 780 }}>
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
                <div className="py-10 text-center text-sm text-neutral-400">
                  No active team members.
                </div>
              }
            />
          )}
        </div>

        <MasterPagination
          current={page + 1}
          pageSize={pageSize}
          total={data?.total ?? 0}
          itemLabel="team members"
          onPageChange={(nextPage) => setPage(nextPage - 1)}
        />
      </div>
    </AntdCommonModal>
  );
};

export default TeamMembersListModal;
