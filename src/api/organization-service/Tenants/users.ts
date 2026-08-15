import { orgApi } from '../orgApi';

// The 4 roles a tenant may invite someone as. Mirrors
// organization-service's TenantInvitableRole (tenants/api/requests.py) —
// every SystemRole except super_admin, which is platform-only and never
// assigned to a customer.
export type TenantUserRole = 'company_admin' | 'hiring_manager' | 'recruiter' | 'interviewer';

export type InviteTenantUserRequest = {
  tenantId: string;
  email: string;
  department_id?: string;
  designation?: string;
  role: TenantUserRole;
  office_id?: string;
  /** Narrows `role`'s default permission set for this one invite. Omit for
   * the role's full set. Must be a subset of that role's own permissions —
   * the backend rejects anything wider with PERMISSION_NOT_GRANTED_BY_ROLE. */
  selected_permissions?: string[];
};

export type InviteTenantUserResponse = {
  invitation_id: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    inviteTenantUser: build.mutation<InviteTenantUserResponse, InviteTenantUserRequest>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/users/invitations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TenantInvitations'],
    }),
  }),
});

export const { useInviteTenantUserMutation } = extendedApi;
