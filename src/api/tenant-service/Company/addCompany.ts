import { api } from '../../index';

type AddCompanyRequest = {
  companyLogo: string;
  companyLogoType: string;
  companyName: string;
  primaryFirstName: string;
  primaryLastName: string;
  primaryEmail: string;
  primaryTitle: string;
  primaryPhone: string;
  primaryCountryCode: string;
  secondaryFirstName?: string;
  secondaryLastName?: string;
  secondaryEmail?: string;
  secondaryTitle?: string;
  secondaryPhone?: string;
  secondaryCountryCode?: string;
  addressLine1: string;
  addressLine2?: string;
  locationName?: string;
  locationCode?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  websiteUrl: string;
  allowedToManageLocation?: boolean;
  masterIndustryId?: number;
  departmentIds: number[];
  cultureIntroText?: string;
  cultureIntroDefaultEnabled?: boolean;
};

type AddCompanyResponse = {
  success: boolean;
  companyId: string;
  message?: string;
};
type CountryDropdownRequest = {
  countryName: string;
};

type City = {
  id: number;
  name: string;
};

type State = {
  id: number;
  name: string;
  code: string;
  cities: City[];
};

type CountryDropdownResponse = Array<{
  id: number;
  name: string;
  isoCode: string;
  states: State[];
}>;

type CountryResponse = Array<{
  id: number;
  name: string;
  isoCode: string;
}>;

type StateResponse = Array<{
  id: number;
  name: string;
  code: string;
}>;

type CityResponse = Array<{
  id: number;
  name: string;
}>;

export type IndustryResponse = Array<{
  id: number;
  name: string;
  status: boolean;
  departmentId: number;
  industryId: number;
  skillType: string;
}>;

export type CompanyIndustryRequest = Array<{
  companyId: number;
}>;
export type CompanyIndustryResponse = Array<{
  companyId: number;
  id: number;
  name: string;
  masterIndustryId: number | null;
  source: string;
  status: boolean;
}>;
export type DepartmentByIndustryResponse = Array<{
  id: number;
  name: string;
  status: boolean;
  departmentId: number;
  industryId: number;
  skillType: string;
}>;

export type DepartmentByCompanyResponse = Array<{
  id: number;
  name: string;
  status: boolean;
  departmentId: number | null;
  skillType: string | null;
}>;

export type Department = {
  id: number;
  name: string;
  status: boolean;
};

export type GetAllDepartmentsRequest = {
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL' | 'active' | 'inactive' | 'all';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
};

export type GetAllDepartmentsResponse = {
  totalPages: number;
  totalElements: number;
  pageable: Pageable;
  size: number;
  content: Department[];
  number: number;
  sort: PageableSort;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
};

export type IndustryByIdResponse = {
  success: boolean;
  message: string;
  data: {
    id: number;
    name: string;
    status: boolean;
  };
};

export type CompanyIndustryByIdResponse = {
  id: number;
  name: string;
  companyId: number;
  masterIndustryId: number | null;
  source: string;
  status: boolean;
};

export type CompanyLocation = {
  id: number;
  companyId: number;
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  countryCode?: string | null;
  phoneNumber?: string | null;
  timezone?: string | null;
  status: boolean;
  createdAt: number;
  userCount: number | null;
  primary: boolean;
};

export type CompanyLocationsResponse = {
  success: boolean;
  message: string;
  data: CompanyLocation[];
};

export type LocationFilterStatus = 'ALL' | 'ACTIVE' | 'INACTIVE';

