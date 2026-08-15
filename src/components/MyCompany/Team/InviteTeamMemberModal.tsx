import { useEffect, useState } from 'react';
import { Checkbox, Select } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import { Button, Input, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { useInviteTenantUserMutation } from '../../../api/organization-service/Tenants/users';
import { useListTenantOfficesQuery } from '../../../api/organization-service/Tenants/offices';
import { useListRolesQuery } from '../../../api/organization-service/Roles/roles';
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

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'company_admin' },
  { label: 'Hiring Manager', value: 'hiring_manager' },
  { label: 'Recruiter', value: 'recruiter' },
  { label: 'Interviewer', value: 'interviewer' },
];

const InviteTeamMemberModal = ({
  open,
  tenantId,
  departments,
  onClose,
  onInvited,
}: InviteTeamMemberModalProps) => {
  const [inviteTenantUser, { isLoading }] = useInviteTenantUserMutation();
  const { data: offices } = useListTenantOfficesQuery(tenantId, { skip: !open });
  const { data: roles } = useListRolesQuery(undefined, { skip: !open });
  const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');

  const { control, handleSubmit, reset, watch, setValue, formState } =
    useForm<InviteTeamMemberFormValues>({
      resolver: zodResolver(inviteTeamMemberSchema),
      defaultValues: {
        email: '',
        departmentId: '',
        designation: '',
        officeId: '',
        role: 'recruiter',
        selectedPermissions: [],
      },
      mode: 'onChange',
    });
  const { errors, isValid } = formState;
  const selectedRole = watch('role');
  const selectedPermissions = watch('selectedPermissions');

  // The role a Company Admin picks is a NAME, not an id (matches the wire
  // contract) — GET /roles already returns every system role's `name` in
  // that same shape ('company_admin', 'hiring_manager', ...), so matching
  // on it directly needs no extra lookup table.
  const rolePermissions = roles?.find((role) => role.name === selectedRole)?.permissions ?? [];

  // Every permission checked by default whenever the role changes — the
  // common case is "the role's full set, unnarrowed" (see
  // InviteTenantUserInput.selected_permissions on the backend); the admin
  // then unchecks whatever this one person shouldn't have.
  useEffect(() => {
    setValue('selectedPermissions', rolePermissions, { shouldValidate: true });
    // rolePermissions is derived from `roles` + `selectedRole` each render;
    // depending on `selectedRole` (and `roles` loading in) is what should
    // actually re-trigger this, not the derived array's own identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, roles, setValue]);

  const togglePermission = (permission: string, checked: boolean) => {
    const next = checked
      ? [...selectedPermissions, permission]
      : selectedPermissions.filter((p) => p !== permission);
    setValue('selectedPermissions', next, { shouldValidate: true });
  };

  const handleClose = () => {
    reset();
    setActiveTab('details');
    onClose();
  };

  const onSubmit = async (data: InviteTeamMemberFormValues) => {
    try {
      await inviteTenantUser({
        tenantId,
        email: data.email,
        department_id: data.departmentId || undefined,
        designation: data.designation || undefined,
        office_id: data.officeId || undefined,
        role: data.role,
        selected_permissions: data.selectedPermissions,
      }).unwrap();
      showToast({ message: `Invite sent to ${data.email}.`, type: 'success' });
      reset();
      setActiveTab('details');
      onInvited();
    } catch (error: unknown) {
      showToast({
        message: getOrgErrorMessage(error, 'Failed to send invite. Please try again.'),
        type: 'error',
      });
    }
  };

  return (
    <AntdCommonModal open={open} onClose={handleClose} title="Invite Team Member">
      {isLoading && <Loader />}

      <div className="mb-4 flex rounded-full bg-gray-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex-1 rounded-full py-1.5 cursor-pointer transition-all ${
            activeTab === 'details' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
          }`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={`flex-1 rounded-full py-1.5 cursor-pointer transition-all ${
            activeTab === 'permissions' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
          }`}
        >
          Permissions ({selectedPermissions.length}/{rolePermissions.length})
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {activeTab === 'details' ? (
          <>
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
                    {...field}
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
                    className="w-full mt-1"
                    placeholder="Select department"
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
              <label htmlFor="inviteLocation" className="text-sm text-gray-600">
                Location <span className="text-gray-400">(optional)</span>
              </label>
              <Controller
                name="officeId"
                control={control}
                render={({ field }) => (
                  <Select
                    id="inviteLocation"
                    {...field}
                    onChange={field.onChange}
                    allowClear
                    className="w-full mt-1"
                    placeholder="Applies everywhere if left blank"
                    options={(offices || []).map((office) => ({
                      label: office.city,
                      value: office.office_id,
                    }))}
                  />
                )}
              />
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
                    className="w-full mt-1"
                    options={ROLE_OPTIONS}
                  />
                )}
              />
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              What this person can do{' '}
              {watch('officeId')
                ? 'at the selected location'
                : 'everywhere, unless you pick a location'}
              . Starts as every permission the role carries — uncheck anything this one person
              shouldn&apos;t have.
            </p>
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto border rounded-xl p-3">
              {rolePermissions.length === 0 && (
                <p className="text-sm text-gray-400">
                  {roles ? 'This role carries no permissions.' : 'Loading permissions…'}
                </p>
              )}
              {rolePermissions.map((permission) => (
                <Checkbox
                  key={permission}
                  checked={selectedPermissions.includes(permission)}
                  onChange={(e) => togglePermission(permission, e.target.checked)}
                >
                  <span className="font-mono text-sm">{permission}</span>
                </Checkbox>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <Button
            type="button"
            appname="cancel invite"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full bg-white border text-black rounded-3xl py-2.5"
          >
            CANCEL
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
    </AntdCommonModal>
  );
};

export default InviteTeamMemberModal;
