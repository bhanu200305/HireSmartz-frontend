import { orgApi } from '../orgApi';
import { noContentResponseHandler } from '../../authentication-service/authApi';
import type { InvitationSummary } from '../Tenants/teamInvitations';

// Super Admin's platform-mounted mirror of Tenants/teamInvitations.ts — same
// request/response shapes as GET/POST /v1/tenants/{tenant_id}/invitations,
// tenant bound from the path instead of the caller's own token. Same pattern
// as usersBasePath in ./users.ts and departmentsBasePath in ./departments.ts.
//
// This is what lets UsersPanel show a bulk-imported roster row as "Pending"
// the moment its invite is sent, rather than only once it's accepted and a
// real User row exists — see UsersPanel.tsx's pendingRows.
export type ListPlatformTenantInvitationsArgs = {
  tenantId: string;
  limit?: number;
  offset?: number;
};

export type ListPlatformTenantInvitationsResponse = {
  invitations: InvitationSummary[];
  total: number;
};

const invitationsBasePath = (tenantId: string): string =>
  `/v1/platform/tenants/${tenantId}/invitations`;

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformTenantInvitations: build.query<
      ListPlatformTenantInvitationsResponse,
      ListPlatformTenantInvitationsArgs
    >({
      query: ({ tenantId, limit = 50, offset = 0 }) => ({
        url: invitationsBasePath(tenantId),
        params: { limit, offset },
      }),
      providesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantInvitations', id: `platform-${tenantId}` },
      ],
    }),
    // Both 204 No Content — pushes the expiry out another 48 hours (resend)
    // or cancels the invite outright (revoke). Neither returns a body.
    resendPlatformTenantInvitation: build.mutation<
      undefined,
      { tenantId: string; invitationId: string }
    >({
      query: ({ tenantId, invitationId }) => ({
        url: `${invitationsBasePath(tenantId)}/${invitationId}/resend`,
        method: 'POST',
        responseHandler: noContentResponseHandler,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantInvitations', id: `platform-${tenantId}` },
      ],
    }),
    revokePlatformTenantInvitation: build.mutation<
      undefined,
      { tenantId: string; invitationId: string }
    >({
      query: ({ tenantId, invitationId }) => ({
        url: `${invitationsBasePath(tenantId)}/${invitationId}/revoke`,
        method: 'POST',
        responseHandler: noContentResponseHandler,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantInvitations', id: `platform-${tenantId}` },
      ],
    }),
  }),
});

export const {
  useListPlatformTenantInvitationsQuery,
  useResendPlatformTenantInvitationMutation,
  useRevokePlatformTenantInvitationMutation,
} = extendedApi;
