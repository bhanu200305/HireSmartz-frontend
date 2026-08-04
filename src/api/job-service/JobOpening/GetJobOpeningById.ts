import api from '../..';
import { JobOpeningByIdResponse } from '../../../types';

type JobOpeningByIdRequest = {
  jobOpeningId: number;
};

type DuplicateJobOpeningRequest = {
  jobOpeningId: number;
  jobProfileCode: string;
};

type DuplicateJobOpeningResponse = {
  status: boolean | string;
  message: string;
  code: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getJobOpeningById: build.query<JobOpeningByIdResponse, JobOpeningByIdRequest>({
      query: ({ jobOpeningId }) => ({
        url: `/job-opening/getByID?id=${jobOpeningId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, { jobOpeningId }) => [
        { type: 'JobOpeningById', id: jobOpeningId },
      ],
      keepUnusedDataFor: 0,
    }),
    duplicateJobOpening: build.mutation<DuplicateJobOpeningResponse, DuplicateJobOpeningRequest>({
      query: (body) => ({
        url: '/job-opening/duplicate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobOpenings'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetJobOpeningByIdQuery, useDuplicateJobOpeningMutation } = extendedApi;
