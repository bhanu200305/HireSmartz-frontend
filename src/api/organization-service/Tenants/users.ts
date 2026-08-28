import { orgApi } from '../orgApi';

// Matches InviteTenantUserRequest's wire shape field-for-field — the request
// model rejects any key it doesn't list (extra="forbid"), so an `office_id`
// or `selected_permissions` field here would 422 the whole request rather
// than being ignored. Location/permission scoping happens later, once the
// invite is accepted and the person is a real user, via the separate "grant
// a role" flow — not at invite time.
//
// `role` is free text, not a fixed union — the backend validates it against
// this tenant's own assignable-role catalog (GET /roles: the seeded system
// roles plus any custom ones), the same list AssignRoleModal's role picker
// already reads from. A name that doesn't match anything there 422s
// (InvalidRoleForTenantError).
export type InviteTenantUserRequest = {
  tenantId: string;
  email: string;
  department_id?: string;
  designation?: string;
  contact_phone?: string;
  role: string;
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
