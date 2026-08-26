import { orgApi } from '../orgApi';

// GET /v1/tenants/{tenant_id}/invitations/suppressed — this tenant's own
// invited addresses now bounced/suppressed. Tenant-scoped (`require_own_tenant`),
// same principal as everything else in Tenants/*.
export type SuppressedInviteAddress = {
  recipient: string;
  reason: string;
  suppressed_at: string;
};

export type ListSuppressedInviteAddressesResponse = {
  addresses: SuppressedInviteAddress[];
  total: number;
};

// GET /v1/tenants/{tenant_id}/users/recently-offboarded — team members most
// recently offboarded from this tenant.
export type OffboardedMember = {
  user_id: string;
  full_name: string;
  email: string;
  offboarded_by: string;
  offboarded_at: string | null;
};

export type ListRecentlyOffboardedMembersResponse = {
  members: OffboardedMember[];
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listSuppressedInviteAddresses: build.query<ListSuppressedInviteAddressesResponse, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/invitations/suppressed`,
      providesTags: (_result, _error, tenantId) => [{ type: 'TenantInvitations', id: tenantId }],
    }),
    listRecentlyOffboardedMembers: build.query<ListRecentlyOffboardedMembersResponse, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/users/recently-offboarded`,
      providesTags: (_result, _error, tenantId) => [{ type: 'OrgUsers', id: tenantId }],
    }),
  }),
});

export const { useListSuppressedInviteAddressesQuery, useListRecentlyOffboardedMembersQuery } =
  extendedApi;
