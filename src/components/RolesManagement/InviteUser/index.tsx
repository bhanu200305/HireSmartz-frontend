import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select as AntSelect } from 'antd';
import { MdOutlineArrowBack, MdContentCopy } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { Button, Input, showToast } from '../..';
import { Loader } from '../../shared/ui/loader';
import inviteUserSchema, { InviteUserFormValues } from './InviteUserSchema';
import { useListRolesQuery } from '../../../api/rbac-service/Roles/listRoles';
import {
  useGetInvitedUsersQuery,
  useInviteUserMutation,
} from '../../../api/rbac-service/Users/inviteUser';
import useRoleManagementContext from '../../../hooks/useRoleManagementContext';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import type { InvitedUser } from '../../../shared/utils/dev/devUserStore';

const InviteUser = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRoleId = searchParams.get('roleId');

  const { scope, tenantId } = useRoleManagementContext();
  const { data: rolesData } = useListRolesQuery({
    scope,
    ...(scope === 'tenant' && tenantId ? { tenantId } : {}),
  });
  const roles = rolesData?.data || [];

  const [inviteUser, { isLoading }] = useInviteUserMutation();
  const { data: invitedUsersData, refetch: refetchInvites } = useGetInvitedUsersQuery();
  const invitedUsers = invitedUsersData?.data || [];

  const [lastInvite, setLastInvite] = useState<InvitedUser | null>(null);

  const { register, watch, setValue, handleSubmit, reset, formState } =
    useForm<InviteUserFormValues>({
      resolver: zodResolver(inviteUserSchema),
      defaultValues: {
        firstName: '',
        lastName: '',
        email: '',
        roleId: preselectedRoleId ? Number(preselectedRoleId) : undefined,
        locationId: null,
      },
      mode: 'onChange',
    });
  const { errors, isValid } = formState;

  const roleId = watch('roleId');
  const selectedRole = roles.find((role) => role.id === roleId);

  const locationOptions = useMemo(() => selectedRole?.locationPermissions || [], [selectedRole]);

  const handleInvite = async (values: InviteUserFormValues) => {
    try {
      const result = await inviteUser(values).unwrap();
      setLastInvite(result.data);
      showToast({ message: `Invite created for ${values.email}.`, type: 'success' });
      reset({ firstName: '', lastName: '', email: '', roleId: values.roleId, locationId: null });
      refetchInvites();
    } catch (err: any) {
      showToast({ message: err?.data?.message || 'Failed to create invite.', type: 'error' });
    }
  };

  const handleCopyCredentials = (user: InvitedUser) => {
    const text = `Email: ${user.email}\nTemporary password: ${user.tempPassword}`;
    navigator.clipboard?.writeText(text);
    showToast({ message: 'Credentials copied to clipboard.', type: 'success' });
  };

  const roleNameFor = (roleIdToFind: number) =>
    roles.find((role) => role.id === roleIdToFind)?.roleName || `Role ${roleIdToFind}`;

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            aria-label="Back"
          >
            <MdOutlineArrowBack size={20} />
          </button>
          <h2 className="text-xl font-semibold">Invite User</h2>
        </div>

        {!isDevAuthBypassEnabled() && (
          <p className="text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
            Inviting users requires a connected backend, which isn&apos;t wired up yet.
          </p>
        )}

        {isDevAuthBypassEnabled() && (
          <p className="text-sm text-gray-500 mb-6">
            No email service is connected yet — creating an invite generates a temporary password
            shown on this page instead. Share it with the person directly; they can sign in with it
            right away.
          </p>
        )}

        <form onSubmit={handleSubmit(handleInvite)} className="flex flex-col gap-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First name <span className="required-asterisk">*</span>
              </label>
              <Input id="firstName" placeholder="Jane" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last name
              </label>
              <Input id="lastName" placeholder="Doe" {...register('lastName')} />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="required-asterisk">*</span>
            </label>
            <Input id="email" placeholder="jane@company.com" {...register('email')} />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="required-asterisk">*</span>
            </span>
            <AntSelect
              showSearch
              placeholder="Select a role"
              value={roleId ? String(roleId) : undefined}
              onChange={(value) => {
                setValue('roleId', Number(value), { shouldValidate: true, shouldDirty: true });
                setValue('locationId', null, { shouldDirty: true });
              }}
              className="w-full"
              options={roles.map((role) => ({ value: String(role.id), label: role.roleName }))}
              optionFilterProp="label"
            />
            {errors.roleId && <p className="text-red-500 text-sm mt-1">{errors.roleId.message}</p>}
          </div>

          {selectedRole && locationOptions.length > 0 && (
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Location
                <span className="text-gray-400 font-normal">
                  {' '}
                  — this role grants a different permission set per location
                </span>
              </span>
              <AntSelect
                allowClear
                placeholder="Baseline permissions (no specific location)"
                value={watch('locationId') ? String(watch('locationId')) : undefined}
                onChange={(value) =>
                  setValue('locationId', value ? Number(value) : null, { shouldDirty: true })
                }
                className="w-full"
                options={locationOptions.map((entry) => ({
                  value: String(entry.locationId),
                  label: entry.locationName || `Location ${entry.locationId}`,
                }))}
                optionFilterProp="label"
              />
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <Button
              appname="cancel"
              type="button"
              onClick={() => navigate(-1)}
              className="px-8 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-3xl font-medium"
            >
              CANCEL
            </Button>
            <Button
              appname="send invite"
              type="submit"
              disabled={!isValid || isLoading}
              className="px-10 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-3xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <Loader />}
              CREATE INVITE
            </Button>
          </div>
        </form>

        {lastInvite && (
          <div className="mt-8 border border-green-200 bg-green-50 rounded-lg p-5">
            <p className="font-semibold text-green-800 mb-2">
              Invite created for {lastInvite.firstName} {lastInvite.lastName || ''}
            </p>
            <p className="text-sm text-gray-700 mb-3">
              No email was actually sent — share these credentials with them directly:
            </p>
            <div className="bg-white border border-gray-200 rounded-lg p-3 font-mono text-sm flex items-center justify-between">
              <span>
                {lastInvite.email} / {lastInvite.tempPassword}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCredentials(lastInvite)}
                className="text-primary flex items-center gap-1 cursor-pointer"
              >
                <MdContentCopy size={16} /> Copy
              </button>
            </div>
          </div>
        )}

        {invitedUsers.length > 0 && (
          <div className="mt-10">
            <h3 className="text-base font-semibold text-gray-800 mb-3">Previously invited</h3>
            <div className="flex flex-col gap-y-2">
              {invitedUsers.map((user) => (
                <div
                  key={user.id}
                  className="border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {user.firstName} {user.lastName || ''}{' '}
                      <span className="text-gray-400 font-normal">({user.email})</span>
                    </p>
                    <p className="text-sm text-gray-500">{roleNameFor(user.roleId)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCredentials(user)}
                    className="text-primary flex items-center gap-1 text-sm cursor-pointer"
                  >
                    <MdContentCopy size={16} /> Copy credentials
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default InviteUser;
