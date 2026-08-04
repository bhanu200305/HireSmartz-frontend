import api from '../..';

type RegenerateJobDescriptionRequest = {
  aiJobDescriptionId: number;
  text: string;
  generateFromScratch?: boolean;
};
type RegenerateJobDescriptionResponse = {
  message: string;
  success: boolean;
  data: {
    id: number;
    jobDescription: string;
    createdAt: string;
  };
};
const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    regenerateJobDescription: build.mutation<
      RegenerateJobDescriptionResponse,
      RegenerateJobDescriptionRequest
    >({
      query: (body) => ({
        url: '/ai-job-description/regenerate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobDescription'],
    }),
  }),
});

export const { useRegenerateJobDescriptionMutation } = extendedApi;
