import { orgApi } from '../orgApi';

// TenantDepartmentSummaryView — GET /v1/tenants/{tenant_id}/departments row shape.
export type TenantDepartment = {
  org_department_id: string;
  name: string;
  office_id: string | null;
  is_active: boolean;
};

export type ListTenantDepartmentsArgs = {
  tenantId: string;
  /**
   * True for a platform Super Admin with no `tenant_id` on the token.
   * `GET /v1/tenants/{id}/departments` requires a tenant user; the platform
   * mirror is `GET /v1/platform/tenants/{id}/departments`.
   */
  isMaster?: boolean;
  /** Include deactivated departments - off by default. */
  includeInactive?: boolean;
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

// A department's OWN `office_id` above is its single primary office — this
// is a separate, additive relationship: every OTHER office the department
// also operates out of. GET /v1/tenants/{tenant_id}/departments/{department_id}/offices
// row shape.
export type TenantDepartmentOffice = {
  office_id: string;
  location_code: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string | null;
  country: string;
  zip_code: string | null;
};

export type ListTenantDepartmentOfficesArgs = {
  tenantId: string;
  departmentId: string;
  isMaster?: boolean;
};

export type TenantDepartmentOfficeMutationArgs = {
  tenantId: string;
  departmentId: string;
  officeId: string;
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
      query: (arg) => {
        const { includeInactive, ...rest } = toDepartmentsArgs(arg);
        return {
          url: departmentsBasePath(rest),
          params: includeInactive ? { include_inactive: true } : undefined,
        };
      },
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
    deactivateTenantDepartment: build.mutation<
      void,
      { tenantId: string; departmentId: string; isMaster?: boolean }
    >({
      query: ({ tenantId, departmentId, isMaster }) => ({
        url: `${departmentsBasePath({ tenantId, isMaster })}/${departmentId}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantDepartments', id: tenantId },
      ],
    }),
    // No confirmation needed by convention — restoring visibility is the
    // low-risk direction.
    activateTenantDepartment: build.mutation<
      void,
      { tenantId: string; departmentId: string; isMaster?: boolean }
    >({
      query: ({ tenantId, departmentId, isMaster }) => ({
        url: `${departmentsBasePath({ tenantId, isMaster })}/${departmentId}/activate`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantDepartments', id: tenantId },
      ],
    }),
    listTenantDepartmentOffices: build.query<
      TenantDepartmentOffice[],
      ListTenantDepartmentOfficesArgs
    >({
      query: ({ tenantId, departmentId, isMaster }) =>
        `${departmentsBasePath({ tenantId, isMaster })}/${departmentId}/offices`,
      transformResponse: (response: { offices?: TenantDepartmentOffice[] }) =>
        response.offices ?? [],
      providesTags: (_result, _error, { departmentId }) => [
        { type: 'TenantDepartmentOffices', id: departmentId },
      ],
    }),
    addTenantDepartmentOffice: build.mutation<void, TenantDepartmentOfficeMutationArgs>({
      query: ({ tenantId, departmentId, officeId, isMaster }) => ({
        url: `${departmentsBasePath({ tenantId, isMaster })}/${departmentId}/offices`,
        method: 'POST',
        body: { office_id: officeId },
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        { type: 'TenantDepartmentOffices', id: departmentId },
      ],
    }),
    removeTenantDepartmentOffice: build.mutation<void, TenantDepartmentOfficeMutationArgs>({
      query: ({ tenantId, departmentId, officeId, isMaster }) => ({
        url: `${departmentsBasePath({ tenantId, isMaster })}/${departmentId}/offices/${officeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        { type: 'TenantDepartmentOffices', id: departmentId },
      ],
    }),
  }),
});

export const {
  useListTenantDepartmentsQuery,
  useAddTenantDepartmentMutation,
  useUpdateTenantDepartmentMutation,
  useDeleteTenantDepartmentMutation,
  useDeactivateTenantDepartmentMutation,
  useActivateTenantDepartmentMutation,
  useListTenantDepartmentOfficesQuery,
  useAddTenantDepartmentOfficeMutation,
  useRemoveTenantDepartmentOfficeMutation,
} = extendedApi;
