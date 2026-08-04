import { api } from '../../index';

type CompanyDetailsRequest = {
  companyId: number;
};

export type CompanyDetailsResponse = {
  id: number;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  primaryFirstName?: string;
  primaryLastName?: string;
  primaryEmail?: string;
  primaryTitle?: string;
  primaryPhone?: string;
  primaryCountryCode?: string;
  primaryRole?: string;
  secondaryFirstName?: string;
  secondaryLastName?: string;
  secondaryEmail?: string;
  secondaryTitle?: string;
  secondaryPhone?: string;
  secondaryCountryCode?: string;
  secondaryRole?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  websiteUrl?: string;
  industryId?: number;
  companyIndustryId?: number;
  industry?: string;
  status?: boolean;
  allowedToManageLocation?: boolean;
  archived?: boolean;
  companyLogo?: string;
  companyLogoType?: string;
  cultureIntroText?: string;
  cultureIntroDefaultEnabled?: boolean;
  isScoringConfigEditable?: boolean;
  scoringConfigEditable?: boolean;
  candidateIntroEnabled?: boolean;
  candidateEnquiriesEnabled?: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCompanyDetails: build.query<CompanyDetailsResponse, CompanyDetailsRequest>({
      query: ({ companyId }) => ({
        url: `/orguserservice/companies/findById?companyId=${companyId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, { companyId }) => [{ type: 'CompanyDetails', id: companyId }],
    }),
  }),
});

export const { useGetCompanyDetailsQuery } = extendedApi;
