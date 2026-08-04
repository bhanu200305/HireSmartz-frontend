import api from '../..';

type CloseJobRequest = {
  jobId: number;
  reasonId: number;
  customReason?: string;
};

type CloseJobResponse = {
  success: boolean;
  message?: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    closeJob: build.mutation<CloseJobResponse, CloseJobRequest>({
      query: (body) => ({
        url: '/job-opening/close-job',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobOpenings'],
    }),
  }),
});

export const { useCloseJobMutation } = extendedApi;
