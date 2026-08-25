import { jobApi } from '../jobApi';

// Org-scoped ATS connection + requisition import — requisition import only.
// Candidate/application CRUD is not job-service's domain; this only exposes
// a job's own external-source mapping and read-only aggregate counters
// (see JobOpenings/types.ts's JobSummary).

export type AtsConnection = {
  org_ats_config_id: string;
  ats_provider: string;
  status: string;
  tenant_identifier: string | null;
  last_synced_at: string | null;
};

export type AtsConfigResponse = {
  connections: AtsConnection[];
};

export type ConnectAtsArgs = {
  ats_provider: string;
  tenant_identifier: string;
};

export type ConnectAtsResponse = {
  redirect_url: string;
};

export type AtsJobListItem = {
  ats_job_id: string;
  title: string;
  location: string | null;
  posted_date: string | null;
  already_imported: boolean;
};

export type AtsJobListArgs = {
  ats_provider: string;
  search?: string;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getAtsConfig: build.query<AtsConfigResponse, void>({
      query: () => '/ats/config',
      providesTags: ['AtsConfig'],
    }),
    connectAts: build.mutation<ConnectAtsResponse, ConnectAtsArgs>({
      query: (body) => ({ url: '/ats/connect', method: 'POST', body }),
      invalidatesTags: ['AtsConfig'],
    }),
    disconnectAts: build.mutation<{ status: 'DISCONNECTED' }, string>({
      query: (atsProvider) => ({
        url: '/ats/disconnect',
        method: 'DELETE',
        params: { ats_provider: atsProvider },
      }),
      invalidatesTags: ['AtsConfig'],
    }),
    getAtsJobs: build.query<{ jobs: AtsJobListItem[] }, AtsJobListArgs>({
      query: ({ ats_provider, search }) => ({
        url: '/ats/jobs',
        params: { ats_provider, search },
      }),
      providesTags: ['AtsJobs'],
    }),
  }),
});

export const {
  useGetAtsConfigQuery,
  useConnectAtsMutation,
  useDisconnectAtsMutation,
  useGetAtsJobsQuery,
  useLazyGetAtsJobsQuery,
} = extendedApi;
