import { useEffect, useState } from 'react';
import { FaCity } from 'react-icons/fa';
import { PlusOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { Button, Search, showToast } from '..';
import { Loader } from '../shared/ui/loader';
import { Badge, BadgeStatus } from '../shared/ui/badge';
import MasterPagination from '../shared/ui/MasterPagination';
import { useListPlatformTenantsQuery } from '../../api/organization-service/Platform/tenants';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<string, BadgeStatus> = {
  draft: 'neutral',
  pre_approved: 'warning',
  active: 'success',
  suspended: 'danger',
};

/**
 * Super Admin's "Companies" screen — GET /v1/platform/tenants. Filters/sort
 * kept to what the real endpoint supports: status, a substring search on
 * company name (`q`, server-side), and offset pagination — no date-range
 * filter, no recruiter/interview counts, no impersonation-from-this-screen
 * (none of those exist on this contract or endpoint).
 */
const CustomerTable = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useListPlatformTenantsQuery({
    status,
    q: search || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  // Toasting belongs in an effect, not the render body — calling it directly
  // during render triggers React's "Cannot update a component while
  // rendering a different component" warning (showToast updates the toast
  // provider's own state), and would refire on every render while `error`
  // stays truthy, not just once when it first appears.
  useEffect(() => {
    if (error) {
      showToast({ message: getOrgErrorMessage(error, 'Failed to load companies.'), type: 'error' });
    }
  }, [error]);

  const tenants = data?.tenants || [];

  return (
    <MainLayout>
      <div className="w-full p-8 justify-start pt-16">
        {isLoading && <Loader />}
        <div className="flex space-x-4 justify-between p-2">
          <div className="flex items-center space-x-2">
            <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
              <FaCity size={18} />
            </span>
            <h2 className="text-xl font-semibold">Companies</h2>
          </div>
          <div className="flex space-x-4 items-center">
            <Search
              appname="customers"
              placeholder="Search company..."
              onSearch={(value) => {
                setSearch(value);
                setPage(0);
              }}
              allowClear
              value={search}
            />
            <Select
              placeholder="Status"
              className="w-40"
              // The Select's own value can't be `undefined` and still show as
              // selected — Ant Design treats that as "nothing chosen" and
              // falls back to the placeholder. 'all' is a UI-only sentinel;
              // it's translated back to `undefined` (no status filter) below,
              // same as clearing the field used to do before this option
              // existed.
              value={status ?? 'all'}
              onChange={(value) => {
                setStatus(value === 'all' ? undefined : value);
                setPage(0);
              }}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Draft', value: 'draft' },
                { label: 'Pending approval', value: 'pre_approved' },
                { label: 'Active', value: 'active' },
                { label: 'Suspended', value: 'suspended' },
              ]}
            />
            <Button
              appname="add company"
              className="text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2"
              onClick={() => navigate('/add-company')}
            >
              <PlusOutlined className="text-lg" /> <span>ADD COMPANY</span>
            </Button>
          </div>
        </div>

        <div className="w-full divide-y border rounded-xl overflow-hidden bg-white mt-2">
          <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-[#FAFAFA] text-xs font-semibold text-gray-500">
            <span>COMPANY</span>
            <span>ADMIN EMAIL</span>
            <span>SIGNUP SOURCE</span>
            <span>STATUS</span>
            <span>JOINED</span>
          </div>
          {tenants.map((tenant) => (
            <Link
              key={tenant.tenant_id}
              to={`/view-company?companyId=${tenant.tenant_id}`}
              className="grid grid-cols-5 gap-2 px-4 py-3 items-center hover:bg-gray-50"
            >
              <span className="font-medium text-primary underline">{tenant.company_name}</span>
              <span className="text-sm truncate" title={tenant.admin_email}>
                {tenant.admin_email}
              </span>
              <span className="text-sm capitalize">{tenant.signup_source}</span>
              <span>
                <Badge status={STATUS_BADGE[tenant.status] || 'neutral'}>{tenant.status}</Badge>
              </span>
              <span className="text-sm">
                {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}
              </span>
            </Link>
          ))}
          {!isLoading && tenants.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">No companies found.</div>
          )}
        </div>

        <MasterPagination
          current={page + 1}
          pageSize={PAGE_SIZE}
          total={data?.total || 0}
          itemLabel="Companies"
          onPageChange={(p) => setPage(p - 1)}
        />
      </div>
    </MainLayout>
  );
};

export default CustomerTable;
