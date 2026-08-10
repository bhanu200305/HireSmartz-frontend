import { api } from '../../index';
import type { CreateRolePayload, Role } from '../../../types';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import { devRoleStore, DevRoleStoreError } from '../../../shared/utils/dev/devRoleStore';

export type CreateRoleResponse = {
  data: Role;
  success: boolean;
  message: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    createRole: build.mutation<CreateRoleResponse, CreateRolePayload>({
      queryFn: async (body, _queryApi, _extraOptions, baseQuery) => {
        if (isDevAuthBypassEnabled()) {
          try {
            const role = devRoleStore.create(body);
            return { data: { data: role, success: true, message: 'Role created.' } };
          } catch (err) {
            const message =
              err instanceof DevRoleStoreError ? err.message : 'Failed to create role.';
            return { error: { status: 400, data: { message } } as any };
          }
        }

        const result = await baseQuery({ url: '/v1/roles', method: 'POST', body });
        if (result.error) return { error: result.error };
        return { data: result.data as CreateRoleResponse };
      },
      invalidatesTags: [{ type: 'Roles', id: 'LIST' }],
    }),
  }),
});

export const { useCreateRoleMutation } = extendedApi;
