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
 *
 * Matches `candidate_dto.CandidateInterviewRoundView` field-for-field
 * (verified 2026-09-02 against the real Pydantic model) — `id`,
 * `candidate_id`, `round_name`, and `sequence` are always present, never
 * null; only `round_id` is null (resume stage only, no job-service round
 * behind it).
 */
export type CandidateInterviewRoundView = {
  id: string;
  candidate_id: string;
  stage_type: 'resume' | 'interview';
  round_id: string | null;
  round_name: string;
  sequence: number;
  duration_minutes: number | null;
  /** Plain string, not an FK — interview-service owns this vocabulary, expect new values over time. */
  status: string;
  interview_booking_id: string | null;
  scheduled_at: string | null;
  /** Null until the resume stage is actionable. Unused on interview rounds. */
  due_at: string | null;
  /** Set together, only when `status === "skipped"`. Null otherwise. */
  skip_reason: string | null;
  skipped_by: string | null;
  skipped_at: string | null;
  /** When `CandidateReadyForRound` was last actually published for this
   * round — null until a recruiter clicks "Send Invite"; becoming due
   * (`status === "to_be_scheduled"`) does not set this by itself. */
  invite_sent_at: string | null;
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
  /** Both null-able on the real response (`candidate_dto.py`) — advancing an
   * already-finished candidate is a no-op that returns neither. */
  completed_round: CandidateInterviewRoundView | null;
  /** `null` means every round is finished — candidate moved to `selected` server-side; refetch to see the new status. */
  next_round: CandidateInterviewRoundView | null;
};

/** Same shape as `AdvanceCandidateResultView` — skip and advance both end in
 * "this round is finished, here's what's next," just named for what
 * actually happened to `skipped_round`. */
export type SkipInterviewRoundResultView = {
  candidate_id: string;
  skipped_round: CandidateInterviewRoundView | null;
  next_round: CandidateInterviewRoundView | null;
};

export type SkipInterviewRoundArgs = {
  candidateId: string;
  /** Required, non-empty — a skip is a deliberate override, not a routine
   * "this happened" click, so it has to say why (`SkipInterviewRoundRequest`). */
  reason: string;
};

/** `invite_sent: false` means this call was treated as a duplicate click (the
 * previous send was within the debounce window) — nothing new was
 * published, `round` just reflects the round as it already was. */
export type SendRoundInviteResultView = {
  candidate_id: string;
  round: CandidateInterviewRoundView;
  invite_sent: boolean;
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

    // POST /candidates/{id}/skip-round — this candidate's own round plan
    // only, never job-service's shared plan. Same "current round finishes,
    // next becomes due" shape as advance, just requires a reason and is
    // recorded as a skip rather than a completion.
    skipInterviewRound: build.mutation<SkipInterviewRoundResultView, SkipInterviewRoundArgs>({
      query: ({ candidateId, reason }) => ({
        url: `/candidates/${candidateId}/skip-round`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        { type: 'CandidateInterviewRounds', id: candidateId },
        { type: 'CandidateStatusHistory', id: candidateId },
        'CandidateList',
      ],
    }),

    // POST /candidates/{id}/send-invite — tells interview-service the
    // candidate's CURRENT round is ready to schedule. Advancing/skipping a
    // round does not do this by itself; a recruiter has to explicitly send
    // the invite once the round becomes due.
    sendRoundInvite: build.mutation<SendRoundInviteResultView, string>({
      query: (candidateId) => ({
        url: `/candidates/${candidateId}/send-invite`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, candidateId) => [
        { type: 'CandidateInterviewRounds', id: candidateId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListCandidateInterviewRoundsQuery,
  useListCandidateInterviewRoundArtifactsQuery,
  useAdvanceCandidateMutation,
  useSkipInterviewRoundMutation,
  useSendRoundInviteMutation,
} = extendedApi;
