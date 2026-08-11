import { api } from '../../index';

export type ScrapedTenantPreview = {
  logo_url: string;
  colors: string[];
  description: string;
};

export type CreateTenantRequest = {
  company_name: string;
  website_url: string;
  industry_id: string;
  admin_email: string;
  admin_contact: string;
};

export type CreateTenantResponse = {
  tenant_id: string;
  status: 'draft' | string;
  scraped_preview: ScrapedTenantPreview;
};

export type ConfirmedTenantProfileFields = {
  name?: string;
  logo_url?: string;
  colors?: string[];
  description?: string;
};

export type ConfirmTenantRequest = {
  tenantId: string;
  confirmed_profile_fields: ConfirmedTenantProfileFields;
};

export type ConfirmTenantResponse = {
  status: 'pre_approved' | string;
  invitation_id: string;
};

export type UpdateTenantProfileRequest = {
  tenantId: string;
  name?: string;
  logo?: string;
  description?: string;
};

export type UpdateTenantProfileResponse = {
  status: string;
};

export type SuspendTenantResponse = {
  status: 'suspended' | string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    createTenant: build.mutation<CreateTenantResponse, CreateTenantRequest>({
      query: (body) => ({
        url: '/v1/tenants',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tenant'],
    }),
    confirmTenant: build.mutation<ConfirmTenantResponse, ConfirmTenantRequest>({
      query: ({ tenantId, confirmed_profile_fields }) => ({
        url: `/v1/tenants/${tenantId}/confirm`,
        method: 'POST',
        body: { confirmed_profile_fields },
      }),
      invalidatesTags: ['Tenant', 'TenantInvitations'],
    }),
    updateTenantProfile: build.mutation<UpdateTenantProfileResponse, UpdateTenantProfileRequest>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/profile`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Tenant'],
    }),
    suspendTenant: build.mutation<SuspendTenantResponse, { tenantId: string }>({
      query: ({ tenantId }) => ({
        url: `/v1/tenants/${tenantId}/suspend`,
        method: 'POST',
      }),
      invalidatesTags: ['Tenant'],
    }),
  }),
});

export const {
  useCreateTenantMutation,
  useConfirmTenantMutation,
  useUpdateTenantProfileMutation,
  useSuspendTenantMutation,
} = extendedApi;
