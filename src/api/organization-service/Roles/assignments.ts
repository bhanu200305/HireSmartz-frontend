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
  }),
});

export const { useAssignRoleMutation, useRevokeRoleMutation } = extendedApi;