export type GetCompanyLocationsFilterRequest = {
  companyId: number;
  status: LocationFilterStatus;
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

type PageableSort = {
  sorted: boolean;
  empty: boolean;
  unsorted: boolean;
};

type Pageable = {
  pageNumber: number;
  pageSize: number;
  sort: PageableSort;
  offset: number;
  paged: boolean;
  unpaged: boolean;
};

export type CompanyLocationsFilterResponse = {
  content: CompanyLocation[];
  pageable: Pageable;
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: PageableSort;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
};

export type UpdateCompanyLocationRequest = {
  locationId: number;
  companyId: number;
  name: string;
  code: string | null;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  countryCode?: string;
  phoneNumber?: string;
  status: boolean;
  primary: boolean;
};

export type AddPrimaryCompanyLocationRequest = {
  companyId: number;
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  countryCode?: string;
  phoneNumber?: string;
  status: boolean;
};

export type AddCompanyLocationRequest = AddPrimaryCompanyLocationRequest & {
  primary: boolean;
};

export type AddPrimaryCompanyLocationResponse = {
  success: boolean;
  message: string;
  data: CompanyLocation;
};

export type AddCompanyLocationResponse = AddPrimaryCompanyLocationResponse;

export type UpdateCompanyLocationResponse = {
  success: boolean;
  message: string;
  data: CompanyLocation;
};

export type DeactivateCompanyLocationResponse = {
  success: boolean;
  message: string;
  data?: CompanyLocation;
};

export type SetPrimaryCompanyLocationResponse = {
  success: boolean;
  message: string;
  data?: CompanyLocation;
};

export type UpdateLocationStatusRequest = {
  locationId: number;
  status: boolean;
};

export type UpdateLocationStatusResponse = {
  success: boolean;
  message: string;
  data?: CompanyLocation;
};

export type CreateDepartmentRequest = {
  name: string;
  status: string;
  companyId?: number;
};

export type CreateDepartmentResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    name: string;
    status: boolean;
  };
};

export type UpdateDepartmentRequest = {
  companyId?: number;
  name: string;
  status: string;
};

export type UpdateDepartmentResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    name: string;
    status: boolean;
  };
};

export type CreateIndustryRequest = {
  companyId: number;
  industryName: string;
  status: boolean;
};

export type CreateIndustryResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    name: string;
    status: boolean;
  };
};

export type UpdateIndustryRequest = {
  companyId: number;
  name: string;
  status: boolean;
};

export type UpdateIndustryResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    name: string;
    status: boolean;
  };
};

export type ImportCompanyDepartmentsRequest = {
  companyId: number;
  masterDepartmentIds: number[];
};

export type ImportCompanyDepartmentsResponse = {
  success: boolean;
  message: string;
};

export type DeleteCompanyDepartmentRequest = {
  departmentId: number;
};

