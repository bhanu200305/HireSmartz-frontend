import api from '../..';

export const interviewRoundApi = api.injectEndpoints({
  endpoints: (builder) => ({
    deleteInterviewRound: builder.mutation<any, number>({
      query: (id) => ({
        url: `/interview-rounds/delete/${id}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const { useDeleteInterviewRoundMutation } = interviewRoundApi;
