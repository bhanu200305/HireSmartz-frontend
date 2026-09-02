import candidateApi from '../candidateApi';

// Interview Rounds — API_CONTRACT.md's "Interview Rounds" section. There is
// NO manual round-add/edit/reorder/remove endpoint anymore (removed since
// an earlier version of this API) — the plan is seeded entirely from
// job-service at apply time. `PUT .../interview-rounds` and
// `DELETE .../interview-rounds/{round_id}` do not exist; don't build UI
// that assumes they do.

/**
 * `CandidateInterviewRoundView` — always includes a synthetic "resume"
 * stage FIRST (`stage_type: "resume"`, `round_id: null`) representing the
 * resume-collection step itself, not a job-service round
 * (FRONTEND_INTEGRATION_DETAILS.md §4.5). Real rounds have
 * `stage_type: "interview"`; `round_name`/`sequence`/`duration_minutes` are
 * sourced LIVE from job-service on every read — never stored locally, so
 * don't cache these past the query's own lifetime.
 */
export type CandidateInterviewRoundView = {
  id: string | null;
  stage_type: 'resume' | 'interview';
  round_id: string | null;
  round_name: string | null;
  sequence: number | null;
  duration_minutes: number | null;
  /** Plain string, not an FK — interview-service owns this vocabulary, expect new values over time. */
  status: string;
  interview_booking_id: string | null;
  scheduled_at: string | null;
  due_at: string | null;
};

/** `url` is `null` while `status` is `"reserved"` (recording not ready yet)
 * — poll if you need to wait for it. No `expires_in_seconds` on this one
 * (unlike `ResumeDownloadView`) — treat `url` as short-lived and refetch
 * the list rather than caching it (FRONTEND_INTEGRATION_DETAILS.md §7).
 */
export type CandidateInterviewRoundArtifactView = {
  id: string;
  kind: string;
  status: string;
  url: string | null;
  produced_at: string | null;
};

export type AdvanceCandidateResultView = {
  candidate_id: string;
  completed_round: CandidateInterviewRoundView;
  /** `null` means every round is finished — candidate moved to `selected` server-side; refetch to see the new status. */
  next_round: CandidateInterviewRoundView | null;
};

const extendedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    listCandidateInterviewRounds: build.query<CandidateInterviewRoundView[], string>({
      query: (candidateId) => `/candidates/${candidateId}/interview-rounds`,
      providesTags: (_result, _error, candidateId) => [
        { type: 'CandidateInterviewRounds', id: candidateId },
      ],
    }),

    listCandidateInterviewRoundArtifacts: build.query<
      CandidateInterviewRoundArtifactView[],
      { candidateId: string; roundId: string }
    >({
      query: ({ candidateId, roundId }) =>
        `/candidates/${candidateId}/interview-rounds/${roundId}/artifacts`,
      providesTags: (_result, _error, { candidateId, roundId }) => [
        { type: 'CandidateInterviewRoundArtifacts', id: `${candidateId}:${roundId}` },
      ],
    }),

    advanceCandidate: build.mutation<AdvanceCandidateResultView, string>({
      query: (candidateId) => ({
        url: `/candidates/${candidateId}/advance`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, candidateId) => [
        { type: 'Candidate', id: candidateId },
        { type: 'CandidateInterviewRounds', id: candidateId },
        { type: 'CandidateStatusHistory', id: candidateId },
        'CandidateList',
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListCandidateInterviewRoundsQuery,
  useListCandidateInterviewRoundArtifactsQuery,
  useAdvanceCandidateMutation,
} = extendedApi;
