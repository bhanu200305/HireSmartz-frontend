import BackButton from '../shared/ui/BackButton';
import { useEffect, useState } from 'react';
import { FaCity } from 'react-icons/fa';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Popconfirm, Select, Tooltip } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import type { TableProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { Button, Search, showToast } from '..';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';
import { Loader } from '../shared/ui/loader';
import { Badge, BadgeStatus } from '../shared/ui/badge';
import CustomTable from '../shared/ui/table';
import MasterPagination from '../shared/ui/MasterPagination';
import {
  useDeleteTenantMutation,
  useListPlatformTenantsQuery,
} from '../../api/organization-service/Platform/tenants';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import CorrectAdminEmailModal from './CorrectAdminEmailModal';

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
 * company name (`q`, server-side), server-side sort by Company/Joined
 * (`sort_by`/`sort_order`), and offset pagination — no date-range filter, no
 * recruiter/interview counts, no impersonation-from-this-screen (none of
 * those exist on this contract or endpoint).
 */
const CustomerTable = () => {
  const navigate = useNavigate();
  // Defaults to Active — with hundreds of companies now on the platform,
  // drafts (which every "Add Company" leaves behind, confirmed or not)
  // would otherwise swamp the list Super Admin actually cares about day to
  // day. 'all' is still one click away via the Status filter.
  const [status, setStatus] = useState<string | undefined>('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{
    sortBy: 'created_at' | 'company_name';
    sortOrder: 'asc' | 'desc';
  }>({ sortBy: 'created_at', sortOrder: 'desc' });

  const { data, isLoading, error } = useListPlatformTenantsQuery({
    status,
    q: search || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    sort_by: sort.sortBy,
    sort_order: sort.sortOrder,
  });
  const [deleteTenant, { isLoading: isDeleting }] = useDeleteTenantMutation();
  const [correctEmailTenant, setCorrectEmailTenant] = useState<{
    tenant_id: string;
    company_name: string;
    admin_email: string;
  } | null>(null);

  const handleDelete = async (tenantId: string) => {
    try {
      await deleteTenant({ tenantId }).unwrap();
      showToast({ message: 'Draft company deleted.', type: 'success' });
    } catch (err: unknown) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to delete this draft company.'),
        type: 'error',
      });
    }
  };

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
  type TenantRow = (typeof tenants)[number] & { key: string };
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
      title: 'Admin Email',
      dataIndex: 'admin_email',
      key: 'admin_email',
      render: (_: unknown, tenant: TenantRow) => (
        <span className="text-sm text-gray-600 truncate" title={tenant.admin_email}>
          {tenant.admin_email}
        </span>
      ),
    },
    {
      title: 'Signup Source',
      dataIndex: 'signup_source',
      key: 'signup_source',
      render: (_: unknown, tenant: TenantRow) => (
        <span className="text-sm text-gray-600 capitalize">{tenant.signup_source}</span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, tenant: TenantRow) => (
        <Badge status={STATUS_BADGE[tenant.status] || 'neutral'}>{tenant.status}</Badge>
      ),
    },
    {
      title: 'Joined',
      key: 'created_at',
      sorter: true,
      sortOrder: sortOrderFor('created_at'),
      render: (_: unknown, tenant: TenantRow) => (
        <span className="text-sm text-gray-500">
          {tenant.created_at
            ? new Date(tenant.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            : '-'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, tenant: TenantRow) => {
        // Delete is draft-only; Correct admin email is draft or
        // pre_approved — draft rows always show at least one of the two, so
        // this is a strict superset check.
        const canCorrectEmail = tenant.status === 'draft' || tenant.status === 'pre_approved';
        if (!canCorrectEmail) return null;
        return (
          // stopPropagation on the wrapping span, not the Button itself —
          // the shared Button's onClick type takes no event argument, but
          // the row's own onRow.onClick still needs blocking so an action
          // click doesn't also navigate to /view-company underneath it.
          <span onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1">
            {canCorrectEmail && (
              <Tooltip title="Correct admin email">
                <Button
                  appname="correct admin email"
                  onClick={() => setCorrectEmailTenant(tenant)}
                  className="!border-none !bg-transparent !shadow-none text-gray-500"
                >
                  <EditOutlined />
                </Button>
              </Tooltip>
            )}
            {tenant.status === 'draft' && (
              // Draft-only — the backend refuses anything else (409
              // TENANT_NOT_DELETABLE) anyway.
              <Popconfirm
                title="Delete this draft company?"
                description="This cannot be undone."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => void handleDelete(tenant.tenant_id)}
              >
                <Tooltip title="Delete">
                  <Button
                    appname="delete draft company"
                    disabled={isDeleting}
                    className="group !border-none !bg-transparent !shadow-none"
                  >
                    <DeleteOutlined className="text-gray-600 transition-colors group-hover:text-red-600" />
                  </Button>
                </Tooltip>
              </Popconfirm>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <MainLayout>
      <div className="w-full p-8 justify-start pt-16">
        <BackButton onClick={() => navigate('/')} className="mb-4" />
        {isLoading && <Loader />}
        <div className="flex flex-wrap gap-4 justify-between items-center p-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
              <FaCity size={18} />
            </span>
            <h2 className="font-display text-xl font-bold text-gray-900">Companies</h2>
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
            <div className="cfp-dropdown-trigger w-40">
              <FilterSelectIcon />
              <Select
                placeholder="Status"
                className="w-full custom-select"
                variant="borderless"
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
            </div>
            <Button
              appname="add company"
              className="text-white bg-primary-600 rounded-full px-5 py-2 flex items-center gap-1.5 text-sm font-semibold cfp-hover-lift"
              onClick={() => navigate('/add-company')}
            >
              <PlusOutlined className="text-sm" /> <span>Add Company</span>
            </Button>
          </div>
        </div>

        <div className="w-full border border-neutral-200 rounded-xl overflow-hidden bg-white mt-3">
          <CustomTable<TenantRow>
            columns={columns}
            dataSource={dataSource}
            onRow={(tenant) => ({
              onClick: () => navigate(`/view-company?companyId=${tenant.tenant_id}`),
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
            onRowEnter={(tenant) => navigate(`/view-company?companyId=${tenant.tenant_id}`)}
            emptyText={
              !isLoading ? (
                <div className="py-10 text-center text-gray-400 text-sm">No companies found.</div>
              ) : undefined
            }
          />
        </div>

        <MasterPagination
          current={page + 1}
          pageSize={PAGE_SIZE}
          total={data?.total || 0}
          itemLabel="Companies"
          onPageChange={(p) => setPage(p - 1)}
        />
      </div>

      {correctEmailTenant && (
        <CorrectAdminEmailModal
          tenantId={correctEmailTenant.tenant_id}
          companyName={correctEmailTenant.company_name}
          currentEmail={correctEmailTenant.admin_email}
          onClose={() => setCorrectEmailTenant(null)}
        />
      )}
    </MainLayout>
  );
};

export default CustomerTable;
