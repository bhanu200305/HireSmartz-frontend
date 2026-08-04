import { api } from '../../index';

export interface CompanyDropdownItem {
  id: number;
  companyName: string;
  owner: boolean;
  scoringConfigEditable: boolean;
}

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCompaniesDropdown: build.query<CompanyDropdownItem[], void>({
      query: () => ({
        url: '/orguserservice/companies/dropdown',
        method: 'GET',
      }),
    }),
  }),
});

export const { useGetCompaniesDropdownQuery } = extendedApi;
