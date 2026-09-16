import { jobApi } from '../jobApi';
import type { InterviewRoundRequest, InterviewSequenceResponse } from '../types';

/**
 * Whole-sequence replace — job-service has no single-round POST.
 * Callers should GET the current sequence, mutate the array, then PUT.
 */
type SaveInterviewRoundRequest = {
  jobOpeningId: string;
  rounds: InterviewRoundRequest[];
};

type SaveInterviewRoundResponse = {
  status: string;
  message?: string;
  data: InterviewSequenceResponse;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    saveInterviewRound: build.mutation<SaveInterviewRoundResponse, SaveInterviewRoundRequest>({
      query: ({ jobOpeningId, rounds }) => ({
        url: `/job-openings/${jobOpeningId}/interview-sequence`,
        method: 'PUT',
        body: { rounds },
      }),
      transformResponse: (response: InterviewSequenceResponse): SaveInterviewRoundResponse => ({
        status: 'OK',
        message: 'Interview rounds saved successfully',
        data: response,
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [
        { type: 'InterviewSequence', id: jobOpeningId },
        { type: 'JobOpeningById', id: jobOpeningId },
        { type: 'WizardState', id: jobOpeningId },
      ],
    }),
  }),
});

export const { useSaveInterviewRoundMutation } = extendedApi;
