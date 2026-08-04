import { api } from '../../index';

export type JobTitleRequest = {
  status?: string;
  search?: string;
  departmentId?: number | string | null;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
};

export type JobTitleItem = {
  id: number;
  name: string;
  status: boolean;
  departmentId: number;
  departmentIds: number[];
};

export type JobTitlePaginatedResponse = {
  content: JobTitleItem[];
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

export const masterAdminJobTitlesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMasterJobTitles: build.query<JobTitlePaginatedResponse, JobTitleRequest>({
      query: ({
        status,
        search,
        departmentId,
        page = 0,
        size = 10,
        sortBy = 'name',
        sortDirection = 'ASC',
      }) => {
        let url = `/job-opening/master-admin/job-titles?page=${page}&size=${size}&sortBy=${sortBy}&sortDirection=${sortDirection}`;
        if (status && status !== 'all') url += `&status=${status}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (departmentId && departmentId !== 'all') url += `&departmentId=${departmentId}`;

        return {
          url,
          method: 'GET',
        };
      },
      providesTags: ['MasterJobTitles'],
    }),
    addMasterJobTitle: build.mutation<
      { success: boolean; message: string; data: JobTitleItem },
      { name: string; status: boolean; departmentIds: number[] }
    >({
      query: (body) => ({
        url: `/job-opening/master-admin/job-titles/with-departments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MasterJobTitles'],
    }),
    updateMasterJobTitle: build.mutation<
      { success: boolean; message: string; data: JobTitleItem },
      { jobTitleId: number; name: string; status: boolean; departmentIds: number[] }
    >({
      query: (body) => ({
        url: `/job-opening/master-admin/departments/job-titles/assign`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['MasterJobTitles'],
    }),
    deleteMasterJobTitle: build.mutation<void, number>({
      query: (id) => ({
        url: `/job-opening/master-admin/job-titles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MasterJobTitles'],
    }),
  }),
});

export const {
  useGetMasterJobTitlesQuery,
  useAddMasterJobTitleMutation,
  useUpdateMasterJobTitleMutation,
  useDeleteMasterJobTitleMutation,
} = masterAdminJobTitlesApi;
