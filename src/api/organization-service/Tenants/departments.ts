import { orgApi } from '../orgApi';

// TenantDepartmentSummaryView — GET /v1/tenants/{tenant_id}/departments row shape.
export type TenantDepartment = {
  org_department_id: string;
  name: string;
  office_id: string | null;
};

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
  status?: string;
  error_code?: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listTenantDepartments: build.query<TenantDepartment[], string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/departments`,
      transformResponse: (response: { departments: TenantDepartment[] }) => response.departments,
      providesTags: (_result, _error, tenantId) => [{ type: 'TenantDepartments', id: tenantId }],
    }),
    addTenantDepartment: build.mutation<AddTenantDepartmentResponse, AddTenantDepartmentRequest>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/departments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantDepartments', id: tenantId },
      ],
    }),
    // Backend does not yet check for active jobs/candidates before deleting
    // (organization-service docs/PROGRESS.md: DEPARTMENT_HAS_ACTIVE_JOBS is a
    // known, flagged gap) — the caller must show a stronger "are you sure"
    // prompt than office deletion, per docs/frontend_guide.txt.
    deleteTenantDepartment: build.mutation<
      DeleteTenantDepartmentResponse,
      DeleteTenantDepartmentRequest
    >({
      query: ({ tenantId, departmentId }) => ({
        url: `/v1/tenants/${tenantId}/departments/${departmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantDepartments', id: tenantId },
      ],
    }),
  }),
});

export const {
  useListTenantDepartmentsQuery,
  useAddTenantDepartmentMutation,
  useDeleteTenantDepartmentMutation,
} = extendedApi;
