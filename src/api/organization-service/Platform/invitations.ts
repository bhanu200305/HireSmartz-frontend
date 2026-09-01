import { orgApi } from '../orgApi';
import type { InvitationSummary } from '../Tenants/teamInvitations';

// Platform mirror of Tenants/teamInvitations.ts's listTenantInvitations —
// same InvitationSummaryView/ListInvitationsView shapes (tenants/api/
// platform_router.py's list_tenant_invitations_as_platform reuses the exact
// same ListTenantInvitationsUseCase, just resolving tenant_id from the path
// instead of require_own_tenant), mounted under
// /v1/platform/tenants/{tenant_id}/invitations so a Super Admin can see a
// tenant's pending invites (including ones a bulk import just created)
// regardless of who owns the tenant.
export type ListPlatformTenantInvitationsArgs = {
  tenantId: string;
  limit?: number;
  offset?: number;
};

export type ListPlatformTenantInvitationsResponse = {
  invitations: InvitationSummary[];
  total: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformTenantInvitations: build.query<
      ListPlatformTenantInvitationsResponse,
      ListPlatformTenantInvitationsArgs
    >({
      query: ({ tenantId, limit = 50, offset = 0 }) => ({
        url: `/v1/platform/tenants/${tenantId}/invitations`,
        params: { limit, offset },
      }),
      providesTags: ['TenantInvitations'],
    }),
  }),
});

export const { useListPlatformTenantInvitationsQuery } = extendedApi;
