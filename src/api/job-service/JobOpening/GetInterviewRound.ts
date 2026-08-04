import { InterviewRound } from '../../../types';
import { api } from '../../index';

export interface InterviewRoundsResponse {
  data: InterviewRound[];
}

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getInterviewRoundsByJobId: build.query<InterviewRound[], number>({
      query: (jobId) => ({
        url: `/interview-rounds/job/${jobId}`,
        method: 'GET',
      }),
    }),
  }),
});

export const { useGetInterviewRoundsByJobIdQuery } = extendedApi;
