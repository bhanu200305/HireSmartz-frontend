import { api } from '../../index';

export type Role = {
  id: number;
  roleName: string;
};

export type GetRolesResponse = {
  data: {
    data: Role[];
    success: boolean;
    message: string;
  };
};

type GetRolesParams = {
  isOwnerRole?: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAllRoles: build.query<GetRolesResponse, GetRolesParams>({
      query: ({ isOwnerRole }) => {
        return {
          url: '/roles/all/list',
          method: 'GET',
          params: isOwnerRole !== undefined ? { isOwnerRole } : {},
        };
      },
    }),
  }),
});

export const { useGetAllRolesQuery } = extendedApi;
