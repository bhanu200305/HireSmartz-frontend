import { orgApi } from '../orgApi';
import type { TenantDepartment } from '../Tenants/departments';

// Super Admin's platform-mounted mirror of Tenants/departments.ts — same
// request/response shapes, tenant bound from the path. Tenant-side only ever
// exposes list/add/delete (no update), so this matches that same surface
// rather than the wider CRUD the backend route technically supports.
export type AddPlatformTenantDepartmentRequest = {
  tenantId: string;
  department_name: string;
  office_id?: string;
};

export type AddPlatformTenantDepartmentResponse = {
  org_department_id: string;
};

export type DeletePlatformTenantDepartmentRequest = {
  tenantId: string;
  departmentId: string;
};

const departmentsBasePath = (tenantId: string): string =>
  `/v1/platform/tenants/${tenantId}/departments`;

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformTenantDepartments: build.query<TenantDepartment[], string>({
      query: (tenantId) => departmentsBasePath(tenantId),
      transformResponse: (response: { departments: TenantDepartment[] }) => response.departments,
      providesTags: (_result, _error, tenantId) => [
        { type: 'TenantDepartments', id: `platform-${tenantId}` },
      ],
    }),
    addPlatformTenantDepartment: build.mutation<
      AddPlatformTenantDepartmentResponse,
      AddPlatformTenantDepartmentRequest
    >({
      query: ({ tenantId, ...body }) => ({
        url: departmentsBasePath(tenantId),
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantDepartments', id: `platform-${tenantId}` },
      ],
    }),
    deletePlatformTenantDepartment: build.mutation<void, DeletePlatformTenantDepartmentRequest>({
      query: ({ tenantId, departmentId }) => ({
        url: `${departmentsBasePath(tenantId)}/${departmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantDepartments', id: `platform-${tenantId}` },
      ],
    }),
  }),
});

export const {
  useListPlatformTenantDepartmentsQuery,
  useAddPlatformTenantDepartmentMutation,
  useDeletePlatformTenantDepartmentMutation,
} = extendedApi;
