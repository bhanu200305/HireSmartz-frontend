import { jobApi } from '../jobApi';
import type { InterviewRoundRequest, InterviewSequenceResponse } from '../types';

type SequenceMutationRequest = {
  jobOpeningId: string;
  rounds: InterviewRoundRequest[];
};

type SequenceMutationResponse = {
  status: string;
  message: string;
  data?: InterviewSequenceResponse;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    editInterviewRound: build.mutation<SequenceMutationResponse, SequenceMutationRequest>({
      query: ({ jobOpeningId, rounds }) => ({
        url: `/job-openings/${jobOpeningId}/interview-sequence`,
        method: 'PUT',
        body: { rounds },
      }),
      transformResponse: (response: InterviewSequenceResponse): SequenceMutationResponse => ({
        status: 'OK',
        message: 'Interview round updated successfully',
        data: response,
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [
        { type: 'InterviewSequence', id: jobOpeningId },
        { type: 'JobOpeningById', id: jobOpeningId },
      ],
    }),

    reorderInterviewRounds: build.mutation<SequenceMutationResponse, SequenceMutationRequest>({
      query: ({ jobOpeningId, rounds }) => ({
        url: `/job-openings/${jobOpeningId}/interview-sequence`,
        method: 'PUT',
        body: { rounds },
      }),
      transformResponse: (response: InterviewSequenceResponse): SequenceMutationResponse => ({
        status: 'OK',
        message: 'Interview rounds reordered successfully',
        data: response,
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [
        { type: 'InterviewSequence', id: jobOpeningId },
        { type: 'JobOpeningById', id: jobOpeningId },
      ],
    }),
  }),
});

export const { useEditInterviewRoundMutation, useReorderInterviewRoundsMutation } = extendedApi;
