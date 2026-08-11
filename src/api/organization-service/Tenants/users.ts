import { api } from '../../index';

export type TenantUserRole = 'recruiter' | 'hiring_manager';

export type InviteTenantUserRequest = {
  tenantId: string;
  email: string;
  department_id: string;
  role: TenantUserRole;
};

export type InviteTenantUserResponse = {
  invitation_id: string;
};

export type OffboardTenantUserRequest = {
  tenantId: string;
  userId: string;
};

export type OffboardTenantUserResponse = {
  status: 'offboarded' | string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    inviteTenantUser: build.mutation<InviteTenantUserResponse, InviteTenantUserRequest>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/users/invitations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TenantInvitations'],
    }),
    offboardTenantUser: build.mutation<OffboardTenantUserResponse, OffboardTenantUserRequest>({
      query: ({ tenantId, userId }) => ({
        url: `/v1/tenants/${tenantId}/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TenantInvitations'],
    }),
  }),
});

export const { useInviteTenantUserMutation, useOffboardTenantUserMutation } = extendedApi;
