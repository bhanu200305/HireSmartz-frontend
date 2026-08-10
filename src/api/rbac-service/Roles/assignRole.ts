import { api } from '../../index';
import type { Authorities } from '../../../constants/authorities.constant';

// Matches RBAC_API.md: POST /v1/roles/assignments, DELETE /v1/roles/assignments/{id}.
export type AssignRoleRequest = {
  userId: string | number;
  roleId: number;
  /** Omit/null for "every location". */
  locationId?: number | null;
};

export type AssignRoleResponse = {
  assignmentId: number;
  userId: string | number;
  roleName: string;
  effectivePermissions: Authorities[];
};

export type RevokeRoleAssignmentResponse = {
  userId: string | number;
  permissions: Authorities[];
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    assignRole: build.mutation<AssignRoleResponse, AssignRoleRequest>({
      query: (body) => ({
        url: '/v1/roles/assignments',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Roles', id: 'LIST' }],
    }),
    revokeRoleAssignment: build.mutation<RevokeRoleAssignmentResponse, { assignmentId: number }>({
      query: ({ assignmentId }) => ({
        url: `/v1/roles/assignments/${assignmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Roles', id: 'LIST' }],
    }),
  }),
});

export const { useAssignRoleMutation, useRevokeRoleAssignmentMutation } = extendedApi;
