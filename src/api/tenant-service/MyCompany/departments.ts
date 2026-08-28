import { api } from '../../index';
import { jobServiceOrigin } from '../../jobServiceOrigin';

export type DepartmentRequest = {
  status?: string;
  source?: string;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
};

export type Department = {
  id: number;
  companyId: number;
  name: string;
  source: string;
  status: string;
  masterDepartmentId: number | null;
  jobTitlesConfigured: number;
  jobTitlesAssigned: number;
  createdAt: string;
  updatedAt: string;
};

export type MappedJobTitle = {
  id: number;
  companyId: number;
  name: string;
  source: string;
  status: string;
  masterJobTitleId: number | null;
  mappedToDepartment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportDepartment = {
  id: number;
  name: string;
  jobTitlesCount: number;
  alreadyImported: boolean;
  isActive: boolean;
};

export type ImportListResponse = {
  availableToImport: ImportDepartment[];
  alreadyImported: ImportDepartment[];
};

export type DepartmentResponse = {
  content: Department[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
    };
    offset: number;
    unpaged: boolean;
    paged: boolean;
  };
  totalPages: number;
  last: boolean;
  totalElements: number;
  first: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: {
    unsorted: boolean;
    sorted: boolean;
    empty: boolean;
  };
  empty: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getDepartments: build.query<DepartmentResponse, DepartmentRequest>({
      query: ({
        status,
        source,
        search,
        page = 0,
        size = 10,
        sortBy = 'createdAt',
        sortDirection = 'DESC',
      }) => {
        let url = `${jobServiceOrigin()}/job-opening/company-org/departments?page=${page}&size=${size}&sortBy=${sortBy}&sortDirection=${sortDirection}`;
        if (status && status !== 'all') url += `&status=${status}`;
        if (source && source !== 'all') url += `&source=${source}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        return {
          url,
          method: 'GET',
        };
      },
      providesTags: ['Departments'],
    }),
    getDepartmentImportList: build.query<ImportListResponse, void>({
      query: () => ({
        url: `${jobServiceOrigin()}/job-opening/company-org/departments/import-list`,
        method: 'GET',
      }),
      providesTags: ['Departments'],
    }),
    importDepartments: build.mutation<void, { masterDepartmentIds: number[] }>({
      query: (body) => ({
        url: `${jobServiceOrigin()}/job-opening/company-org/departments/import`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Departments'],
    }),
    addCustomDepartment: build.mutation<void, { name: string; status: string | boolean }>({
      query: (body) => ({
        url: `${jobServiceOrigin()}/job-opening/company-org/departments/custom`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Departments'],
    }),
    updateCustomDepartment: build.mutation<
      void,
      { id: number; name: string; status: string | boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `${jobServiceOrigin()}/job-opening/company-org/departments/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Departments', 'JobRoles'],
    }),
    getDepartmentJobTitles: build.query<MappedJobTitle[], { departmentId: number }>({
      query: ({ departmentId }) => ({
        url: `${jobServiceOrigin()}/job-opening/company-org/departments/${departmentId}/job-titles`,
        method: 'GET',
      }),
      providesTags: ['JobRoles'],
    }),
    configureDepartmentJobTitles: build.mutation<
      void,
      { departmentId: number; jobTitleIds: number[] }
    >({
      query: (body) => ({
        url: `${jobServiceOrigin()}/job-opening/company-org/departments/configure-job-titles`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobRoles', 'Departments'],
    }),
    deleteCustomDepartment: build.mutation<void, number>({
      query: (id) => ({
        url: `${jobServiceOrigin()}/job-opening/company-org/departments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Departments', 'JobRoles'],
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useGetDepartmentImportListQuery,
  useImportDepartmentsMutation,
  useAddCustomDepartmentMutation,
  useUpdateCustomDepartmentMutation,
  useGetDepartmentJobTitlesQuery,
  useConfigureDepartmentJobTitlesMutation,
  useDeleteCustomDepartmentMutation,
} = extendedApi;
