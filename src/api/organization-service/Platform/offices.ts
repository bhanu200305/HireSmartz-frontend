import { orgApi } from '../orgApi';
import type { TenantOffice } from '../Tenants/offices';

// Super Admin's platform-mounted mirror of Tenants/offices.ts's full office
// CRUD — same request/response shapes, tenant bound from the path.
export type AddPlatformTenantOfficeRequest = {
  tenantId: string;
  address: string;
  city: string;
  country: string;
  address_line_2?: string;
  state?: string;
  zip_code?: string;
};

export type AddPlatformTenantOfficeResponse = {
  office_id: string;
};

export type UpdatePlatformTenantOfficeRequest = {
  tenantId: string;
  officeId: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  address_type_id?: string;
};

export type DeletePlatformTenantOfficeResponse = {
  status: string;
};

const officesBasePath = (tenantId: string): string => `/v1/platform/tenants/${tenantId}/offices`;

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformTenantOffices: build.query<TenantOffice[], string>({
      query: (tenantId) => officesBasePath(tenantId),
      providesTags: (_result, _error, tenantId) => [
        { type: 'TenantOffices', id: `platform-${tenantId}` },
      ],
    }),
    addPlatformTenantOffice: build.mutation<
      AddPlatformTenantOfficeResponse,
      AddPlatformTenantOfficeRequest
    >({
      query: ({ tenantId, ...body }) => ({
        url: officesBasePath(tenantId),
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantOffices', id: `platform-${tenantId}` },
      ],
    }),
    updatePlatformTenantOffice: build.mutation<TenantOffice, UpdatePlatformTenantOfficeRequest>({
      query: ({ tenantId, officeId, ...body }) => ({
        url: `${officesBasePath(tenantId)}/${officeId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantOffices', id: `platform-${tenantId}` },
      ],
    }),
    deletePlatformTenantOffice: build.mutation<
      DeletePlatformTenantOfficeResponse,
      { tenantId: string; officeId: string }
    >({
      query: ({ tenantId, officeId }) => ({
        url: `${officesBasePath(tenantId)}/${officeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantOffices', id: `platform-${tenantId}` },
      ],
    }),
  }),
});

export const {
  useListPlatformTenantOfficesQuery,
  useAddPlatformTenantOfficeMutation,
  useUpdatePlatformTenantOfficeMutation,
  useDeletePlatformTenantOfficeMutation,
} = extendedApi;
