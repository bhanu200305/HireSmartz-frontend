import { orgApi } from '../orgApi';
import { noContentResponseHandler } from '../../authentication-service/authApi';

export type InvitationSummary = {
  invitation_id: string;
  invited_email: string;
  role: string;
  status: string;
  expires_at: string;
  department_id: string | null;
  designation_id: string | null;
};

export type ListTenantInvitationsArgs = {
  tenantId: string;
  limit?: number;
  offset?: number;
};

export type ListTenantInvitationsResponse = {
  invitations: InvitationSummary[];
  total: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listTenantInvitations: build.query<ListTenantInvitationsResponse, ListTenantInvitationsArgs>({
      query: ({ tenantId, limit = 50, offset = 0 }) => ({
        url: `/v1/tenants/${tenantId}/invitations`,
        params: { limit, offset },
      }),
      providesTags: ['TenantInvitations'],
    }),
    // Both 204 No Content — pushes the expiry out another 48 hours (resend)
    // or cancels the invite outright (revoke). Neither returns a body.
    resendTenantInvitation: build.mutation<undefined, { tenantId: string; invitationId: string }>({
      query: ({ tenantId, invitationId }) => ({
        url: `/v1/tenants/${tenantId}/invitations/${invitationId}/resend`,
        method: 'POST',
        responseHandler: noContentResponseHandler,
      }),
      invalidatesTags: ['TenantInvitations'],
    }),
    revokeTenantInvitation: build.mutation<undefined, { tenantId: string; invitationId: string }>({
      query: ({ tenantId, invitationId }) => ({
        url: `/v1/tenants/${tenantId}/invitations/${invitationId}/revoke`,
        method: 'POST',
        responseHandler: noContentResponseHandler,
      }),
      invalidatesTags: ['TenantInvitations'],
    }),
  }),
});

export const {
  useListTenantInvitationsQuery,
  useResendTenantInvitationMutation,
  useRevokeTenantInvitationMutation,
} = extendedApi;
