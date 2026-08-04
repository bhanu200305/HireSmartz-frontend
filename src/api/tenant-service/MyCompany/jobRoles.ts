import { api } from '../../index';

export type JobRoleRequest = {
  status?: string;
  source?: string;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
};

export type JobRole = {
  id: number;
  companyId: number;
  name: string;
  source: string;
  status: string;
  masterJobTitleId: number | null;
  mappedToDepartments: { departmentId: number; departmentName: string }[] | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportJobRole = {
  id: number;
  name: string;
  departmentId: number;
  departmentName: string;
  alreadyImported: boolean;
  isActive: boolean;
};

export type ImportJobRoleListResponse = {
  availableToImport: ImportJobRole[];
  alreadyImported: ImportJobRole[];
};

export type JobRoleResponse = {
  content: JobRole[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
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

const jobRolesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getJobRoles: build.query<JobRoleResponse, JobRoleRequest>({
      query: ({
        status,
        source,
        search,
        page = 0,
        size = 10,
        sortBy = 'createdAt',
        sortDirection = 'DESC',
      }) => {
        let url = `/job-opening/company-org/job-titles?page=${page}&size=${size}&sortBy=${sortBy}&sortDirection=${sortDirection}`;
        if (status && status !== 'all') url += `&status=${status}`;
        if (source && source !== 'all') url += `&source=${source}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        return {
          url,
          method: 'GET',
        };
      },
      providesTags: ['JobRoles'],
    }),
    getJobRoleImportList: build.query<ImportJobRoleListResponse, { departmentId: number }>({
      query: ({ departmentId }) => ({
        url: `/job-opening/company-org/job-titles/import-list?departmentId=${departmentId}`,
        method: 'GET',
      }),
      providesTags: ['JobRoles'],
    }),
    importJobRoles: build.mutation<void, { departmentId: number; masterJobTitleIds: number[] }>({
      query: (body) => ({
        url: `/job-opening/company-org/job-titles/import`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobRoles'],
    }),
    addCustomJobRole: build.mutation<
      void,
      { name: string; status?: boolean; departmentIds: number[] }
    >({
      query: (body) => ({
        url: '/job-opening/company-org/job-titles/custom',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobRoles'],
    }),
    updateCustomJobRole: build.mutation<
      void,
      { id: number; name: string; status: boolean; departmentIds?: number[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/job-opening/company-org/job-titles/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['JobRoles'],
    }),
    deleteCustomJobRole: build.mutation<void, number>({
      query: (id) => ({
        url: `/job-opening/company-org/job-titles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JobRoles'],
    }),
  }),
});

export const {
  useGetJobRolesQuery,
  useGetJobRoleImportListQuery,
  useImportJobRolesMutation,
  useAddCustomJobRoleMutation,
  useUpdateCustomJobRoleMutation,
  useDeleteCustomJobRoleMutation,
} = jobRolesApi;
