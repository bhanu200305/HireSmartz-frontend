import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select } from 'antd';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import { Button, Input, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { useInviteTenantUserMutation } from '../../../api/organization-service/Tenants/users';
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

// The only 2 roles POST /v1/tenants/{id}/users/invitations accepts — see
// InviteTeamMemberSchema.ts. Company Admin and Interviewer aren't invitable
// through this form.
const ROLE_OPTIONS = [
  { label: 'Hiring Manager', value: 'hiring_manager' },
  { label: 'Recruiter', value: 'recruiter' },
];

const InviteTeamMemberModal = ({
  open,
  tenantId,
  departments,
  onClose,
  onInvited,
}: InviteTeamMemberModalProps) => {
  const [inviteTenantUser, { isLoading }] = useInviteTenantUserMutation();

  const { control, handleSubmit, reset, formState } = useForm<InviteTeamMemberFormValues>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: {
      email: '',
      departmentId: '',
      designation: '',
      role: 'recruiter',
    },
    mode: 'onChange',
  });
  const { errors, isValid } = formState;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: InviteTeamMemberFormValues) => {
    try {
      await inviteTenantUser({
        tenantId,
        email: data.email,
        department_id: data.departmentId || undefined,
        designation: data.designation || undefined,
        role: data.role,
      }).unwrap();
      showToast({ message: `Invite sent to ${data.email}.`, type: 'success' });
      reset();
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

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
