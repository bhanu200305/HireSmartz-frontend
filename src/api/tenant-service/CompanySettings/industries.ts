import { api } from '../../index';

export type IndustryRequest = {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
};

export type IndustryItem = {
  id: number;
  name: string;
  status: boolean;
  companyCount: number;
};

export type IndustryPaginatedResponse = {
  content: IndustryItem[];
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

export const masterAdminIndustriesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMasterIndustries: build.query<IndustryPaginatedResponse, IndustryRequest>({
      query: ({ status, search, page = 0, size = 10, sortBy = 'name', sortDirection = 'ASC' }) => {
        let url = `/job-opening/master-admin/industries?page=${page}&size=${size}&sortBy=${sortBy}&sortDirection=${sortDirection}`;
        if (status && status !== 'all') url += `&status=${status}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        return {
          url,
          method: 'GET',
        };
      },
      providesTags: ['Industries'],
    }),
    addMasterIndustry: build.mutation<
      { success: boolean; message: string; data: IndustryItem },
      { name: string; status: boolean }
    >({
      query: (body) => ({
        url: `/job-opening/master-admin/industries`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Industries'],
    }),
    updateMasterIndustry: build.mutation<
      { success: boolean; message: string; data: IndustryItem },
      { id: number; name: string; status: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/job-opening/master-admin/industries/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Industries'],
    }),
    deleteMasterIndustry: build.mutation<void, number>({
      query: (id) => ({
        url: `/job-opening/master-admin/industries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Industries'],
    }),
  }),
});

export const {
  useGetMasterIndustriesQuery,
  useAddMasterIndustryMutation,
  useUpdateMasterIndustryMutation,
  useDeleteMasterIndustryMutation,
} = masterAdminIndustriesApi;
