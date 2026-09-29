import React, { useState } from 'react';
import { Select } from 'antd';
import type { TableProps } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import AntdCommonModal from './AntdCommonModal';
import CustomTable from './table';
import MasterPagination from './MasterPagination';
import { RowsPerPageSelect } from './RowsPerPageSelect';
import { Badge } from './badge';
import { Loader } from './loader';
import { FilterSelectIcon } from './FilterSelectIcon';
import { usePersistedPageSize } from '../../../hooks/usePersistedPageSize';
import { useListUsersQuery, type OrgUser } from '../../../api/organization-service/Users/users';
import { PAGE_SIZE_OPTIONS } from '../../../constants/app.constants';
import { useRolesCatalog } from '../../../hooks/useRolesCatalog';

const humanizeRole = (baseRoleName: string): string =>
  baseRoleName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

type UserRow = OrgUser & { key: string };

/**
 * The "Active team members" KPI card's popup (`HiringOverviewStats`) —
 * the full, paginated team directory behind that number. Same
 * `GET /v1/users` this app's own organisation-users table already uses,
 * scoped to active users (matching what the card's own count counts).
 */
const TeamMembersListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('active_team_members_modal', 10);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [role, setRole] = useState<string | undefined>(undefined);

  const { data, isLoading } = useListUsersQuery({
    includeInactive,
    role,
    limit: pageSize,
    offset: page * pageSize,
  });
  const { roles } = useRolesCatalog({ scope: 'tenant', isMaster: false });

  const roleOptions = Array.from(
    new Map(
      roles
        .filter((r) => r.baseRoleName)
        .map((r) => [
          r.baseRoleName as string,
          { label: humanizeRole(r.baseRoleName as string), value: r.baseRoleName as string },
        ])
    ).values()
  );

  const users = data?.items ?? [];
  const dataSource: UserRow[] = users.map((u) => ({ ...u, key: u.user_id }));

  // No client-side `sorter`s here on purpose — this table is server-
  // paginated (`limit`/`offset`), so a client-side comparator would only
  // ever reorder the current page while its header arrow implies a real
  // full-list sort. `GET /v1/users` has no sort param to back a real one;
  // `role` and `includeInactive` (below) are the filters it actually
  // supports.
  // Explicit per-column widths — see CandidatesListModal.tsx's identical
  // comment on why `scroll.x: 'max-content'` alone isn't reliable here.
  const columns: TableProps<UserRow>['columns'] = [
    {
      title: 'Name',
      key: 'name',
      minWidth: 220,
      render: (_: unknown, row: UserRow) => (
        <Link
          to={`/view-organisation-user?orgUserId=${row.user_id}`}
          onClick={() => onClose()}
          className="inline-block"
        >
          <span className="block font-semibold text-neutral-900 hover:text-primary-600 hover:underline">
            {row.full_name}
          </span>
          {row.title && <span className="text-xs text-neutral-400">{row.title}</span>}
        </Link>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      minWidth: 260,
    },
    {
      title: 'Role',
      key: 'role',
      minWidth: 160,
      render: (_: unknown, row: UserRow) => <Badge status="info">{row.role ?? '-'}</Badge>,
    },
    {
      title: 'Phone',
      key: 'phone',
      minWidth: 170,
      render: (_: unknown, row: UserRow) =>
        row.phone_no ? `${row.country_code ?? ''} ${row.phone_no}` : '-',
    },
  ];

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title="Active team members"
      modalProps={{ width: 780, maskClosable: true }}
      fillHeight
    >
      <div className="flex min-h-0 flex-auto flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="cfp-dropdown-trigger w-40">
              <FilterSelectIcon />
              <Select
                placeholder="Role"
                allowClear
                className="w-full custom-select"
                variant="borderless"
                value={role}
                onChange={(value) => {
                  setRole(value);
                  setPage(0);
                }}
                options={roleOptions}
              />
            </div>
            <div className="cfp-dropdown-trigger w-48">
              <FilterSelectIcon />
              <Select
                className="w-full custom-select"
                variant="borderless"
                value={includeInactive ? 'all' : 'active'}
                onChange={(value) => {
                  setIncludeInactive(value === 'all');
                  setPage(0);
                }}
                options={[
                  { label: 'Active only', value: 'active' },
                  { label: 'Include deactivated', value: 'all' },
                ]}
              />
            </div>
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
            <CustomTable<UserRow>
              columns={columns}
              dataSource={dataSource}
              scrollY="100%"
              onRow={(row) => ({
                onClick: () => {
                  onClose();
                  navigate(`/view-organisation-user?orgUserId=${row.user_id}`);
                },
                className: 'cursor-pointer',
              })}
              enableKeyboardNav
              onRowEnter={(row) => {
                onClose();
                navigate(`/view-organisation-user?orgUserId=${row.user_id}`);
              }}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">
                  No active team members.
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
            itemLabel="team members"
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default TeamMembersListModal;
