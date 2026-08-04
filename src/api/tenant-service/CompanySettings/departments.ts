import { api } from '../../index';

export type DepartmentRequest = {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
};

export type DepartmentItem = {
  id: number;
  name: string;
  status: boolean;
  jobTitleCount?: number;
};

export type DepartmentPaginatedResponse = {
  content: DepartmentItem[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      empty: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    sorted: boolean;
    empty: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
};

export const masterAdminDepartmentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMasterDepartments: build.query<DepartmentPaginatedResponse, DepartmentRequest>({
      query: ({ status, search, page = 0, size = 10, sortBy = 'name', sortDirection = 'ASC' }) => {
        let url = `/job-opening/master-admin/departments?page=${page}&size=${size}&sortBy=${sortBy}&sortDirection=${sortDirection}`;
        if (status && status !== 'all') url += `&status=${status}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        return {
          url,
          method: 'GET',
        };
      },
      providesTags: ['MasterDepartments'],
    }),
    addMasterDepartment: build.mutation<
      { success: boolean; message: string; data: DepartmentItem },
      { name: string; status: boolean }
    >({
      query: (body) => ({
        url: `/job-opening/master-admin/departments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MasterDepartments'],
    }),
    updateMasterDepartment: build.mutation<
      { success: boolean; message: string; data: DepartmentItem },
      { id: number; name: string; status: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/job-opening/master-admin/departments/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['MasterDepartments'],
    }),
    deleteMasterDepartment: build.mutation<void, number>({
      query: (id) => ({
        url: `/job-opening/master-admin/departments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MasterDepartments'],
    }),
    getMasterDepartmentJobTitles: build.query<
      { id: number; name: string; status: boolean; departmentId: number; skillType: string }[],
      number
    >({
      query: (departmentId) => ({
        url: `/job-opening/master-admin/departments/${departmentId}/job-titles?activeOnly=true`,
        method: 'GET',
      }),
      providesTags: ['MasterDepartments', 'MasterJobTitles'],
    }),
    configureMasterDepartmentJobTitles: build.mutation<
      { success: boolean; message: string; data: string },
      { departmentId: number; jobTitleIds: number[] }
    >({
      query: (body) => ({
        url: `/job-opening/master-admin/departments/job-titles/configure`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MasterDepartments', 'MasterJobTitles'],
    }),
  }),
});

export const {
  useGetMasterDepartmentsQuery,
  useAddMasterDepartmentMutation,
  useUpdateMasterDepartmentMutation,
  useDeleteMasterDepartmentMutation,
  useGetMasterDepartmentJobTitlesQuery,
  useConfigureMasterDepartmentJobTitlesMutation,
} = masterAdminDepartmentsApi;
