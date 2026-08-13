import { orgApi } from '../orgApi';

export type JobOpening = {
  id: string;
  title: string;
  status: string;
  department: string | null;
  location: string | null;
  published_at: string | null;
  closes_at: string | null;
  created_at: string;
};

// Proxied from job-service. `available: false` means job-service didn't
// answer — render "not available", never an empty list as if there are
// genuinely zero job openings.
export type JobOpeningsResponse = {
  available: boolean;
  jobs: JobOpening[];
  total: number;
};

export type ListTenantJobOpeningsArgs = {
  tenantId: string;
  limit?: number;
  offset?: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listTenantJobOpenings: build.query<JobOpeningsResponse, ListTenantJobOpeningsArgs>({
      query: ({ tenantId, limit = 50, offset = 0 }) => ({
        url: `/v1/tenants/${tenantId}/job-openings`,
        params: { limit, offset },
      }),
    }),
  }),
});

export const { useListTenantJobOpeningsQuery } = extendedApi;
