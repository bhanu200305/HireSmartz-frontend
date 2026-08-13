import { useEffect, useState } from 'react';
import { LuUsersRound } from 'react-icons/lu';
import { PlusOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from '../../layouts/MainLayout';
import { Button, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import { Badge } from '../shared/ui/badge';
import { RootState } from '../../redux/provider/store';
import { useListUsersQuery } from '../../api/organization-service/Users/users';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

const PAGE_SIZE = 20;

/** §"Users — Organization Directory": GET /v1/users. Tenant comes from the
 * caller's own session — no company/tenant selector, unlike the Super
 * Admin's Companies screen. Only what the real API supports: an
 * active/inactive filter and offset pagination — no server-side search,
 * sort, role filter, or "archived" tri-state (organization-service has
 * exactly one deactivated state, not a separate archive concept). */
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

  return (
    <MainLayout>
      <div className="w-full p-8 justify-start pt-16">
        {isLoading && <Loader />}
        <div className="flex space-x-4 justify-between p-2">
          <div className="flex items-center space-x-2">
            <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
              <LuUsersRound size={18} />
            </span>
            <h2 className="text-xl font-semibold">Users</h2>
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
              className="text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2"
              onClick={() => navigate('/add-organisation-users')}
            >
              <PlusOutlined className="text-lg" /> <span>ADD USER</span>
            </Button>
          </div>
        </div>

        <div className="w-full divide-y border rounded-xl overflow-hidden bg-white mt-2">
          <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-[#FAFAFA] text-xs font-semibold text-gray-500">
            <span>NAME</span>
            <span>EMAIL</span>
            <span>PHONE</span>
            <span>STATUS</span>
            <span className="text-right">ACTIONS</span>
          </div>
          {users.map((user) => (
            <div key={user.user_id} className="grid grid-cols-5 gap-2 px-4 py-3 items-center">
              <Link
                to={`/view-organisation-user?orgUserId=${user.user_id}`}
                className="font-medium underline text-primary"
              >
                {user.full_name}
              </Link>
              <span className="text-sm truncate" title={user.email}>
                {user.email}
              </span>
              <span className="text-sm">
                {user.phone_no ? `${user.country_code || ''}${user.phone_no}` : '-'}
              </span>
              <span>
                <Badge status={user.is_active ? 'success' : 'neutral'}>
                  {user.is_active ? 'Active' : 'Deactivated'}
                </Badge>
              </span>
              <span className="text-right">
                <Link
                  to={`/edit-organisation-user?orgUserId=${user.user_id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Edit
                </Link>
              </span>
            </div>
          ))}
          {!isLoading && users.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">No users found.</div>
          )}
        </div>

        <MasterPagination
          current={page + 1}
          pageSize={PAGE_SIZE}
          total={data?.total || 0}
          itemLabel="Users"
          onPageChange={(p) => setPage(p - 1)}
        />
      </div>
    </MainLayout>
  );
};

export default OrganisationUserTable;
