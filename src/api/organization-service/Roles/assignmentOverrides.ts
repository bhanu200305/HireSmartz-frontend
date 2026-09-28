import { orgApi } from '../orgApi';

// PUT /v1/roles/assignments/{assignment_id}/permission-overrides — tune what
// ONE assignment grants/denies on top of its role, at ONE location.
//
// There is no "list this user's assignments" endpoint (see assignments.ts's
// own header comment), so `assignmentId` has to already be in hand — the
// only place that's true today is right after AssignRoleModal calls
// assignRole and gets one back. This mutation is meant to be used as the
// immediate follow-up step in that same flow, not as a standalone "go edit
// an old assignment" screen — that would need a backend listing endpoint
// that doesn't exist yet.
export type SetAssignmentPermissionOverridesRequest = {
  assignmentId: string;
  /** The scope this override applies at. Omit/null = wherever the
   * assignment applies (every location it covers), not every office that
   * exists today. */
  location_id?: string | null;
  /** Permissions granted here IN ADDITION to the role's own set. The caller
   * must already hold every one of these themselves. */
  granted: string[];
  /** Permissions withheld here DESPITE the role granting them. Always wins
   * over a grant for the same code. */
  denied: string[];
};

export type SetAssignmentPermissionOverridesResponse = {
  assignment_id: string;
  user_id: string;
  location_id: string | null;
  /** The user's FULL effective permission set at this location after the
   * change, not just what this override itself added/removed. */
  effective_permissions: string[];
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    setAssignmentPermissionOverrides: build.mutation<
      SetAssignmentPermissionOverridesResponse,
      SetAssignmentPermissionOverridesRequest
    >({
      query: ({ assignmentId, ...body }) => ({
        url: `/v1/roles/assignments/${assignmentId}/permission-overrides`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result) =>
        result
          ? [{ type: 'UserPermissions', id: result.user_id }, 'RoleAssignments', 'PermissionMatrix']
          : ['RoleAssignments', 'PermissionMatrix'],
    }),
  }),
});

export const { useSetAssignmentPermissionOverridesMutation } = extendedApi;
