import { orgApi } from '../orgApi';

export type TenantUserRole = 'recruiter' | 'hiring_manager';

export type InviteTenantUserRequest = {
  tenantId: string;
  email: string;
  department_id?: string;
  role: TenantUserRole;
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
