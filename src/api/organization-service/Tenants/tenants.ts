import { orgApi } from '../orgApi';

export type ScrapedTenantPreview = {
  logo_url: string;
  colors: string[];
  description: string;
};

export type CreateTenantRequest = {
  company_name: string;
  // Optional on organization-service's CreateTenantInput — omit rather than
  // send '' for an unset value, which a UUID/URL field would reject as
  // malformed rather than treat as absent.
  website_url?: string;
  industry_id?: string;
  admin_email: string;
  admin_contact?: string;
  // Set when this tenant is being created from an approved "Book a Demo"
  // lead (GuestOrganizations screen) — see organization-service's
  // CreateTenantUseCase. Omitted for the ordinary manual-entry path.
  source_guest_organization_id?: string;
};

export type CreateTenantResponse = {
  tenant_id: string;
  status: 'draft' | string;
  // null when no website_url was given, or ai-service didn't answer —
  // CreateTenantUseCase never fails the request over this, so the frontend
  // must handle the no-preview case rather than assume one always comes back.
  scraped_preview: ScrapedTenantPreview | null;
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

export type SuspendTenantResponse = {
  status: 'suspended' | string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    createTenant: build.mutation<CreateTenantResponse, CreateTenantRequest>({
      query: (body) => ({
        url: '/v1/tenants',
        method: 'POST',
        body,
      }),
      // Also invalidate GuestOrganizations, but only when this creation
      // actually converted a lead — otherwise every ordinary manual
      // "add company" would refetch a list it never touched.
      invalidatesTags: (_result, _error, body) =>
        body.source_guest_organization_id ? ['Tenant', 'GuestOrganizations'] : ['Tenant'],
    }),
    confirmTenant: build.mutation<ConfirmTenantResponse, ConfirmTenantRequest>({
      query: ({ tenantId, confirmed_profile_fields }) => ({
        url: `/v1/tenants/${tenantId}/confirm`,
        method: 'POST',
        body: { confirmed_profile_fields },
      }),
      invalidatesTags: ['Tenant', 'TenantInvitations'],
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

export const { useCreateTenantMutation, useConfirmTenantMutation, useSuspendTenantMutation } =
  extendedApi;
