import candidateApi from '../candidateApi';

// Interview Rounds — API_CONTRACT.md's "Interview Rounds" section. There is
// NO manual round-add/edit/reorder/remove endpoint anymore (removed since
// an earlier version of this API) — the plan is seeded entirely from
// job-service at apply time. `PUT .../interview-rounds` and
// `DELETE .../interview-rounds/{round_id}` do not exist; don't build UI
// that assumes they do.

/**
 * `CandidateInterviewRoundView` — always includes one synthetic "resume"
 * stage (`stage_type: "resume"`, `round_id: null`) representing the
 * resume-collection step itself, not a job-service round
 * (FRONTEND_INTEGRATION_DETAILS.md §4.5). The list arrives in plan order,
 * sorted by each row's real `sequence`; the resume stage is placed at the
 * job plan's Resume Round position (no longer unconditionally first). That
 * position is PLAN-level, so it can't differ between two candidates on the
 * same opening who applied through the two different intake flows — a
 * resume-first candidate and an instant-call candidate on the SAME job get
 * the same plan-level slot for the resume stage. `follows_intake_call`
 * below is the per-candidate fact that actually distinguishes them;
 * `roundProgress.ts`'s `orderRoundsForFlow` reorders the resume stage after
 * the Intake Call round on the client whenever it's set, so the pipeline
 * reads in the order things actually happened for that candidate. Real
 * rounds have `stage_type: "interview"`; `round_name`/`sequence`/
 * `duration_minutes` are sourced LIVE from job-service on every read —
 * never stored locally, so don't cache these past the query's own
 * lifetime.
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
  /** This round's medium, matching interview-service's own `InterviewType`
   * enum — "AUDIO" (the Intake Call) | "AUDIO_SCREENING" | "AI_VIDEO" |
   * "PANEL" (the Hiring Panel round — the only one with a human
   * interviewer to pick). Null for the resume stage and for a real round
   * the backend classifier can't place. Added 2026-09-11 specifically so
   * "does this round even have interviewers to set" doesn't have to guess
   * from `round_name`, a Super-Admin-editable string. */
  round_type: string | null;
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
  /** The recruiter's separate notes from the skip popup. Null for rounds skipped before it existed. */
  skip_feedback?: string | null;
  skipped_by: string | null;
  skipped_at: string | null;
  /** When `CandidateReadyForRound` was last actually published for this
   * round — null until a recruiter clicks "Send Invite"; becoming due
   * (`status === "to_be_scheduled"`) does not set this by itself. */
  invite_sent_at: string | null;
  /** Explicit PANEL interviewer selection (ids only — resolve names/emails
   * client-side via `listEligibleInterviewers`). Empty means "no explicit
   * selection" — interview-service falls back to auto-composing the panel.
   * Added alongside `set_panel_interviewers`/`list_eligible_interviewers`
   * (candidate-service commit 3ab83cb7, 2026-09-04) — not present on the
   * resume stage in practice, but never null there either, just `[]`. */
  interviewer_ids: string[];
  /** The candidate's own post-round rating (1-5) and free text, reported by
   * interview-service once the candidate submits it. All three are null
   * together until then, or permanently for a round type with no feedback
   * step (the Intake Call). */
  candidate_feedback_rating: number | null;
  candidate_feedback_text: string | null;
  candidate_feedback_submitted_at: string | null;
  /** Only meaningful on the resume-stage row (always `false` on every
   * interview row). `true` when this candidate applied via the
   * instant-call path — Intake Call first, resume attached only once the
   * call finished — so the resume stage should render AFTER the Intake
   * Call round; `false` when the resume was already on file at apply time
   * (every other apply path) and there's no call to wait on. Fixed at
   * creation, never changes — the one reliable per-candidate signal for
   * this ordering fact, since `sequence` alone is a plan-level position
   * shared by every candidate on the job. Added 2026-09-10 (candidate-service
   * migration 0023) specifically to replace the frontend's old heuristic of
   * inferring the flow from `awaiting_resume_upload` in the status history. */
  follows_intake_call: boolean;
};

