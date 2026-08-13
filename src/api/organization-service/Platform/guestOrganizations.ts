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
  }),
});

export const { useListGuestOrganizationsQuery, useGetGuestOrganizationQuery } = extendedApi;
