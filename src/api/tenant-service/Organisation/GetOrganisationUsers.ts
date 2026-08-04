import { api } from '../../index';

type OrgUserFiltersRequest = {
  searchQuery: string;
  globalSearchRequestDto?: {
    text: string;
    field: string;
  };
  status: boolean;
  isArchived: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
};

type OrgUserFiltersResponse = {
  data: any[];
  total: number;
  totalElements: number;
  success: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOrgUsers: build.query<OrgUserFiltersResponse, Partial<OrgUserFiltersRequest>>({
      query: (body) => ({
        url: `/orguserservice/org/user/filters?page=${body.page ?? 0}&size=${body.size ?? 10}${body.sortBy ? `&sortBy=${body.sortBy}` : ''}${body.sortDir ? `&sortDir=${body.sortDir}` : ''}`,
        method: 'POST',
        body,
      }),
      providesTags: [{ type: 'SearchResults', id: 'OrgUsers' }],
    }),
  }),
});

export const { useGetOrgUsersQuery } = extendedApi;
