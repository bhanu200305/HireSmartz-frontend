import { api } from '../../index';

export type AddTenantOfficeRequest = {
  tenantId: string;
  address: string;
  city: string;
  country: string;
};

export type AddTenantOfficeResponse = {
  office_id: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    addTenantOffice: build.mutation<AddTenantOfficeResponse, AddTenantOfficeRequest>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/offices`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tenant'],
    }),
  }),
});

export const { useAddTenantOfficeMutation } = extendedApi;
