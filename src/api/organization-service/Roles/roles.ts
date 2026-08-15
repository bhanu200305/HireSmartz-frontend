import { orgApi } from '../orgApi';

// RoleResponse — GET /v1/roles row shape. Covers both the 5 platform-shipped
// system roles (super_admin, company_admin, hiring_manager, recruiter,
// interviewer — is_system_role: true) every tenant can see, and any custom
// role this tenant created for itself.
export type Role = {
  role_id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  permissions: string[];
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listRoles: build.query<Role[], void>({
      query: () => '/v1/roles',
      transformResponse: (response: { roles: Role[] }) => response.roles,
      providesTags: ['Roles'],
    }),
  }),
});

export const { useListRolesQuery } = extendedApi;
