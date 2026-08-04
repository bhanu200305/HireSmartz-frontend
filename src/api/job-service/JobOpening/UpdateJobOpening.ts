import api from '../..';
import { UpdateJobOpeningRequest } from '../../../types';

type UpdateJobOpeningResponse = {
  success: boolean;
  message?: string;
  data: {
    aiJobDescriptionId: number;
    jobOpeningId: number;
  };
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    updateJobOpening: build.mutation<
      UpdateJobOpeningResponse,
      { body: UpdateJobOpeningRequest; jobOpeningId: number }
    >({
      query: ({ body, jobOpeningId }) => ({
        url: `/job-opening/update?jobOpeningId=${jobOpeningId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobOpenings', 'JobOpeningById'],
    }),
  }),
});

export const { useUpdateJobOpeningMutation } = extendedApi;
