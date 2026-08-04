import { EditInterviewRoundRequest, ReorderInterviewRoundsRequest } from '../../../types';
import { api } from '../../index';

export type EditInterviewRoundResponse = {
  status: string;
  message: string;
};

export type ReorderInterviewRoundsResponse = {
  status: string;
  message: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    editInterviewRound: build.mutation<EditInterviewRoundResponse, EditInterviewRoundRequest[]>({
      query: (body) => ({
        url: '/interview-rounds/update',
        method: 'PUT',
        body,
      }),
    }),
    reorderInterviewRounds: build.mutation<
      ReorderInterviewRoundsResponse,
      ReorderInterviewRoundsRequest
    >({
      query: (body) => ({
        url: '/interview-rounds/update',
        method: 'PUT',
        body,
      }),
    }),
  }),
});

export const { useEditInterviewRoundMutation, useReorderInterviewRoundsMutation } = extendedApi;
