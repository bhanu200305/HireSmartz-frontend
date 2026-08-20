import { orgApi } from '../orgApi';

// The only 2 roles this endpoint accepts — InviteTenantUserRequest's `role`
// is `Literal["recruiter", "hiring_manager"]` on the backend (tenants/api/
// requests.py), enforced with `extra="forbid"` on the whole request. Company
// Admin has its own separate invite path (ADMIN_ROLE_REQUIRES_INVITE); there
// is no self-serve Interviewer invite yet.
export type TenantUserRole = 'hiring_manager' | 'recruiter';

// Matches InviteTenantUserRequest's wire shape field-for-field — the request
// model rejects any key it doesn't list (extra="forbid"), so an `office_id`
// or `selected_permissions` field here would 422 the whole request rather
// than being ignored. Location/permission scoping happens later, once the
// invite is accepted and the person is a real user, via the separate "grant
// a role" flow — not at invite time.
export type InviteTenantUserRequest = {
  tenantId: string;
  email: string;
  department_id?: string;
  designation?: string;
  contact_phone?: string;
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
