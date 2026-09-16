import { jobApi } from '../jobApi';
import type { InterviewRoundRequest, InterviewSequenceResponse } from '../types';

/**
 * Delete is whole-sequence replace without the removed round (Audio Screening
 * can never be removed — the backend returns 422).
 */
type DeleteInterviewRoundRequest = {
  jobOpeningId: string;
  rounds: InterviewRoundRequest[];
};

export const interviewRoundApi = jobApi.injectEndpoints({
  endpoints: (builder) => ({
    deleteInterviewRound: builder.mutation<
      { status: string; message: string },
      DeleteInterviewRoundRequest
    >({
      query: ({ jobOpeningId, rounds }) => ({
        url: `/job-openings/${jobOpeningId}/interview-sequence`,
        method: 'PUT',
        body: { rounds },
      }),
      transformResponse: (_response: InterviewSequenceResponse) => ({
        status: 'OK',
        message: 'Interview round has been deleted successfully',
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [
        { type: 'InterviewSequence', id: jobOpeningId },
        { type: 'JobOpeningById', id: jobOpeningId },
      ],
    }),
  }),
});

export const { useDeleteInterviewRoundMutation } = interviewRoundApi;
