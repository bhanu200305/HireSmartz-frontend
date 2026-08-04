import api from '../..';
import { SaveInterviewRoundRequest } from '../../../types';

type SaveInterviewRoundResponse = {
  status: string;
  message?: string;
  data: {
    interviewRoundId: number;
  };
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    saveInterviewRound: build.mutation<SaveInterviewRoundResponse, SaveInterviewRoundRequest>({
      query: (body) => ({
        url: '/interview-rounds/save',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useSaveInterviewRoundMutation } = extendedApi;
