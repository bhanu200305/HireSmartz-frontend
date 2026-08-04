import { api } from '../../index';

type CompanyFiltersRequest = {
  searchQuery?: string;
  globalSearchRequestDto?: {
    text: string;
    field: string;
  };
  status?: boolean;
  isArchived?: boolean;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
};

type CompanyFiltersResponse = {
  data: any[];
  total: number;
  totalElements: number;
  success: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCompanies: build.query<CompanyFiltersResponse, Partial<CompanyFiltersRequest>>({
      query: (body) => ({
        url: `/orguserservice/companies/filters?page=${body.page ?? 0}&size=${body.size ?? 10}${body.sortBy ? `&sortBy=${body.sortBy}` : ''}${body.sortDir ? `&sortDir=${body.sortDir}` : ''}`,
        method: 'POST',
        body,
      }),
      providesTags: [{ type: 'SearchResults', id: 'Companies' }],
    }),
  }),
});

export const { useGetCompaniesQuery } = extendedApi;
