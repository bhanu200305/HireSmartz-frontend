import { orgApi } from '../orgApi';

export type GuestOrganization = {
  id: string;
  organization_name: string;
  organization_email: string;
  contact_number: string;
  first_name: string;
  last_name: string;
  location: string;
  company_size: number;
  job_title: string;
  referral_source: string | null;
  created_at: string | null;
};

export type ListGuestOrganizationsArgs = {
  limit?: number;
  offset?: number;
};

export type ListGuestOrganizationsResponse = {
  guest_organizations: GuestOrganization[];
  total: number;
};

// POST /v1/guest-organizations request body — the "Book a Demo" form.
// Public endpoint, no auth/tenant context: this is submitted by a visitor
// who has no account yet, same as the invite-acceptance endpoints.
export type SubmitDemoRequestBody = {
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  company_name: string;
  location: string;
  company_size: number;
  job_title: string;
  heard_about_us?: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listGuestOrganizations: build.query<
      ListGuestOrganizationsResponse,
      ListGuestOrganizationsArgs | void
    >({
      query: (args) => ({
        url: '/v1/platform/guest-organizations',
        params: { limit: args?.limit ?? 50, offset: args?.offset ?? 0 },
      }),
      providesTags: ['GuestOrganizations'],
    }),
    getGuestOrganization: build.query<GuestOrganization, string>({
      query: (guestOrgId) => `/v1/platform/guest-organizations/${guestOrgId}`,
      providesTags: (_result, _error, guestOrgId) => [
        { type: 'GuestOrganizations', id: guestOrgId },
      ],
    }),
    submitDemoRequest: build.mutation<GuestOrganization, SubmitDemoRequestBody>({
      query: (body) => ({ url: '/v1/guest-organizations', method: 'POST', body }),
      invalidatesTags: ['GuestOrganizations'],
    }),
  }),
});

export const {
  useListGuestOrganizationsQuery,
  useGetGuestOrganizationQuery,
  useSubmitDemoRequestMutation,
} = extendedApi;