/** One row of org-service's live interviewer directory, as returned to the
 * PANEL round interviewer picker. `office_id` is `null` when the
 * interviewer has no office set — treat that as "cannot be placed on-site"
 * in any same-office filter, not "matches everywhere".
 *
 * `roles` (added 2026-09-15): why this person is eligible — one or both of
 * an interviewer role name (e.g. `"interviewer"`) and/or `"hiring_manager"`
 * if they're a hiring manager on this specific job. Render as-is, no
 * interpretation needed — job_id itself is resolved server-side from the
 * candidate's own record, nothing to send here for that. */
export type InterviewerView = {
  id: string;
  display_name: string;
  email: string;
  roles: string[];
  office_id: string | null;
};

export type SetPanelInterviewersResultView = {
  candidate_id: string;
  round_id: string;
  interviewer_ids: string[];
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
  // Not sent by the real backend yet — candidate-service's artifact row
  // only stores `candidate_interview_round_id`, not which booking/attempt
  // produced it (see RoundArtifactsPanel.tsx's own grouping-by-timestamp
  // fallback for what happens without this). Typed optional now so
  // RoundArtifactsPanel.tsx picks it up for free, with zero frontend
  // changes, the moment candidate-service starts sending it.
  booking_id?: string | null;
};

export type AdvanceCandidateResultView = {
  candidate_id: string;
  /** Both null-able on the real response (`candidate_dto.py`) — advancing an
   * already-finished candidate is a no-op that returns neither. */
  completed_round: CandidateInterviewRoundView | null;
  /** `null` means every round is finished — candidate moved to `selected` server-side; refetch to see the new status. */
  next_round: CandidateInterviewRoundView | null;
};

/** One candidate's outcome from `POST /candidates/bulk-advance`. Matches
 * `candidate_dto.BulkAdvanceItemResultView` field-for-field (verified
 * 2026-09-08).
 * - `advanced`  — current round completed, `next_round_id` set (or `null`
 *   if that was the last round, in which case the candidate is now
 *   `selected` server-side).
 * - `unchanged` — idempotent no-op: the candidate had already finished
 *   every round before this call. NOT a failure.
 * - `failed`    — `failure_reason` is a machine SLUG, not a sentence
 *   (`bulk_advance_candidates._FAILURE_REASONS`): today only
 *   `"candidate_not_found"` | `"no_interview_rounds_planned"`. Map it for
 *   display (see `BULK_ADVANCE_FAILURE_LABELS`). Only per-candidate failures
 *   land here; a 422/502 fails the whole request instead. */
export type BulkAdvanceItemResultView = {
  candidate_id: string;
  outcome: 'advanced' | 'unchanged' | 'failed';
  next_round_id: string | null;
  failure_reason: string | null;
};

/** Slugs `POST /candidates/bulk-advance` puts in `failure_reason` →
 * human copy. Unknown slugs fall back to a generic line at the call site. */
export const BULK_ADVANCE_FAILURE_LABELS: Record<string, string> = {
  candidate_not_found: 'Candidate not found',
  no_interview_rounds_planned: 'No interview rounds planned for this candidate',
  job_opening_not_found: "This candidate's job opening no longer exists",
  candidate_in_final_status: 'This candidate is already finished',
  resume_consistency_check_pending: 'Waiting on the intake-call consistency check',
  interviewer_feedback_pending: "The interviewer's feedback hasn't been recorded yet",
};

