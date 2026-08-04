import { api } from '../../index';

type UserFiltersRequest = {
  searchQuery: string;
  globalSearchRequestDto?: {
    text: string;
    field: string;
  };
  status: boolean;
  isArchived: boolean;
  startDate: string;
  endDate: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
};

type UserFiltersResponse = {
  data: any[];
  total: number;
  totalElements: number;
  success: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getUsers: build.query<UserFiltersResponse, Partial<UserFiltersRequest>>({
      query: (body) => ({
        // url: `/orguserservice/cfp/user/filters?page=${body.page ?? 0}&size=${body.size ?? 10}`,
        url: `/orguserservice/cfp/user/filters?page=${body.page ?? 0}&size=${body.size ?? 10}${body.sortBy ? `&sortBy=${body.sortBy}` : ''}${body.sortDir ? `&sortDir=${body.sortDir}` : ''}`,
        method: 'POST',
        body,
      }),
      providesTags: [{ type: 'SearchResults', id: 'Users' }],
    }),
  }),
});

export const { useGetUsersQuery } = extendedApi;
