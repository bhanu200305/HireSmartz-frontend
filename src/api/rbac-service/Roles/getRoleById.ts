import { api } from '../../index';
import type { Role } from '../../../types';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import { devRoleStore } from '../../../shared/utils/dev/devRoleStore';

export type GetRoleByIdResponse = {
  data: Role;
  success: boolean;
  message: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getRoleById: build.query<GetRoleByIdResponse, { roleId: number }>({
      queryFn: async ({ roleId }, _queryApi, _extraOptions, baseQuery) => {
        if (isDevAuthBypassEnabled()) {
          const role = devRoleStore.getById(roleId);
          if (!role) {
            return { error: { status: 404, data: { message: 'Role not found.' } } as any };
          }
          return { data: { data: role, success: true, message: 'ok' } };
        }

        const result = await baseQuery({ url: `/v1/roles/${roleId}`, method: 'GET' });
        if (result.error) return { error: result.error };
        return { data: result.data as GetRoleByIdResponse };
      },
      providesTags: (_result, _error, { roleId }) => [{ type: 'Roles', id: roleId }],
    }),
  }),
});

export const { useGetRoleByIdQuery } = extendedApi;
