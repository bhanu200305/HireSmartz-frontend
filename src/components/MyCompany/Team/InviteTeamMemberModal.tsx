import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select } from 'antd';
import { FaPlus } from 'react-icons/fa';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import { Button, Input, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import CreateRoleModal from '../../RolesManagement/CreateRoleModal';
import { useInviteTenantUserMutation } from '../../../api/organization-service/Tenants/users';
import {
  useListTenantOfficesQuery,
  officeDisplayName,
} from '../../../api/organization-service/Tenants/offices';
import useRolesCatalog from '../../../hooks/useRolesCatalog';
import useHasAccess from '../../../hooks/useHasAccess';
import { Authorities } from '../../../constants/authorities.constant';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { inviteTeamMemberSchema, type InviteTeamMemberFormValues } from './InviteTeamMemberSchema';

type DepartmentOption = { id: string; name: string };

type InviteTeamMemberModalProps = {
  open: boolean;
  tenantId: string;
  departments: DepartmentOption[];
  onClose: () => void;
  onInvited: () => void;
};

/**
 * Thin wrapper — AntdCommonModal renders nothing while closed, so the form
 * below (and its roles/offices fetches) only mount once the modal is
 * actually opened. That's the same "don't fetch before the Team tab needs
 * it" laziness the old `skip: !open` on the roles query gave us, kept now
 * that the role catalog comes from useRolesCatalog (which has no skip arg).
 */
const InviteTeamMemberModal = ({
  open,
  tenantId,
  departments,
  onClose,
  onInvited,
}: InviteTeamMemberModalProps) => (
  <AntdCommonModal open={open} onClose={onClose} title="Invite Team Member">
    <InviteTeamMemberForm
      tenantId={tenantId}
      departments={departments}
      onClose={onClose}
      onInvited={onInvited}
    />
  </AntdCommonModal>
);

type InviteTeamMemberFormProps = Omit<InviteTeamMemberModalProps, 'open'>;

const InviteTeamMemberForm = ({
  tenantId,
  departments,
  onClose,
  onInvited,
}: InviteTeamMemberFormProps) => {
  const [inviteTenantUser, { isLoading }] = useInviteTenantUserMutation();
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const canCreateRole = useHasAccess(Authorities.ROLE_CREATE);

  // Same catalog the Roles & Permissions screen and AssignRoleModal read
  // from (GET /v1/roles) — this tenant's assignable system roles plus any
  // custom ones it's created — and the same `createRole` those screens use.
  // A role defined right here via "+ Custom Role" is identical to one made
  // on the Roles & Permissions page and is selected the moment it's created,
  // so there's no trip over to that page and back just to add a new hire on
  // a role that doesn't exist yet.
  const {
    roles,
    isLoading: isLoadingRoles,
    createRole,
    isForbidden: rolesForbidden,
  } = useRolesCatalog({ scope: 'tenant', tenantId, isMaster: false });

  // Offices feed the Create Role wizard's optional per-location permission
  // overrides (its Step 2) — not fetched unless the user can create a role.
  const { data: offices } = useListTenantOfficesQuery({ tenantId }, { skip: !canCreateRole });
  const availableLocations = (offices ?? []).map((office) => ({
    id: office.office_id,
    name: officeDisplayName(office),
  }));

  const { control, handleSubmit, setValue, formState } = useForm<InviteTeamMemberFormValues>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: {
      name: '',
      email: '',
      departmentId: '',
      designation: '',
      role: '',
    },
    mode: 'onChange',
  });
  const { errors, isValid } = formState;

  const onSubmit = async (data: InviteTeamMemberFormValues) => {
    try {
      await inviteTenantUser({
        tenantId,
        email: data.email,
        name: data.name,
        department_id: data.departmentId || undefined,
        designation: data.designation || undefined,
        role: data.role,
      }).unwrap();
      showToast({ message: `Invite sent to ${data.email}.`, type: 'success' });
      onInvited();
    } catch (error: unknown) {
      showToast({
        message: getOrgErrorMessage(error, 'Failed to send invite. Please try again.'),
        type: 'error',
      });
    }
  };

  return (
    <>
      {isLoading && <Loader />}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="inviteName" className="text-sm text-gray-600">
            Name <span className="required-asterisk">*</span>
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                id="inviteName"
                {...field}
                maxLength={200}
                placeholder="Jordan Lee"
                className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                error={errors.name?.message}
              />
            )}
          />
        </div>

        <div>
          <label htmlFor="inviteEmail" className="text-sm text-gray-600">
            Email <span className="required-asterisk">*</span>
          </label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                id="inviteEmail"
                type="email"
                noAutoCapitalize
                {...field}
                maxLength={320}
                placeholder="recruiter@acme.com"
                className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                error={errors.email?.message}
              />
            )}
          />
        </div>

        <div>
          <label htmlFor="inviteDesignation" className="text-sm text-gray-600">
            Designation <span className="text-gray-400">(optional)</span>
          </label>
          <Controller
            name="designation"
            control={control}
            render={({ field }) => (
              <Input
                id="inviteDesignation"
                {...field}
                maxLength={120}
                placeholder="Senior Recruiter"
                className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              />
            )}
          />
        </div>

        <div>
          <label htmlFor="inviteDepartment" className="text-sm text-gray-600">
            Department <span className="text-gray-400">(optional)</span>
          </label>
          <Controller
            name="departmentId"
            control={control}
            render={({ field }) => (
              <Select
                id="inviteDepartment"
                {...field}
                onChange={field.onChange}
                allowClear
                showSearch
                optionFilterProp="label"
                className="w-full mt-1"
                placeholder="Select Department"
                options={departments.map((department) => ({
                  label: department.name,
                  value: String(department.id),
                }))}
              />
            )}
          />
          {errors.departmentId && (
            <p className="text-red-500 text-sm px-2 py-1">{errors.departmentId.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="inviteRole" className="text-sm text-gray-600">
            Role <span className="required-asterisk">*</span>
          </label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select
                id="inviteRole"
                {...field}
                onChange={field.onChange}
                loading={isLoadingRoles}
                placeholder="Select a Role"
                showSearch
                optionFilterProp="label"
                className="w-full mt-1"
                disabled={rolesForbidden}
                notFoundContent={
                  rolesForbidden ? "You don't have permission to view roles." : undefined
                }
                options={roles.map((role) => ({ label: role.roleName, value: role.roleName }))}
              />
            )}
          />
          {rolesForbidden && (
            <p className="mt-1 text-xs text-red-500">
              You don&apos;t have permission to view roles, so none can be picked here. Ask an admin
              to grant role-read access.
            </p>
          )}
          {canCreateRole && (
            <button
              type="button"
              onClick={() => setIsCreateRoleOpen(true)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 border border-primary-200 rounded-full px-3 py-1.5 hover:bg-primary-50 cursor-pointer"
            >
              <FaPlus size={9} /> Custom Role
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Button
            type="button"
            appname="cancel invite"
            onClick={onClose}
            disabled={isLoading}
            className="w-full bg-white border text-black rounded-3xl py-2.5"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            appname="send invite"
            disabled={!isValid || isLoading}
            className="w-full text-white bg-[var(--color-primary)] rounded-3xl py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending…' : 'Send Invite'}
          </Button>
        </div>
      </form>

      {canCreateRole && (
        <CreateRoleModal
          open={isCreateRoleOpen}
          onClose={() => setIsCreateRoleOpen(false)}
          scope="tenant"
          tenantId={tenantId}
          availableLocations={availableLocations}
          roles={roles}
          onCreate={async (payload) => {
            const created = await createRole(payload);
            // Same "select it the moment it's created" behaviour as the
            // platform-side InvitePlatformMemberModal and the tenant-side
            // RoleLocationPicker — no second trip back to this dropdown to
            // find and pick what was just made.
            setValue('role', created.roleName, { shouldValidate: true, shouldDirty: true });
            return created;
          }}
        />
      )}
    </>
  );
};

export default InviteTeamMemberModal;
