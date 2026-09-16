import { jobApi } from '../jobApi';
import type { ImportAtsJobRequest, ImportAtsJobResponse } from '../types';

export type AtsConnection = {
  org_ats_config_id: string;
  ats_provider: string;
  status: string;
  tenant_identifier: string | null;
  last_synced_at: string | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getAtsConfig: build.query<{ connections: AtsConnection[] }, void>({
      query: () => ({ url: '/ats/config', method: 'GET' }),
      providesTags: ['AtsConfig'],
    }),

    listAtsJobs: build.query<
      { jobs: Array<{ ats_job_id: string; title?: string; [key: string]: unknown }> },
      { provider?: string } | void
    >({
      query: (args) => ({
        url: '/ats/jobs',
        method: 'GET',
        params: args?.provider ? { ats_provider: args.provider } : undefined,
      }),
      providesTags: ['AtsJobs'],
    }),

    importAtsJob: build.mutation<ImportAtsJobResponse, ImportAtsJobRequest>({
      query: (body) => ({
        url: '/job-openings/import-ats',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'JobOpenings', id: 'LIST' }, 'JobStats'],
    }),

    connectAts: build.mutation<
      { redirect_url: string },
      { ats_provider: string; tenant_identifier: string }
    >({
      query: (body) => ({
        url: '/ats/connect',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AtsConfig'],
    }),

    disconnectAts: build.mutation<void, { ats_provider: string }>({
      query: ({ ats_provider }) => ({
        url: '/ats/disconnect',
        method: 'DELETE',
        params: { ats_provider },
      }),
      invalidatesTags: ['AtsConfig'],
    }),

    /**
     * Push-to-ATS sync is explicitly not built on job-service yet
     * (API_CONTRACT Known gaps / Index.tsx comment). This mutation exists
     * only so screens that still call it get a clear error instead of a
     * silent 404 against a fictional legacy path.
     */
    syncAtsJobOpening: build.mutation<
      { success: boolean; message: string },
      {
        body: Record<string, unknown>;
        providerName: string;
      }
    >({
      queryFn: () => ({
        error: {
          status: 501,
          data: {
            message:
              'ATS push-sync is not available on job-service yet. Use import-ats to pull a requisition.',
            error_code: 'NOT_IMPLEMENTED',
          },
        },
      }),
    }),

    getAllAtsNamesByCompanyId: build.query<
      { success: boolean; data: Array<{ id: string; name: string }> },
      void
    >({
      query: () => ({ url: '/ats/config', method: 'GET' }),
      transformResponse: (response: { connections: Array<Record<string, unknown>> }) => ({
        success: true,
        data: (response.connections ?? []).map((c) => ({
          id: String(c.ats_provider ?? ''),
          name: String(c.ats_provider ?? ''),
        })),
      }),
      providesTags: ['AtsConfig'],
    }),
  }),
});

export const {
  useGetAtsConfigQuery,
  useListAtsJobsQuery,
  useImportAtsJobMutation,
  useConnectAtsMutation,
  useDisconnectAtsMutation,
  useSyncAtsJobOpeningMutation,
  useGetAllAtsNamesByCompanyIdQuery,
} = extendedApi;
