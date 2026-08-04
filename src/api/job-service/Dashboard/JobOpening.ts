import {
  InterviewSummaryDashboardRequest,
  InterviewSummaryDashboardResponse,
  JobOpeningFilterRequest,
  JobOpeningFilterResponse,
  RoundTypeResponse,
} from '../../../types';
import { api } from '../../index';

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    JobOpeningFilter: build.query<JobOpeningFilterResponse, JobOpeningFilterRequest>({
      query: ({ page, pageSize, value }) => ({
        url: `/job-opening/dashboard/filters?page=${page}&size=${pageSize}`,
        method: 'POST',
        body: value,
      }),
    }),
    interviewSummaryDashboard: build.mutation<
      InterviewSummaryDashboardResponse,
      InterviewSummaryDashboardRequest
    >({
      query: (body) => ({
        url: `/job-opening/interview-summary`,
        method: 'POST',
        body,
      }),
    }),
    getAllRoundTypes: build.query<RoundTypeResponse, boolean>({
      query: (isOwner) => ({
        url: `/job-opening/getAllRoundType?isOwner=${isOwner}`,
        method: 'GET',
      }),
    }),
  }),
});

export const {
  useJobOpeningFilterQuery,
  useInterviewSummaryDashboardMutation,
  useGetAllRoundTypesQuery,
} = extendedApi;
