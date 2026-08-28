import { jobApi } from '../jobApi';
import type { JobDetailsResponse } from '../types';

/**
 * JD read/update — the real contract hangs JD off the job itself
 * (`GET/PUT /job-openings/{id}/details` and `PUT .../jd`), not a separate
 * aiJobDescription id. Hook names kept for import stability; request args
 * now take `jobOpeningId` (UUID).
 */
type ViewJobDescriptionRequest = {
  /** @deprecated use jobOpeningId — kept so call sites compile during migration */
  aiJobDescriptionID?: number | string;
  jobOpeningId?: string;
};

type ViewJobDescriptionResponse = {
  id: string;
  jobDescription: string;
  createdAt?: string;
  atsJobOpeningId?: string;
  source?: string;
  jd_status?: string;
};

type UpdateJobDescriptionRequest = {
  aiJobDescriptionId?: number | string;
  jobOpeningId?: string;
  jobDescription: string;
};

const resolveJobId = (args: {
  jobOpeningId?: string;
  aiJobDescriptionID?: number | string;
  aiJobDescriptionId?: number | string;
}): string => {
  if (args.jobOpeningId) return String(args.jobOpeningId);
  const legacy = args.aiJobDescriptionID ?? args.aiJobDescriptionId;
  return legacy != null ? String(legacy) : '';
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getJobDescriptionById: build.query<ViewJobDescriptionResponse, ViewJobDescriptionRequest>({
      query: (args) => {
        const jobOpeningId = resolveJobId(args);
        return {
          url: `/job-openings/${jobOpeningId}/details`,
          method: 'GET',
        };
      },
      transformResponse: (response: JobDetailsResponse): ViewJobDescriptionResponse => ({
        id: response.org_job_opening_id,
        jobDescription: response.jd ?? '',
      }),
      providesTags: (_r, _e, args) => [
        { type: 'JobDescription', id: resolveJobId(args) },
        { type: 'JobDetails', id: resolveJobId(args) },
      ],
    }),

    updateJobDescription: build.mutation<ViewJobDescriptionResponse, UpdateJobDescriptionRequest>({
      query: (args) => {
        const jobOpeningId = resolveJobId(args);
        return {
          url: `/job-openings/${jobOpeningId}/jd`,
          method: 'PUT',
          body: { jd: args.jobDescription },
        };
      },
      transformResponse: (
        response: { jd: string | null },
        _meta,
        args
      ): ViewJobDescriptionResponse => ({
        id: resolveJobId(args),
        jobDescription: response.jd ?? '',
      }),
      invalidatesTags: (_r, _e, args) => [
        { type: 'JobDescription', id: resolveJobId(args) },
        { type: 'JobDetails', id: resolveJobId(args) },
        { type: 'JobOpeningById', id: resolveJobId(args) },
      ],
    }),
  }),
});

export const {
  useGetJobDescriptionByIdQuery,
  useLazyGetJobDescriptionByIdQuery,
  useUpdateJobDescriptionMutation,
} = extendedApi;