export type DeleteCompanyDepartmentResponse = {
  success: boolean;
  message: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    addCompany: build.mutation<AddCompanyResponse, AddCompanyRequest>({
      query: (body) => ({
        url: '/orguserservice/companies/save',
        method: 'POST',
        body,
      }),
    }),
    getCountryDropdowns: build.query<CountryDropdownResponse, CountryDropdownRequest>({
      query: ({ countryName }) => ({
        url: `/job-opening/getCountryDropdownsByName?countryName=${encodeURIComponent(countryName)}`,
        method: 'GET',
      }),
    }),
    getCountries: build.query<CountryResponse, void>({
      query: () => ({
        url: `/locations/countries`,
        method: 'GET',
      }),
    }),
    getStatesByCountryId: build.query<StateResponse, { countryId: number }>({
      query: ({ countryId }) => ({
        url: `/locations/states?countryId=${countryId}`,
        method: 'GET',
      }),
    }),
    getCitiesByStateId: build.query<CityResponse, { stateId: number }>({
      query: ({ stateId }) => ({
        url: `/locations/cities?stateId=${stateId}`,
        method: 'GET',
      }),
    }),
    getIndustries: build.query<IndustryResponse, void>({
      query: () => ({
        url: `/job-opening/master-admin/industries`,
        method: 'GET',
      }),
      providesTags: ['Industries'],
    }),
    getCompanyIndustries: build.query<CompanyIndustryResponse, { companyId: number }>({
      query: ({ companyId }) => ({
        url: `/job-opening/company-industry/all?companyId=${companyId}`,
        method: 'GET',
      }),
      providesTags: ['Industries'],
    }),
    getIndustryById: build.query<IndustryByIdResponse, { industryId: number }>({
      query: ({ industryId }) => ({
        url: `/job-opening/master-admin/industries/${industryId}`,
        method: 'GET',
      }),
      providesTags: ['Industries'],
    }),
    getCompanyIndustryById: build.query<CompanyIndustryByIdResponse, { industryId: number }>({
      query: ({ industryId }) => ({
        url: `/job-opening/company-industry/${industryId}`,
        method: 'GET',
      }),
      providesTags: ['Industries'],
    }),
    getDepartmentsByIndustryId: build.query<DepartmentByIndustryResponse, { industryId: number }>({
      query: ({ industryId }) => ({
        url: `/job-opening/master-admin/industries/${industryId}/departments?activeOnly=true`,
        method: 'GET',
      }),
    }),
    getDepartmentsByCompanyId: build.query<DepartmentByCompanyResponse, { companyId: number }>({
      query: ({ companyId }) => ({
        url: `/job-opening/company-org/companies/${companyId}/departments`,
        method: 'GET',
      }),
      providesTags: ['Departments'],
    }),
    getAllDepartments: build.query<GetAllDepartmentsResponse, GetAllDepartmentsRequest | void>({
      query: (params) => ({
        url: '/job-opening/master-admin/departments',
        method: 'GET',
        params: {
          ...(params?.status ? { status: params.status } : {}),
          page: params?.page ?? 0,
          size: params?.size ?? 20,
          sortBy: params?.sortBy ?? 'name',
          sortDirection: params?.sortDirection ?? 'ASC',
        },
      }),
      providesTags: ['MasterDepartments'],
    }),
    importCompanyDepartments: build.mutation<
      ImportCompanyDepartmentsResponse,
      ImportCompanyDepartmentsRequest
    >({
      query: ({ companyId, masterDepartmentIds }) => ({
        url: `/job-opening/company-org/companies/${companyId}/departments/import`,
        method: 'POST',
        body: { masterDepartmentIds },
      }),
    }),
    deleteCompanyDepartment: build.mutation<
      DeleteCompanyDepartmentResponse,
      DeleteCompanyDepartmentRequest
    >({
      query: ({ departmentId }) => ({
        url: `/job-opening/company-org/departments/${departmentId}`,
        method: 'DELETE',
      }),
    }),
    getCompanyLocations: build.query<
      CompanyLocationsResponse,
      { companyId: number; activeOnly?: boolean }
    >({
      query: ({ companyId, activeOnly }) => ({
        url: '/orguserservice/locations',
        method: 'GET',
        params: {
          companyId,
          ...(activeOnly !== undefined ? { activeOnly } : {}),
        },
      }),
      providesTags: ['CompanyLocations'],
    }),
    getCompanyLocationsFilter: build.query<
      CompanyLocationsFilterResponse,
      GetCompanyLocationsFilterRequest
    >({
      query: ({ companyId, status, page, size, sortBy, sortDir }) => ({
        url: '/orguserservice/locations/filter',
        method: 'GET',
        params: {
          companyId,
          status,
          page,
          size,
          sortBy,
          sortDir,
        },
      }),
      providesTags: ['CompanyLocations'],
    }),
    addPrimaryCompanyLocation: build.mutation<
      AddPrimaryCompanyLocationResponse,
      AddPrimaryCompanyLocationRequest
    >({
      query: ({ companyId, ...body }) => ({
        url: '/orguserservice/locations',
        method: 'POST',
        params: { companyId },
        body: {
          ...body,
          primary: true,
        },
      }),
      invalidatesTags: ['CompanyLocations'],
    }),
    addCompanyLocation: build.mutation<AddCompanyLocationResponse, AddCompanyLocationRequest>({
      query: ({ companyId, ...body }) => ({
        url: '/orguserservice/locations',
        method: 'POST',
        params: { companyId },
        body,
      }),
      invalidatesTags: ['CompanyLocations'],
    }),
    updateCompanyLocation: build.mutation<
      UpdateCompanyLocationResponse,
      UpdateCompanyLocationRequest
    >({
      query: ({ locationId, companyId, ...body }) => ({
        url: `/orguserservice/locations/${locationId}`,
        method: 'PUT',
        params: { companyId },
        body,
      }),
      invalidatesTags: ['CompanyLocations'],
    }),
    deactivateCompanyLocation: build.mutation<
      DeactivateCompanyLocationResponse,
      { locationId: number }
    >({
      query: ({ locationId }) => ({
        url: `/orguserservice/locations/${locationId}/deactivate`,
        method: 'PUT',
      }),
    }),
    setPrimaryCompanyLocation: build.mutation<
      SetPrimaryCompanyLocationResponse,
      { locationId: number }
    >({
      query: ({ locationId }) => ({
        url: `/orguserservice/locations/${locationId}/primary`,
        method: 'PUT',
      }),
      invalidatesTags: ['CompanyLocations'],
    }),
    updateLocationStatus: build.mutation<UpdateLocationStatusResponse, UpdateLocationStatusRequest>(
      {
        query: ({ locationId, status }) => ({
          url: `/orguserservice/locations/${locationId}/status`,
          method: 'PUT',
          params: { status },
        }),
        invalidatesTags: ['CompanyLocations'],
      }
    ),
    createDepartment: build.mutation<CreateDepartmentResponse, CreateDepartmentRequest>({
      query: (body) => ({
        url: '/job-opening/company-org/departments/custom',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MasterDepartments'],
    }),
    updateDepartment: build.mutation<
      UpdateDepartmentResponse,
      { departmentId: number } & UpdateDepartmentRequest
    >({
      query: ({ departmentId, ...body }) => ({
        url: `/job-opening/company-org/departments/${departmentId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['MasterDepartments'],
    }),
    createIndustry: build.mutation<CreateIndustryResponse, CreateIndustryRequest>({
      query: ({ companyId, industryName, status }) => ({
        url: '/job-opening/company-industry/custom',
        method: 'POST',
        params: {
          companyId,
          industryName,
          status,
        },
      }),
      invalidatesTags: ['Industries'],
    }),
    updateIndustry: build.mutation<
      UpdateIndustryResponse,
      { industryId: number } & UpdateIndustryRequest
    >({
      query: ({ industryId, ...body }) => ({
        url: `/job-opening/company-industry/industries/${industryId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Industries'],
    }),
  }),
});

export const {
  useAddCompanyMutation,
  useGetCountryDropdownsQuery,
  useGetCountriesQuery,
  useGetStatesByCountryIdQuery,
  useGetCitiesByStateIdQuery,
  useGetIndustriesQuery,
  useGetCompanyIndustriesQuery,
  useGetIndustryByIdQuery,
  useGetCompanyIndustryByIdQuery,
  useGetDepartmentsByIndustryIdQuery,
  useGetDepartmentsByCompanyIdQuery,
  useGetAllDepartmentsQuery,
  useImportCompanyDepartmentsMutation,
  useDeleteCompanyDepartmentMutation,
  useGetCompanyLocationsQuery,
  useGetCompanyLocationsFilterQuery,
  useAddPrimaryCompanyLocationMutation,
  useAddCompanyLocationMutation,
  useUpdateCompanyLocationMutation,
  useDeactivateCompanyLocationMutation,
  useSetPrimaryCompanyLocationMutation,
  useUpdateLocationStatusMutation,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useCreateIndustryMutation,
  useUpdateIndustryMutation,
} = extendedApi;
