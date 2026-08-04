import { api } from '../../index';

type ViewJobDescriptionRequest = {
  aiJobDescriptionID: number;
};

type ViewJobDescriptionResponse = {
  id: number;
  jobDescription: string;
  createdAt: string;
  atsJobOpeningId: string;
  source?: string;
};

type UpdateJobDescriptionRequest = {
  aiJobDescriptionId: number;
  jobDescription: string;
};

type UpdateJobDescriptionResponse = {
  id: number;
  jobDescription: string;
  updatedAt: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getJobDescriptionById: build.query<ViewJobDescriptionResponse, ViewJobDescriptionRequest>({
      query: ({ aiJobDescriptionID }) => ({
        url: `/ai-job-description/getByID?aiJobDescriptionID=${aiJobDescriptionID}`,
        method: 'GET',
      }),
      providesTags: ['JobDescription'],
    }),
    updateJobDescription: build.mutation<UpdateJobDescriptionResponse, UpdateJobDescriptionRequest>(
      {
        query: (body) => ({
          url: '/ai-job-description/edit',
          method: 'PUT',
          body,
        }),
        invalidatesTags: ['JobDescription'],
      }
    ),
  }),
});

export const {
  useGetJobDescriptionByIdQuery,
  useLazyGetJobDescriptionByIdQuery,
  useUpdateJobDescriptionMutation,
} = extendedApi;
