import { jobApi } from '../jobApi';
import type {
  InterviewRoundRequest,
  InterviewRoundResponse,
  InterviewSequenceResponse,
} from '../types';
import type { InterviewRound } from '../../../types';

/**
 * Map the real interview-sequence round into the shape SortableInterviewRounds
 * / AddNewRound already render (round nested object, string ids).
 */
const mapRoundToUi = (round: InterviewRoundResponse, jobId: string): InterviewRound =>
  ({
    id: round.id as unknown as number,
    jobId: jobId as unknown as number,
    round: {
      id: round.round_id as unknown as number,
      name: round.round_name ?? '',
      status: true,
    },
    roundType: 'MANUAL',
    sequence: round.sequence,
    description: round.description ?? '',
    uniqueRoundIdentifier: round.id,
    duration: round.duration,
    variant: round.variant,
    roundId: round.round_id,
    roundName: round.round_name,
  }) as InterviewRound & {
    duration: number | null;
    variant: string | null;
    roundId: string;
    roundName: string | null;
  };

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getInterviewRoundsByJobId: build.query<InterviewRound[], string>({
      query: (jobId) => ({
        url: `/job-openings/${jobId}/interview-sequence`,
        method: 'GET',
      }),
      transformResponse: (response: InterviewSequenceResponse, _meta, jobId) =>
        (response.rounds ?? []).map((round) => mapRoundToUi(round, jobId)),
      providesTags: (_r, _e, jobId) => [{ type: 'InterviewSequence', id: jobId }],
    }),

    saveInterviewSequence: build.mutation<
      InterviewSequenceResponse,
      { jobOpeningId: string; rounds: InterviewRoundRequest[] }
    >({
      query: ({ jobOpeningId, rounds }) => ({
        url: `/job-openings/${jobOpeningId}/interview-sequence`,
        method: 'PUT',
        body: { rounds },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId }) => [
        { type: 'InterviewSequence', id: jobOpeningId },
        { type: 'JobOpeningById', id: jobOpeningId },
        { type: 'WizardState', id: jobOpeningId },
        { type: 'JobQuestions', id: jobOpeningId },
      ],
    }),
  }),
});

export const {
  useGetInterviewRoundsByJobIdQuery,
  useLazyGetInterviewRoundsByJobIdQuery,
  useSaveInterviewSequenceMutation,
} = extendedApi;
