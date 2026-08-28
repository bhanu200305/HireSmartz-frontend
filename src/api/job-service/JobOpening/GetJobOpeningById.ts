import { jobApi } from '../jobApi';
import { mapJobOpeningToLegacyView } from '../mapJobOpeningToLegacyView';
import type {
  CreateDraftResponse,
  DuplicateJobResponse,
  JobOpeningDetailResponse,
  WizardStateResponse,
} from '../types';
import type { JobOpeningByIdResponse } from '../../../types';
import { asJobId } from '../jobId';

type JobOpeningByIdRequest = {
  jobOpeningId: string | number;
};

type DuplicateJobOpeningRequest = {
  jobOpeningId: string;
};

export type JobOpeningByIdQueryData = JobOpeningDetailResponse & {
  success: true;
  message: string;
  data: JobOpeningByIdResponse['data'];
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getJobOpeningById: build.query<JobOpeningByIdQueryData, JobOpeningByIdRequest>({
      query: ({ jobOpeningId }) => ({
        url: `/job-openings/${asJobId(jobOpeningId)}`,
        method: 'GET',
      }),
      transformResponse: (response: JobOpeningDetailResponse): JobOpeningByIdQueryData => ({
        ...response,
        success: true,
        message: 'OK',
        data: mapJobOpeningToLegacyView(response),
      }),
      providesTags: (_result, _error, { jobOpeningId }) => [
        { type: 'JobOpeningById', id: asJobId(jobOpeningId) },
      ],
      keepUnusedDataFor: 0,
    }),

    createJobDraft: build.mutation<CreateDraftResponse, void>({
      query: () => ({
        url: '/job-openings/draft',
        method: 'POST',
        body: { entry_path: 'MANUAL' },
      }),
      invalidatesTags: [{ type: 'JobOpenings', id: 'LIST' }, 'JobStats'],
    }),

    duplicateJobOpening: build.mutation<DuplicateJobResponse, DuplicateJobOpeningRequest>({
      query: ({ jobOpeningId }) => ({
        url: `/job-openings/${jobOpeningId}/duplicate`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'JobOpenings', id: 'LIST' }, 'JobStats'],
    }),

    deleteJobOpening: build.mutation<void, string>({
      query: (jobOpeningId) => ({
        url: `/job-openings/${jobOpeningId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'JobOpenings', id: 'LIST' }, 'JobStats'],
    }),

    getWizardState: build.query<WizardStateResponse, string>({
      query: (jobOpeningId) => ({
        url: `/job-openings/${jobOpeningId}/wizard-state`,
        method: 'GET',
      }),
      providesTags: (_r, _e, jobOpeningId) => [{ type: 'WizardState', id: jobOpeningId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetJobOpeningByIdQuery,
  useCreateJobDraftMutation,
  useDuplicateJobOpeningMutation,
  useDeleteJobOpeningMutation,
  useGetWizardStateQuery,
} = extendedApi;
