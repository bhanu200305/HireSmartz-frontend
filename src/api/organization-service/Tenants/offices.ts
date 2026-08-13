import { orgApi } from '../orgApi';

export type AddTenantOfficeRequest = {
  tenantId: string;
  address: string;
  city: string;
  country: string;
};

export type AddTenantOfficeResponse = {
  office_id: string;
};

// OfficeSummaryView — GET /v1/tenants/{tenant_id}/offices row shape. Wider
// than AddTenantOfficeResponse (which only confirms an id): a list/edit view
// needs the full address.
export type TenantOffice = {
  office_id: string;
  location_code: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string | null;
  country: string;
  zip_code: string | null;
};

export type UpdateTenantOfficeRequest = {
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

export type DeleteTenantOfficeResponse = {
  status: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listTenantOffices: build.query<TenantOffice[], string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/offices`,
      providesTags: (_result, _error, tenantId) => [{ type: 'TenantOffices', id: tenantId }],
    }),
    addTenantOffice: build.mutation<AddTenantOfficeResponse, AddTenantOfficeRequest>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/offices`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantOffices', id: tenantId },
        { type: 'Tenant', id: tenantId },
      ],
    }),
    updateTenantOffice: build.mutation<TenantOffice, UpdateTenantOfficeRequest>({
      query: ({ tenantId, officeId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/offices/${officeId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [{ type: 'TenantOffices', id: tenantId }],
    }),
    // No confirmation-worthy warning needed here per docs/frontend_guide.txt —
    // "Delete -- No warning needed if a department is linked to it, it just
    // gets unlinked automatically." Callers may still ask a light confirm,
    // but nothing here requires the stronger prompt DeleteTenantDepartment does.
    deleteTenantOffice: build.mutation<
      DeleteTenantOfficeResponse,
      { tenantId: string; officeId: string }
    >({
      query: ({ tenantId, officeId }) => ({
        url: `/v1/tenants/${tenantId}/offices/${officeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantOffices', id: tenantId },
        { type: 'TenantDepartments', id: tenantId },
      ],
    }),
  }),
});

export const {
  useListTenantOfficesQuery,
  useAddTenantOfficeMutation,
  useUpdateTenantOfficeMutation,
  useDeleteTenantOfficeMutation,
} = extendedApi;
