import { api } from '../../index';

export type AddTenantDepartmentRequest = {
  tenantId: string;
  department_name: string;
  office_id?: string;
};

export type AddTenantDepartmentResponse = {
  org_department_id: string;
};

export type DeleteTenantDepartmentRequest = {
  tenantId: string;
  departmentId: string;
};

export type DeleteTenantDepartmentResponse = {
  error_code?: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    addTenantDepartment: build.mutation<AddTenantDepartmentResponse, AddTenantDepartmentRequest>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/departments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TenantDepartments'],
    }),
    deleteTenantDepartment: build.mutation<
      DeleteTenantDepartmentResponse,
      DeleteTenantDepartmentRequest
    >({
      query: ({ tenantId, departmentId }) => ({
        url: `/v1/tenants/${tenantId}/departments/${departmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TenantDepartments'],
    }),
  }),
});

export const { useAddTenantDepartmentMutation, useDeleteTenantDepartmentMutation } = extendedApi;
