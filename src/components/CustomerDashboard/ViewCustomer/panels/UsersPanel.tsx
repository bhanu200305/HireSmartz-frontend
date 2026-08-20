import React, { useState } from 'react';
import { MdOutlineAdd, MdPersonOff } from 'react-icons/md';
import { Button, Input, Select, Typography, showToast } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import { Badge } from '../../../shared/ui/badge';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import {
  useListPlatformTenantUsersQuery,
  useCreatePlatformTenantUserMutation,
  useDeactivatePlatformTenantUserMutation,
} from '../../../../api/organization-service/Platform/users';
import { useListPlatformTenantDepartmentsQuery } from '../../../../api/organization-service/Platform/departments';
import { useRolesCatalog } from '../../../../hooks/useRolesCatalog';
import type { OrgUser } from '../../../../api/organization-service/Users/users';
import { getOrgErrorMessage } from '../../../../shared/utils/auth/orgError.helpers';

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

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [userToDeactivate, setUserToDeactivate] = useState<OrgUser | null>(null);

  const field = (key: keyof FormState) => ({
    value: form[key] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

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

  const users = data?.items ?? [];

  if (isLoading) return <Loader />;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <Typography variant="h5">Users</Typography>
        <div className="flex items-center gap-3">
          <Select
            appname="cfp"
            value={includeInactive}
            onChange={(value) => setIncludeInactive(value as 'active' | 'all')}
            className="w-40"
            options={[
              { label: 'Active only', value: 'active' },
              { label: 'Include deactivated', value: 'all' },
            ]}
          />
          <Button
            className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1"
            onClick={() => setIsAddOpen(true)}
          >
            <MdOutlineAdd /> Add user
          </Button>
        </div>
      </div>

      {!users.length ? (
        <div className="p-6 text-gray-500 text-center border border-dashed rounded-xl">
          No users yet.
        </div>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {users.map((user) => (
            <div key={user.user_id} className="flex items-center justify-between p-4 gap-3">
              <div>
                <Typography variant="body1">{user.full_name}</Typography>
                <Typography variant="caption">{user.email}</Typography>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={user.is_active ? 'success' : 'neutral'}>
                  {user.is_active ? 'Active' : 'Deactivated'}
                </Badge>
                {user.is_active && (
                  <button
                    type="button"
                    aria-label="Deactivate user"
                    className="p-2 hover:bg-gray-100 rounded-full"
                    onClick={() => setUserToDeactivate(user)}
                  >
                    <MdPersonOff className="text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