export type BulkAdvanceCandidatesResultView = {
  results: BulkAdvanceItemResultView[];
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
  /** Optional notes, stored apart from `reason` (`SkipInterviewRoundRequest.feedback`). */
  feedback?: string;
  /** Push past a 409 INTERVIEWER_FEEDBACK_PENDING (the interviewer hasn't submitted yet). */
  overridePendingInterviewerFeedback?: boolean;
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

    advanceCandidate: build.mutation<
      AdvanceCandidateResultView,
      { candidateId: string; overridePendingInterviewerFeedback?: boolean }
    >({
      query: ({ candidateId, overridePendingInterviewerFeedback }) => ({
        url: `/candidates/${candidateId}/advance`,
        method: 'POST',
        params: {
          // Advancing no longer waits on the Intake Call consistency check
          // (2026-10-05 product decision, Intake Call made optional) — always
          // push past candidate-service's 409 RESUME_CONSISTENCY_CHECK_PENDING.
          override_pending_consistency_check: true,
          // 409 INTERVIEWER_FEEDBACK_PENDING otherwise (needed for AI-run rounds).
          ...(overridePendingInterviewerFeedback
            ? { override_pending_interviewer_feedback: true }
            : {}),
        },
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        { type: 'CandidateInterviewRounds', id: candidateId },
        { type: 'CandidateStatusHistory', id: candidateId },
        'CandidateList',
      ],
    }),

    // POST /candidates/bulk-advance — advance a selection of candidates to
    // their next round. The list-view checkbox action. PARTIAL-APPLY (unlike
    // bulk-status): each candidate advances in its own server-side
    // transaction, so a bad id / an unplanned pipeline becomes a per-item
    // `outcome: "failed"` | `"unchanged"` in a 200, never a whole-batch
    // failure. Only a 422 (request shape) or 502 (job-service unreachable)
    // fails the request. Same round semantics as single advance — completes
    // the current round, makes the next due; does NOT send the interview
    // invite (that's still a separate per-candidate step).
    bulkAdvanceCandidates: build.mutation<BulkAdvanceCandidatesResultView, string[]>({
      query: (candidateIds) => ({
        url: '/candidates/bulk-advance',
        method: 'POST',
        body: { candidate_ids: candidateIds },
      }),
      invalidatesTags: (_result, _error, candidateIds) => [
        ...candidateIds.flatMap((id) => [
          { type: 'Candidate' as const, id },
          { type: 'CandidateInterviewRounds' as const, id },
          { type: 'CandidateStatusHistory' as const, id },
        ]),
        'CandidateList' as const,
      ],
    }),

    // POST /candidates/{id}/skip-round — this candidate's own round plan
    // only, never job-service's shared plan. Same "current round finishes,
    // next becomes due" shape as advance, just requires a reason and is
    // recorded as a skip rather than a completion.
    skipInterviewRound: build.mutation<SkipInterviewRoundResultView, SkipInterviewRoundArgs>({
      query: ({ candidateId, reason, feedback, overridePendingInterviewerFeedback }) => ({
        url: `/candidates/${candidateId}/skip-round`,
        method: 'POST',
        body: {
          reason,
          ...(feedback ? { feedback } : {}),
          ...(overridePendingInterviewerFeedback
            ? { override_pending_interviewer_feedback: true }
            : {}),
        },
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

    // GET /candidates/{id}/eligible-interviewers — every interviewer
    // eligible for this candidate's tenant, from org-service's live
    // directory. The PANEL round interviewer picker's option list; not
    // scoped to one round (the same directory backs every round for this
    // candidate).
    listEligibleInterviewers: build.query<InterviewerView[], string>({
      query: (candidateId) => `/candidates/${candidateId}/eligible-interviewers`,
      transformResponse: (response: { interviewers: InterviewerView[] }) => response.interviewers,
      providesTags: (_result, _error, candidateId) => [
        { type: 'EligibleInterviewers', id: candidateId },
      ],
    }),

    // PUT /candidates/{id}/interview-rounds/{round_id}/interviewers — set
    // (or, with an empty array, clear) one PANEL round's explicit
    // interviewer selection. `roundId` is this LOCAL round row's own `id`
    // (`CandidateInterviewRoundView.id`), never job-service's `round_id` —
    // same rule as the artifacts endpoint above. Only callable while the
    // round isn't yet finished or booked; the backend 409s otherwise.
    setPanelInterviewers: build.mutation<
      SetPanelInterviewersResultView,
      { candidateId: string; roundId: string; interviewerIds: string[] }
    >({
      query: ({ candidateId, roundId, interviewerIds }) => ({
        url: `/candidates/${candidateId}/interview-rounds/${roundId}/interviewers`,
        method: 'PUT',
        body: { interviewer_ids: interviewerIds },
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
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
  useBulkAdvanceCandidatesMutation,
  useSkipInterviewRoundMutation,
  useSendRoundInviteMutation,
  useListEligibleInterviewersQuery,
  useSetPanelInterviewersMutation,
} = extendedApi;
