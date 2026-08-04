import { UpdateCompanyRequest } from '../../../types';
import { api } from '../../index';

type UpdateCompanyResponse = {
  success: boolean;
  message: string;
};

export type UpdateCompanyOrgRequest = {
  companyId: number;
  companyLogo?: string;
  companyLogoType?: string;
  companyName?: string;
  primaryFirstName?: string;
  primaryLastName?: string;
  primaryEmail?: string;
  primaryTitle?: string;
  primaryPhone?: string;
  primaryCountryCode?: string;
  secondaryFirstName?: string;
  secondaryLastName?: string;
  secondaryEmail?: string;
  secondaryTitle?: string;
  secondaryPhone?: string;
  secondaryCountryCode?: string;
  roleTypeMappingId?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  status?: string | boolean;
  zip?: string;
  country?: string;
  websiteUrl?: string;
  companyIndustryId?: number | null;
  locationName?: string;
  departmentIds?: number[];
  locationCode?: string | null;
  timezone?: string;
  allowedToManageLocation?: boolean;
  companyLogoDeleted?: boolean;
  cultureIntroText?: string;
  cultureIntroDefaultEnabled?: boolean;
  candidateIntroEnabled?: boolean;
  candidateEnquiriesEnabled?: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    updateCompany: build.mutation<UpdateCompanyResponse, UpdateCompanyRequest>({
      query: ({ companyId, ...body }) => ({
        url: `/orguserservice/companies/update?companyId=${companyId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { companyId }) => [
        { type: 'CompanyDetails', id: companyId },
        'Industries',
        'Departments',
        'CompanyLocations',
      ],
    }),
    updateCompanyOrg: build.mutation<UpdateCompanyResponse, UpdateCompanyOrgRequest>({
      query: ({ companyId, ...body }) => ({
        url: `/orguserservice/companies/org/update?companyId=${companyId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { companyId }) => [
        { type: 'CompanyDetails', id: companyId },
        'Industries',
        'Departments',
        'CompanyLocations',
      ],
    }),
  }),
});

export const { useUpdateCompanyMutation, useUpdateCompanyOrgMutation } = extendedApi;
