import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { MdOutlineAdd, MdPersonOff, MdRestore, MdSearch } from 'react-icons/md';
import {
  Badge,
  Button,
  CustomTable,
  Input,
  Select,
  Typography,
  paginationConfig,
  showToast,
} from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import {
  useListPlatformTenantUsersQuery,
  useCreatePlatformTenantUserMutation,
  useDeactivatePlatformTenantUserMutation,
  useReactivatePlatformTenantUserMutation,
} from '../../../../api/organization-service/Platform/users';
import { useListPlatformTenantDepartmentsQuery } from '../../../../api/organization-service/Platform/departments';
import { useRolesCatalog } from '../../../../hooks/useRolesCatalog';
import type { OrgUser } from '../../../../api/organization-service/Users/users';
import { getOrgErrorMessage } from '../../../../shared/utils/auth/orgError.helpers';

type UserRow = OrgUser & { key: string };

type FormState = {
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  phone_no: string;
  department_id: string | undefined;
  role_id: string | undefined;
};

const emptyForm: FormState = {
  email: '',
  first_name: '',
  last_name: '',
  title: '',
  phone_no: '',
  department_id: undefined,
  role_id: undefined,
};

/**
 * Super Admin's mirror of OrganisationDashboard/OrganisationAddUser +
 * OrganisationUserTable — same POST/GET/DELETE /v1/users surface, but
 * platform-mounted (users_platform_router.py) so it works from a token with
 * no ambient tenant_id. Role assignment is folded into the same create call
 * (POST body's `role_id`) rather than a separate step, using this tenant's
 * own role catalog via useRolesCatalog — the same one RolesManagement /
 * CreateRoleModal already read for this tenant when isMaster.
 *
 * Inherits organization-service's known gap: a user created this way has no
 * password until they go through the invite/accept flow, and this endpoint
 * doesn't create an invite. That gap is already tracked as a backend fix
 * (see AddOrganisationUser's identical caveat, tenant-side) — nothing about
 * this panel makes it worse, but nothing here works around it either.
 *
 * Table + search/sort/filter/pagination matches CompanySettings' master-data
 * tabs instead of the plain divided list this used to be.
 */
const UsersPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [includeInactive, setIncludeInactive] = useState<'active' | 'all'>('active');
  const { data, isLoading } = useListPlatformTenantUsersQuery({
    tenantId,
    includeInactive: includeInactive === 'all',
  });
  const { data: departments } = useListPlatformTenantDepartmentsQuery(tenantId);
  const { roles } = useRolesCatalog({ scope: 'tenant', tenantId, isMaster: true });

  const [createUser, { isLoading: isCreating }] = useCreatePlatformTenantUserMutation();
  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivatePlatformTenantUserMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivatePlatformTenantUserMutation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [userToDeactivate, setUserToDeactivate] = useState<OrgUser | null>(null);
  const [searchText, setSearchText] = useState('');

  const field = (key: keyof FormState) => ({
    value: form[key] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const departmentName = (id: string | null) =>
    departments?.find((d) => d.org_department_id === id)?.name || '-';

  const users = data?.items ?? [];

  const filteredUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.title ?? '').toLowerCase().includes(q)
    );
  }, [users, searchText]);

  const handleAdd = async () => {
    if (!form.email.trim() || !form.first_name.trim()) {
      showToast({ message: 'Email and first name are required.', type: 'error' });
      return;
    }
    try {
      await createUser({
        tenantId,
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        title: form.title.trim() || undefined,
        phone_no: form.phone_no.trim() || undefined,
        department_id: form.department_id,
        role_id: form.role_id,
      }).unwrap();
      showToast({ message: 'User created.', type: 'success' });
      setIsAddOpen(false);
      setForm(emptyForm);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to create user.'), type: 'error' });
    }
  };

  const handleDeactivate = async () => {
    if (!userToDeactivate) return;
    try {
      await deactivateUser({ tenantId, userId: userToDeactivate.user_id }).unwrap();
      showToast({ message: 'User deactivated.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to deactivate user.'), type: 'error' });
    } finally {
      setUserToDeactivate(null);
    }
  };

  // No confirmation modal, unlike deactivate — restoring access is the
  // low-risk direction and the whole reason this exists: deactivating never
  // freed the user's email, so re-adding them via "Add user" 409s with
  // "already exists." This is the actual way back.
  const handleReactivate = async (user: OrgUser) => {
    try {
      await reactivateUser({ tenantId, userId: user.user_id }).unwrap();
      showToast({ message: 'User reactivated.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to reactivate user.'), type: 'error' });
    }
  };

  if (isLoading) return <Loader />;

  const columns: TableProps<UserRow>['columns'] = [
    {
      title: 'Name',
      key: 'full_name',
      sorter: (a: UserRow, b: UserRow) => a.full_name.localeCompare(b.full_name),
      render: (_: unknown, user: UserRow) => (
        <div>
          <div className="font-semibold text-gray-900">{user.full_name}</div>
          <div className="text-xs text-gray-400">{user.email}</div>
        </div>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: UserRow, b: UserRow) => (a.title ?? '').localeCompare(b.title ?? ''),
      render: (_: unknown, user: UserRow) => (
        <span className="text-gray-600 text-sm">{user.title || '—'}</span>
      ),
    },
    {
      title: 'Department',
      key: 'department',
      sorter: (a: UserRow, b: UserRow) =>
        departmentName(a.department_id).localeCompare(departmentName(b.department_id)),
      render: (_: unknown, user: UserRow) =>
        user.department_id ? (
          <Badge status="neutral" dot={false}>
            {departmentName(user.department_id)}
          </Badge>
        ) : (
          <span className="text-gray-300 text-sm">Unassigned</span>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      sorter: (a: UserRow, b: UserRow) => Number(a.is_active) - Number(b.is_active),
      render: (_: unknown, user: UserRow) => (
        <Badge status={user.is_active ? 'success' : 'neutral'}>
          {user.is_active ? 'Active' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: unknown, user: UserRow) =>
        user.is_active ? (
          <button
            type="button"
            aria-label="Deactivate user"
            className="p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
            onClick={() => setUserToDeactivate(user)}
          >
            <MdPersonOff className="text-red-500" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Reactivate user"
            className="p-2 hover:bg-green-50 rounded-full cursor-pointer transition-colors disabled:opacity-50"
            disabled={isReactivating}
            onClick={() => handleReactivate(user)}
          >
            <MdRestore className="text-green-600" />
          </button>
        ),
    },
  ];

  const dataSource: UserRow[] = filteredUsers.map((user) => ({ ...user, key: user.user_id }));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <Typography variant="body2">This company&apos;s team members.</Typography>
          <span className="text-xs font-medium text-gray-400">
            {dataSource.length} {dataSource.length === 1 ? 'user' : 'users'}
            {searchText.trim() && ` of ${users.length}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-52">
            <Input
              prefix={<MdSearch className="text-gray-400" />}
              placeholder="Search users..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Select
              appname="cfp"
              value={includeInactive}
              onChange={(value) => setIncludeInactive(value as 'active' | 'all')}
              options={[
                { label: 'Active only', value: 'active' },
                { label: 'Include deactivated', value: 'all' },
              ]}
            />
          </div>
          <Button
            className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
            onClick={() => setIsAddOpen(true)}
          >
            <MdOutlineAdd /> Add user
          </Button>
        </div>
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<UserRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={searchText.trim() ? 'No users match your search.' : 'No users yet.'}
          pagination={paginationConfig('users')}
        />
      </div>

      <AntdCommonModal open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add user">
        <div className="flex flex-col gap-4">
          <Input placeholder="Email *" type="email" {...field('email')} />
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="First name *" {...field('first_name')} />
            <Input placeholder="Last name" {...field('last_name')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Title" {...field('title')} />
            <Input placeholder="Phone number" {...field('phone_no')} />
          </div>
          <Select
            appname="cfp"
            placeholder="Department (optional)"
            value={form.department_id}
            onChange={(value) => setForm((prev) => ({ ...prev, department_id: value }))}
            options={(departments || []).map((d) => ({
              label: d.name,
              value: d.org_department_id,
            }))}
          />
          <Select
            appname="cfp"
            placeholder="Role (optional — can be assigned later)"
            value={form.role_id}
            onChange={(value) => setForm((prev) => ({ ...prev, role_id: value }))}
            options={roles.map((role) => ({
              label: role.roleName,
              value: role.id,
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full border border-gray-300 rounded-full py-2"
              onClick={() => setIsAddOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-button text-white rounded-full py-2"
              onClick={handleAdd}
              disabled={isCreating}
            >
              {isCreating ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      {userToDeactivate && (
        <ConfirmationModal
          title={`Deactivate "${userToDeactivate.full_name}"? They'll immediately lose access.`}
          confirmText="DEACTIVATE"
          isLoading={isDeactivating}
          onConfirm={handleDeactivate}
          onClose={() => setUserToDeactivate(null)}
        />
      )}
    </div>
  );
};

export default UsersPanel;
