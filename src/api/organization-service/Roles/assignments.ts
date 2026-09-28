import { orgApi } from '../orgApi';

// RBAC_API.md. organization-service now also exposes
// GET /v1/roles/users/{user_id}/assignments (needs user:read) — the tenant
// mirror of the platform-only `listUserRoleAssignmentsAsPlatform` below, same
// response shape. That's what lets a UI show a user's CURRENT role(s) with a
// Remove action, and what makes "change a role" mean "revoke the old
// assignment, then grant the new one" instead of only ever adding a second
// one (see EditOrgUser and AssignRoleModal, both of which resolve each
// returned `role_id` against `useListRolesQuery` rather than a second,
// redundant name/location join here).
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

export type ListUserRoleAssignmentsArgs = {
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
      // 'OrgUsers' included so the users list's `role` column (and this
      // user's own profile Role field) stop showing the stale role until a
      // manual reload — previously missing here, so a grant/revoke never
      // invalidated it.
      invalidatesTags: (_result, _error, { user_id }) => [
        { type: 'UserPermissions', id: user_id },
        'RoleAssignments',
        'OrgUsers',
        'PermissionMatrix',
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
        'OrgUsers',
        'PermissionMatrix',
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
        'PermissionMatrix',
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
        'PermissionMatrix',
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
    // GET /v1/roles/users/{user_id}/assignments — the tenant-session mirror
    // of the platform version above, same response shape (see this file's
    // header comment). Needs user:read.
    listUserRoleAssignments: build.query<UserRoleAssignment[], ListUserRoleAssignmentsArgs>({
      query: ({ userId }) => ({
        url: `/v1/roles/users/${userId}/assignments`,
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
  useListUserRoleAssignmentsQuery,
} = extendedApi;
