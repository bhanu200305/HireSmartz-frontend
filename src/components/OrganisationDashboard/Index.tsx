import { useEffect, useState } from 'react';
import type { TableProps } from 'antd';
import { LuUsersRound } from 'react-icons/lu';
import { PlusOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import { Badge } from '../shared/ui/badge';
import CustomTable from '../shared/ui/table';
import { RootState } from '../../redux/provider/store';
import { useListUsersQuery } from '../../api/organization-service/Users/users';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

const PAGE_SIZE = 20;

/** §"Users — Organization Directory": GET /v1/users. Tenant comes from the
 * caller's own session — no company/tenant selector, unlike the Super
 * Admin's Companies screen. Only what the real API supports: an
 * active/inactive filter and offset pagination — no server-side search,
 * sort, role filter, or "archived" tri-state (organization-service has
 * exactly one deactivated state, not a separate archive concept).
 *
 * A section rendered inside the Users page (pages/OrganisationUserPage),
 * alongside CfpUsers — no MainLayout/page chrome of its own, the composing
 * page owns that. */
const OrganisationUserTable = () => {
  const navigate = useNavigate();
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const [includeInactive, setIncludeInactive] = useState<'active' | 'all'>('active');
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useListUsersQuery(
    { includeInactive: includeInactive === 'all', limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { skip: !tenantId }
  );

  useEffect(() => {
    if (error) {
      showToast({ message: getOrgErrorMessage(error, 'Failed to load users.'), type: 'error' });
    }
  }, [error]);

  const users = data?.items || [];
  type UserRow = (typeof users)[number] & { key: string };
  const dataSource: UserRow[] = users.map((user) => ({ ...user, key: user.user_id }));

  const columns: TableProps<UserRow>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (_: unknown, user: UserRow) => (
        <Link
          to={`/view-organisation-user?orgUserId=${user.user_id}`}
          className="font-semibold text-primary-600 hover:underline"
        >
          {user.full_name}
        </Link>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (_: unknown, user: UserRow) => (
        <span className="text-sm text-gray-600 truncate" title={user.email}>
          {user.email}
        </span>
      ),
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (_: unknown, user: UserRow) => (
        <span className="text-sm text-gray-600">
          {user.phone_no ? `${user.country_code || ''}${user.phone_no}` : '-'}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, user: UserRow) => (
        <Badge status={user.is_active ? 'success' : 'neutral'}>
          {user.is_active ? 'Active' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_: unknown, user: UserRow) => (
        <Link
          to={`/edit-organisation-user?orgUserId=${user.user_id}`}
          className="text-sm font-semibold text-primary-600 hover:underline"
        >
          Edit
        </Link>
      ),
    },
  ];

  return (
    <div className="w-full">
      {isLoading && <Loader />}
      <div className="flex flex-wrap gap-4 justify-between items-center p-2">
        <div className="flex items-center space-x-2">
          <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
            <LuUsersRound size={18} />
          </span>
          <h2 className="font-display text-xl font-bold text-gray-900">Users</h2>
        </div>
        <div className="flex space-x-4">
          <Select
            value={includeInactive}
            onChange={(value) => {
              setIncludeInactive(value);
              setPage(0);
            }}
            className="w-40"
            options={[
              { label: 'Active only', value: 'active' },
              { label: 'Include deactivated', value: 'all' },
            ]}
          />
          <Button
            appname="add user"
            className="text-white bg-primary-600 rounded-full px-5 py-2 flex items-center gap-1.5 text-sm font-semibold cfp-hover-lift"
            onClick={() => navigate('/add-organisation-users')}
          >
            <PlusOutlined className="text-sm" /> <span>ADD USER</span>
          </Button>
        </div>
      </div>

      <div className="w-full border border-neutral-200 rounded-xl overflow-hidden bg-white mt-3">
        <CustomTable<UserRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={
            !isLoading ? (
              <div className="py-10 text-center text-gray-400 text-sm">No users found.</div>
            ) : undefined
          }
        />
      </div>

      <MasterPagination
        current={page + 1}
        pageSize={PAGE_SIZE}
        total={data?.total || 0}
        itemLabel="Users"
        onPageChange={(p) => setPage(p - 1)}
      />
    </div>
  );
};

export default OrganisationUserTable;
