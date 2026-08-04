import { api } from '../../index';

type GlobalSearchRequestDto = {
  text?: string;
  field?: string;
};

type CompanyUsersFiltersRequest = {
  firstName?: string;
  lastName?: string;
  emailId?: string;
  phoneNumber?: string;
  title?: string;
  status?: boolean;
  isArchived?: boolean;
  searchQuery?: string;
  startDateTime?: string;
  endDateTime?: string;
  roleTypeMappingId?: number | null;
  locationId?: number | null;
  isAll?: boolean;
  globalSearchRequestDto?: GlobalSearchRequestDto;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
};

export type CompanyUser = {
  id: number | string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  createdDate?: string;
  emailId?: string;
  countryCode?: string;
  phoneNumber?: string;
  role?: string;
  title?: string;
  archived?: boolean;
  isActiveAndVerified?: boolean;
  primaryLocation?: {
    name?: string;
  } | null;
};

type CompanyUsersFiltersResponse = {
  data: CompanyUser[];
  total: number;
  totalElements: number;
  success: boolean;
  message?: string;
};

type GetCompanyUsersArgs = {
  companyId: number;
} & Partial<CompanyUsersFiltersRequest>;

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCompanyUsers: build.query<CompanyUsersFiltersResponse, GetCompanyUsersArgs>({
      query: ({ companyId, ...body }) => ({
        url: `/orguserservice/cfp/user/company/${companyId}/users/filters?page=${body.page ?? 0}&size=${body.size ?? 10}${body.sortBy ? `&sortBy=${body.sortBy}` : ''}${body.sortDir ? `&sortDir=${body.sortDir}` : ''}`,
        method: 'POST',
        body,
      }),
      providesTags: [{ type: 'SearchResults', id: 'CompanyUsers' }],
    }),
  }),
});

export const { useGetCompanyUsersQuery } = extendedApi;
