import { api } from '../../index';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import { devRoleStore, DevRoleStoreError } from '../../../shared/utils/dev/devRoleStore';

export type DeleteRoleResponse = {
  success: boolean;
  message: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    deleteRole: build.mutation<DeleteRoleResponse, { roleId: number }>({
      queryFn: async ({ roleId }, _queryApi, _extraOptions, baseQuery) => {
        if (isDevAuthBypassEnabled()) {
          try {
            devRoleStore.remove(roleId);
            return { data: { success: true, message: 'Role deleted.' } };
          } catch (err) {
            const message =
              err instanceof DevRoleStoreError ? err.message : 'Failed to delete role.';
            return { error: { status: 400, data: { message } } as any };
          }
        }

        const result = await baseQuery({ url: `/v1/roles/${roleId}`, method: 'DELETE' });
        if (result.error) return { error: result.error };
        return { data: result.data as DeleteRoleResponse };
      },
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Roles', id: 'LIST' },
        { type: 'Roles', id: roleId },
      ],
    }),
  }),
});

export const { useDeleteRoleMutation } = extendedApi;
