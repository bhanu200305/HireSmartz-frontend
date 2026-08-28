import { orgApi } from '../orgApi';

// TenantDepartmentSummaryView — GET /v1/tenants/{tenant_id}/departments row shape.
export type TenantDepartment = {
  org_department_id: string;
  name: string;
  office_id: string | null;
};

export type ListTenantDepartmentsArgs = {
  tenantId: string;
  /**
   * True for a platform Super Admin with no `tenant_id` on the token.
   * `GET /v1/tenants/{id}/departments` requires a tenant user; the platform
   * mirror is `GET /v1/platform/tenants/{id}/departments`.
   */
  isMaster?: boolean;
};

type ListTenantDepartmentsQueryArg = string | ListTenantDepartmentsArgs;

export type AddTenantDepartmentRequest = {
  tenantId: string;
  department_name: string;
  office_id?: string;
  isMaster?: boolean;
};

export type AddTenantDepartmentResponse = {
  org_department_id: string;
};

export type DeleteTenantDepartmentRequest = {
  tenantId: string;
  departmentId: string;
  isMaster?: boolean;
};

export type DeleteTenantDepartmentResponse = {
  status?: string;
  error_code?: string;
};

export type UpdateTenantDepartmentRequest = {
  tenantId: string;
  departmentId: string;
  department_name?: string;
  office_id?: string | null;
  isMaster?: boolean;
};

const toDepartmentsArgs = (arg: ListTenantDepartmentsQueryArg): ListTenantDepartmentsArgs =>
  typeof arg === 'string' ? { tenantId: arg } : arg;

const departmentsBasePath = ({ tenantId, isMaster }: ListTenantDepartmentsArgs): string =>
  isMaster ? `/v1/platform/tenants/${tenantId}/departments` : `/v1/tenants/${tenantId}/departments`;

const unwrapDepartments = (
  response: { departments?: TenantDepartment[] } | TenantDepartment[]
): TenantDepartment[] => (Array.isArray(response) ? response : (response.departments ?? []));

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listTenantDepartments: build.query<TenantDepartment[], ListTenantDepartmentsQueryArg>({
      query: (arg) => departmentsBasePath(toDepartmentsArgs(arg)),
      transformResponse: unwrapDepartments,
      providesTags: (_result, _error, arg) => [
        { type: 'TenantDepartments', id: toDepartmentsArgs(arg).tenantId },
      ],
    }),
    addTenantDepartment: build.mutation<AddTenantDepartmentResponse, AddTenantDepartmentRequest>({
      query: ({ tenantId, isMaster, department_name, office_id }) => ({
        url: departmentsBasePath({ tenantId, isMaster }),
        method: 'POST',
        body: { department_name, office_id },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantDepartments', id: tenantId },
      ],
    }),
    updateTenantDepartment: build.mutation<TenantDepartment, UpdateTenantDepartmentRequest>({
      query: ({ tenantId, departmentId, isMaster, department_name, office_id }) => ({
        url: `${departmentsBasePath({ tenantId, isMaster })}/${departmentId}`,
        method: 'PATCH',
        body: { department_name, office_id },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantDepartments', id: tenantId },
      ],
    }),
    deleteTenantDepartment: build.mutation<
      DeleteTenantDepartmentResponse,
      DeleteTenantDepartmentRequest
    >({
      query: ({ tenantId, departmentId, isMaster }) => ({
        url: `${departmentsBasePath({ tenantId, isMaster })}/${departmentId}`,
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
  useUpdateTenantDepartmentMutation,
  useDeleteTenantDepartmentMutation,
} = extendedApi;
