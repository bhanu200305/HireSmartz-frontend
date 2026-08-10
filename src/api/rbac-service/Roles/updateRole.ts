import { api } from '../../index';
import type { Role, UpdateRolePayload } from '../../../types';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import { devRoleStore, DevRoleStoreError } from '../../../shared/utils/dev/devRoleStore';

export type UpdateRoleResponse = {
  data: Role;
  success: boolean;
  message: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Covers both renaming a role and replacing its permissions (baseline
    // and/or per-location overrides) — the Edit Role screen does both in
    // one save, so it's one PUT rather than two round trips.
    updateRole: build.mutation<UpdateRoleResponse, UpdateRolePayload>({
      queryFn: async ({ roleId, ...body }, _queryApi, _extraOptions, baseQuery) => {
        if (isDevAuthBypassEnabled()) {
          try {
            const role = devRoleStore.update({ roleId, ...body });
            return { data: { data: role, success: true, message: 'Role updated.' } };
          } catch (err) {
            const message =
              err instanceof DevRoleStoreError ? err.message : 'Failed to update role.';
            return { error: { status: 400, data: { message } } as any };
          }
        }

        const result = await baseQuery({ url: `/v1/roles/${roleId}`, method: 'PUT', body });
        if (result.error) return { error: result.error };
        return { data: result.data as UpdateRoleResponse };
      },
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Roles', id: 'LIST' },
        { type: 'Roles', id: roleId },
      ],
    }),
  }),
});

export const { useUpdateRoleMutation } = extendedApi;
