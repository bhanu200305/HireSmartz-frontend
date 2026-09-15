import { jobApi } from '../jobApi';
import type { ImportAtsJobResponse } from '../types';

export type GetAtsDropdownsValuesResponse = {
  success: boolean;
  data: Array<{ id: string; name: string; ats_job_id?: string; combinedName: string }>;
};

export type GetAtsJobByIdRequest = {
  atsJobOpeningId: string;
  atsProvider?: string;
};

export type GetAtsJobByIdResponse = {
  success: boolean;
  message: string;
  data: ImportAtsJobResponse & { org_job_opening_id: string };
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getAtsDropdownsValues: build.query<GetAtsDropdownsValuesResponse, void>({
      query: () => ({ url: '/ats/jobs', method: 'GET' }),
      transformResponse: (response: {
        jobs?: Array<{ ats_job_id: string; title?: string }>;
      }): GetAtsDropdownsValuesResponse => ({
        success: true,
        data: (response.jobs ?? []).map((job) => ({
          id: job.ats_job_id,
          name: job.title || job.ats_job_id,
          ats_job_id: job.ats_job_id,
          combinedName: job.title ? `${job.ats_job_id}: ${job.title}` : job.ats_job_id,
        })),
      }),
      providesTags: ['AtsJobs'],
    }),

    getAtsJobById: build.query<GetAtsJobByIdResponse, GetAtsJobByIdRequest>({
      async queryFn({ atsJobOpeningId, atsProvider }, _api, _extra, baseQuery) {
        // Prefer an explicit provider; otherwise take the first connected one.
        let provider = atsProvider;
        if (!provider) {
          const config = await baseQuery({ url: '/ats/config', method: 'GET' });
          if (config.error) return { error: config.error };
          const connections =
            (config.data as { connections?: Array<{ ats_provider?: string }> })?.connections ?? [];
          provider = connections[0]?.ats_provider;
        }
        if (!provider) {
          return {
            error: {
              status: 400,
              data: { message: 'No ATS provider connected for this organization.' },
            } as never,
          };
        }

        const result = await baseQuery({
          url: '/job-openings/import-ats',
          method: 'POST',
          body: { ats_provider: provider, ats_job_id: atsJobOpeningId },
        });
        if (result.error) return { error: result.error };

        const data = result.data as ImportAtsJobResponse;
        return {
          data: {
            success: true,
            message: 'Job details has been fetched successfully',
            data,
          },
        };
      },
      keepUnusedDataFor: 0,
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
      // Same URL as Ats/ats.ts's getAtsConfig — same tag, stays in sync.
      providesTags: ['AtsConfig'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetAtsDropdownsValuesQuery,
  useLazyGetAtsJobByIdQuery,
  useGetAtsJobByIdQuery,
  useGetAllAtsNamesByCompanyIdQuery,
} = extendedApi;
