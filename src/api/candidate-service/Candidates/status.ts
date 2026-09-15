import candidateApi from '../candidateApi';

// Status & Pipeline — API_CONTRACT.md's "Status & Pipeline" section. Almost
// ANY `master_candidate_status` code is accepted on a single change — there
// is no GENERAL transition-legality check server-side (a candidate can move
// from `selected` back to `applied`); fetch valid codes from
// `Master/master.ts`'s `useListCandidateStatusesQuery` rather than
// hardcoding them, per FRONTEND_INTEGRATION_DETAILS.md §4.6.
//
// Two narrow backend exceptions to that permissiveness (candidate-service,
// 2026-09-08 — verified against `change_candidate_status.py`):
//   * `withdrawn` is NOT settable here — 422
//     `WITHDRAWN_STATUS_NOT_MANUALLY_SETTABLE`. Withdrawal is now exclusively
//     the candidate's own self-service action (interview-service's no-login
//     link). A recruiter takes someone out of the pipeline with `rejected`.
//     The board/pickers must not offer `withdrawn` as a target.
//   * `advanced` / `selected` also MOVE the candidate's interview-round
//     progress in the same transaction (`_status_round_cascade.py`):
//     `advanced` completes the current round and makes the next one due;
//     `selected` closes every still-open round (an active resume stage goes
//     to `completed`, not `skipped`). Both mutations below invalidate
//     `CandidateInterviewRounds` so the detail view's Pipeline tab refetches.
//     Three guards on `advanced`/`selected` (API_CONTRACT.md "Status &
//     Pipeline"):
//       - 409 `CANDIDATE_ON_LAST_ROUND` — `advanced` with no next round; use
//         `selected` instead.
//       - 422 `ROUND_NOT_YET_SCORED` — `advanced` but the current round has
//         no score yet (it hasn't actually concluded).
//       - 409 `CANDIDATE_IN_FINAL_STATUS` — `advanced`/`selected` on a
//         candidate already selected/rejected/withdrawn.
//     On the SINGLE route these are real HTTP 409/422 (surfaced as-is from
//     the error body). On `bulk-status` they're per-candidate
//     `results[].failure_reason` — see below.
//
// `POST /candidates/bulk-status` is PARTIAL-APPLY (changed 2026-09-08, was
// all-or-nothing): each candidate is processed independently, the response
// is always 200 with a per-candidate `results` array. Only a bad
// `status_code` / `withdrawn` (real 422) or job-service being unreachable
// mid-batch (502) aborts the whole request.

export type ChangeCandidateStatusRequest = {
  statusCode: string;
  reason?: string;
};

export type ChangeCandidateStatusResultView = {
  candidate_id: string;
  status_id: string;
  status_code: string;
};

export type BulkChangeCandidateStatusRequest = {
  /** Max 100. PARTIAL-APPLY — a bad id / guard failure is that candidate's own `results` row, it doesn't fail the batch. */
  candidateIds: string[];
  statusCode: string;
  reason?: string;
};

/** `failure_reason` slug (only set when `outcome === "failed"`) → display
 * copy. Slugs per API_CONTRACT.md "Status & Pipeline" / `_status_round_cascade`.
 * An unknown slug falls back to a generic line at the call site. */
export const BULK_STATUS_FAILURE_LABELS: Record<string, string> = {
  candidate_not_found: 'Candidate not found',
  candidate_on_last_round: "On last round, use 'Selected' instead",
  round_not_yet_scored: 'Current round has no score yet; it must be scored before advancing',
  candidate_in_final_status: 'Already in a final status',
  job_opening_not_found: "This candidate's job opening no longer exists",
};

/** One candidate's outcome from `POST /candidates/bulk-status`. Matches
 * `candidate_dto.BulkChangeCandidateStatusItemResultView` field-for-field
 * (verified 2026-09-08). `outcome="unchanged"` = already at the target
 * status (a no-op, not a failure); `status_id` is set for
 * `updated`/`unchanged` only; `failure_reason` for `failed` only. */
export type BulkChangeCandidateStatusItemResultView = {
  candidate_id: string;
  outcome: 'updated' | 'unchanged' | 'failed';
  status_id: string | null;
  failure_reason: string | null;
};

export type BulkChangeCandidateStatusResultView = {
  results: BulkChangeCandidateStatusItemResultView[];
};

/** One row of the append-only funnel transition log. Matches
 * `candidate_dto.CandidateStatusHistoryView` field-for-field (verified
 * 2026-09-02) — joined server-side with `master_candidate_status`, so
 * `status_label` is always present, never null (unlike `reason`/`changed_by`).
 */
export type CandidateStatusHistoryItem = {
  id: string;
  candidate_id: string;
  status_code: string;
  status_label: string;
  reason: string | null;
  changed_at: string;
  changed_by: string | null;
};

/** Unlike `PaginatedCandidates`, this list response currently omits `total`
 * (FRONTEND_INTEGRATION_DETAILS.md §3) — don't assume it's there.
 */
export type PaginatedCandidateStatusHistory = {
  items: CandidateStatusHistoryItem[];
  limit: number;
  offset: number;
};

const extendedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    changeCandidateStatus: build.mutation<
      ChangeCandidateStatusResultView,
      { candidateId: string; body: ChangeCandidateStatusRequest }
    >({
      query: ({ candidateId, body }) => ({
        url: `/candidates/${candidateId}/status`,
        method: 'POST',
        body: { status_code: body.statusCode, reason: body.reason },
      }),
      // Single route: `advanced`/`selected` guards come back as real HTTP
      // 409/422 — callers surface `getCandidateErrorMessage(e)` verbatim.
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        { type: 'CandidateStatusHistory', id: candidateId },
        // `advanced`/`selected` cascade into this candidate's round data —
        // see the module comment. Harmless refetch for every other code.
        { type: 'CandidateInterviewRounds', id: candidateId },
        'CandidateList',
      ],
    }),

    bulkChangeCandidateStatus: build.mutation<
      BulkChangeCandidateStatusResultView,
      BulkChangeCandidateStatusRequest
    >({
      query: ({ candidateIds, statusCode, reason }) => ({
        url: '/candidates/bulk-status',
        method: 'POST',
        body: { candidate_ids: candidateIds, status_code: statusCode, reason },
      }),
      // Per-id, not just 'CandidateList': a bulk `selected` drag closes every
      // open round on each candidate, so their detail-view Pipeline tab and
      // status history both have to refetch.
      invalidatesTags: (_result, _error, { candidateIds }) => [
        ...candidateIds.flatMap((id) => [
          { type: 'Candidate' as const, id },
          { type: 'CandidateStatusHistory' as const, id },
          { type: 'CandidateInterviewRounds' as const, id },
        ]),
        'CandidateList' as const,
      ],
    }),

    getCandidateStatusHistory: build.query<
      PaginatedCandidateStatusHistory,
      { candidateId: string; limit?: number; offset?: number }
    >({
      query: ({ candidateId, limit, offset }) => ({
        url: `/candidates/${candidateId}/status-history`,
        params: { limit, offset },
      }),
      providesTags: (_result, _error, { candidateId }) => [
        { type: 'CandidateStatusHistory', id: candidateId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useChangeCandidateStatusMutation,
  useBulkChangeCandidateStatusMutation,
  useGetCandidateStatusHistoryQuery,
} = extendedApi;
