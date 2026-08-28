import { orgApi } from '../orgApi';

// RBAC_API.md — the only two RBAC write endpoints that exist today. There is
// deliberately no "list roles" or "list this user's assignments" endpoint
// anywhere in organization-service (confirmed against every router in the
// service, not just roles/api/routers.py) — a caller must already hold a
// `role_id` (from wherever it was minted, e.g. seeded system roles) to grant
// one, and an `assignment_id` (returned by the grant itself) to revoke one.
// Until a role/assignment catalog endpoint exists, a UI can only offer
// "grant"/"revoke" in flows that already have both ids in hand — see
// RolesManagement's "not available yet" state for the general case.
export type AssignRoleRequest = {
  user_id: string;
  role_id: string;
  /** Omit or null = every location, including ones created later. */
  location_id?: string | null;
};

export type AssignRoleResponse = {
  assignment_id: string;
  user_id: string;
  role_name: string;
  /** The user's FULL permission set after this grant, not just what was added. */
  effective_permissions: string[];
};

export type RevokeRoleResponse = {
  user_id: string;
  /** What the user retains after this specific assignment is withdrawn. */
  permissions: string[];
  from_cache: boolean;
};

export type AssignRoleAsPlatformArgs = AssignRoleRequest & { tenantId: string };

// GET /v1/platform/tenants/{tenant_id}/roles/users/{user_id}/assignments —
// the raw grant list this service never exposed before: which specific role
// this person holds, at which location, per assignment_id. Deliberately
// unjoined (no role name, no location label) — every caller already holds
// the tenant's role catalog (useRolesCatalog) and office list client-side,
// so resolving role_id -> name and location_id -> address here would be a
// second source of truth for data the client already has in hand. This is
// what makes "already holds 'vp' at Mohali" visible BEFORE a grant attempt,
// instead of only after a 409 DUPLICATE_ROLE_ASSIGNMENT — and what supplies
// a real assignment_id to revoke, for a role granted before this screen was
// ever opened.
export type UserRoleAssignment = {
  assignment_id: string;
  role_id: string;
  location_id: string | null;
};

export type ListUserRoleAssignmentsAsPlatformArgs = {
  tenantId: string;
  userId: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    assignRole: build.mutation<AssignRoleResponse, AssignRoleRequest>({
      query: (body) => ({
        url: '/v1/roles/assignments',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { user_id }) => [
        { type: 'UserPermissions', id: user_id },
        'RoleAssignments',
      ],
    }),
    revokeRole: build.mutation<RevokeRoleResponse, { assignmentId: string; userId: string }>({
      query: ({ assignmentId }) => ({
        url: `/v1/roles/assignments/${assignmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'UserPermissions', id: userId },
        'RoleAssignments',
      ],
    }),
    // Super Admin's mirror of assignRole/revokeRole above — same
    // AssignRoleUseCase/RevokeRoleUseCase (AssignRoleCommand/RevokeRoleCommand
    // already take tenant_id explicitly), just reached via
    // `/v1/platform/tenants/{tenant_id}/roles/assignments...`
    // (require_platform_permission) instead of the ambient-tenant route a
    // platform caller (no tenant of their own) could never satisfy. See
    // roles/api/platform_router.py's own module docstring.
    assignRoleAsPlatform: build.mutation<AssignRoleResponse, AssignRoleAsPlatformArgs>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/platform/tenants/${tenantId}/roles/assignments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { user_id }) => [
        { type: 'UserPermissions', id: user_id },
        'RoleAssignments',
      ],
    }),
    revokeRoleAsPlatform: build.mutation<
      RevokeRoleResponse,
      { tenantId: string; assignmentId: string; userId: string }
    >({
      query: ({ tenantId, assignmentId }) => ({
        url: `/v1/platform/tenants/${tenantId}/roles/assignments/${assignmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'UserPermissions', id: userId },
        'RoleAssignments',
      ],
    }),
    listUserRoleAssignmentsAsPlatform: build.query<
      UserRoleAssignment[],
      ListUserRoleAssignmentsAsPlatformArgs
    >({
      query: ({ tenantId, userId }) => ({
        url: `/v1/platform/tenants/${tenantId}/roles/users/${userId}/assignments`,
        method: 'GET',
      }),
      transformResponse: (response: { assignments: UserRoleAssignment[] }) => response.assignments,
      providesTags: (_result, _error, { userId }) => [
        { type: 'UserPermissions', id: userId },
        'RoleAssignments',
      ],
    }),
  }),
});

export const {
  useAssignRoleMutation,
  useRevokeRoleMutation,
  useAssignRoleAsPlatformMutation,
  useRevokeRoleAsPlatformMutation,
  useListUserRoleAssignmentsAsPlatformQuery,
} = extendedApi;
